package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/victoragahi/agora/agora-backend/internal/api"
	"github.com/victoragahi/agora/agora-backend/internal/db"
	"github.com/victoragahi/agora/agora-backend/internal/models"
)

type AddItemArgs struct {
	Items []models.ItemInput `json:"items" jsonschema:"required,description=List of shopping items to add to the list"`
}

type GetShoppingListArgs struct {
	Status string `json:"status,omitempty" jsonschema:"description=Filter by status: 'pending' (default, items to buy), 'completed' (already bought), or 'all'"`
}

type MarkBoughtArgs struct {
	IDs []int64 `json:"ids" jsonschema:"required,description=List of item IDs to mark as bought/completed"`
}

type ClearCompletedArgs struct{}

type GetOptimizedRouteArgs struct {
	IncludeCompleted bool `json:"include_completed,omitempty" jsonschema:"description=Whether to include already bought/completed items in the route steps (default false, pending items only)"`
}

type GetAisleCorrectionsLogArgs struct {
	Limit int `json:"limit,omitempty" jsonschema:"description=Maximum number of recent aisle corrections to retrieve (default 30, max 100)"`
}

type LearnAislePlacementArgs struct {
	ItemName      string `json:"item_name" jsonschema:"required,description=The item or product keyword to learn (e.g., 'crème fraîche liquide', 'pain de mie', 'haricots verts')"`
	AisleID       string `json:"aisle_id" jsonschema:"required,description=The target supermarket aisle ID (e.g., 'creme-liquide', 'pain-sec', 'surgeles', 'fruits-legumes', 'epicerie-conserves')"`
	PreviousAisle string `json:"previous_aisle,omitempty" jsonschema:"description=The previous or default aisle ID before correction"`
	Reason        string `json:"reason,omitempty" jsonschema:"description=Explanation of why this aisle is the correct one (e.g., 'Noticed during post-shopping review that liquid cream is near bechamel at top of central aisle')"`
}

type Server struct {
	database  *db.DB
	hub       *api.SSEHub
	mcpServer *server.MCPServer
	sseServer *server.SSEServer
}

func NewServer(database *db.DB, hub *api.SSEHub) *Server {
	s := server.NewMCPServer(
		"Agora Shopping List",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithTitle("Agora Shopping List MCP Server"),
	)

	srv := &Server{
		database:  database,
		hub:       hub,
		mcpServer: s,
	}

	srv.registerTools()

	sseServer := server.NewSSEServer(
		s,
		server.WithSSEEndpoint("/sse"),
		server.WithMessageEndpoint("/messages"),
		server.WithSSEDisableLocalhostProtection(true),
		server.WithSSECORS(
			server.WithCORSAllowedOrigins("*"),
			server.WithCORSAllowedMethods("GET", "POST", "OPTIONS"),
			server.WithCORSAllowedHeaders("Content-Type", "Authorization", "X-Session-ID", "Mcp-Session-Id"),
		),
	)
	srv.sseServer = sseServer

	return srv
}

func (s *Server) SSEServer() *server.SSEServer {
	return s.sseServer
}

func (s *Server) registerTools() {
	// Tool 1: add_shopping_items
	s.mcpServer.AddTool(
		mcp.NewTool("add_shopping_items",
			mcp.WithDescription("Add one or more items to the Agora shared shopping list. Can specify quantity, category, and notes."),
			mcp.WithInputSchema[AddItemArgs](),
		),
		s.handleAddShoppingItems,
	)

	// Tool 2: get_shopping_list
	s.mcpServer.AddTool(
		mcp.NewTool("get_shopping_list",
			mcp.WithDescription("Get the current shared shopping list. Can filter by pending (default), completed, or all."),
			mcp.WithInputSchema[GetShoppingListArgs](),
		),
		s.handleGetShoppingList,
	)

	// Tool 3: mark_as_bought
	s.mcpServer.AddTool(
		mcp.NewTool("mark_as_bought",
			mcp.WithDescription("Mark items as bought/completed on the shopping list given their IDs."),
			mcp.WithInputSchema[MarkBoughtArgs](),
		),
		s.handleMarkBought,
	)

	// Tool 4: clear_completed
	s.mcpServer.AddTool(
		mcp.NewTool("clear_completed",
			mcp.WithDescription("Remove all completed (bought) items from the shopping list."),
			mcp.WithInputSchema[ClearCompletedArgs](),
		),
		s.handleClearCompleted,
	)

	// Tool 5: get_optimized_shopping_route
	s.mcpServer.AddTool(
		mcp.NewTool("get_optimized_shopping_route",
			mcp.WithDescription("Get the step-by-step optimal shopping route through the physical supermarket from entrance to checkouts. Automatically groups items by aisle in order (Fruits & Légumes -> Boulangerie -> Épicerie -> Frais -> Surgelés en dernier -> Caisses), minimizing walking distance and preserving the cold chain."),
			mcp.WithInputSchema[GetOptimizedRouteArgs](),
		),
		s.handleGetOptimizedRoute,
	)

	// Tool 6: get_aisle_corrections_log
	s.mcpServer.AddTool(
		mcp.NewTool("get_aisle_corrections_log",
			mcp.WithDescription("Retrieve recent store aisle corrections made by users or Hermes. Use this after a shopping trip to see which items were relocated or had unexpected locations, allowing Hermes to learn and avoid repeating aisle mistakes."),
			mcp.WithInputSchema[GetAisleCorrectionsLogArgs](),
		),
		s.handleGetAisleCorrectionsLog,
	)

	// Tool 7: learn_aisle_placement
	s.mcpServer.AddTool(
		mcp.NewTool("learn_aisle_placement",
			mcp.WithDescription("Teach and persist a new item-to-aisle placement rule in Agora's memory. Hermes uses this to self-improve after shopping trips so that future shopping lists place the item in the right aisle automatically."),
			mcp.WithInputSchema[LearnAislePlacementArgs](),
		),
		s.handleLearnAislePlacement,
	)
}

func (s *Server) handleAddShoppingItems(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args AddItemArgs
	if err := req.BindArguments(&args); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
	}

	if len(args.Items) == 0 {
		return mcp.NewToolResultError("no items provided"), nil
	}

	inserted, err := s.database.AddItemsBatch(args.Items)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to add items: %v", err)), nil
	}

	// Broadcast live update to all connected frontend clients
	s.hub.Broadcast("items_added", inserted)

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Successfully added %d item(s) to Agora shopping list:\n", len(inserted)))
	for _, it := range inserted {
		qty := ""
		if it.Quantity != "" {
			qty = fmt.Sprintf(" (%s)", it.Quantity)
		}
		sb.WriteString(fmt.Sprintf("- [ID: %d] %s%s [Rayon: %s]\n", it.ID, it.Name, qty, it.Category))
	}

	return mcp.NewToolResultText(sb.String()), nil
}

func (s *Server) handleGetShoppingList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args GetShoppingListArgs
	if err := req.BindArguments(&args); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
	}

	includeCompleted := args.Status == "all" || args.Status == "completed"
	items, err := s.database.ListItems(includeCompleted)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to fetch items: %v", err)), nil
	}

	// Filter if specifically requested only completed
	if args.Status == "completed" {
		var comp []models.Item
		for _, it := range items {
			if it.Completed {
				comp = append(comp, it)
			}
		}
		items = comp
	}

	if len(items) == 0 {
		return mcp.NewToolResultText("The shopping list is currently empty."), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Agora Shopping List (%d items):\n", len(items)))
	for _, it := range items {
		status := "[ ]"
		if it.Completed {
			status = "[x]"
		}
		qty := ""
		if it.Quantity != "" {
			qty = fmt.Sprintf(" (%s)", it.Quantity)
		}
		notes := ""
		if it.Notes != "" {
			notes = fmt.Sprintf(" - Note: %s", it.Notes)
		}
		sb.WriteString(fmt.Sprintf("%s ID:%d | %s%s [%s]%s\n", status, it.ID, it.Name, qty, it.Category, notes))
	}

	jsonBytes, _ := json.MarshalIndent(items, "", "  ")
	sb.WriteString("\nJSON:\n")
	sb.WriteString(string(jsonBytes))

	return mcp.NewToolResultText(sb.String()), nil
}

func (s *Server) handleMarkBought(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args MarkBoughtArgs
	if err := req.BindArguments(&args); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
	}

	if len(args.IDs) == 0 {
		return mcp.NewToolResultError("no IDs provided"), nil
	}

	var updated []models.Item
	for _, id := range args.IDs {
		t := true
		item, err := s.database.UpdateItem(id, models.UpdateItemInput{Completed: &t})
		if err == nil && item != nil {
			updated = append(updated, *item)
		}
	}

	s.hub.Broadcast("items_updated", updated)

	return mcp.NewToolResultText(fmt.Sprintf("Marked %d item(s) as bought.", len(updated))), nil
}

func (s *Server) handleClearCompleted(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	affected, err := s.database.ClearCompleted()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to clear completed items: %v", err)), nil
	}

	s.hub.Broadcast("items_cleared", map[string]int64{"cleared_count": affected})

	return mcp.NewToolResultText(fmt.Sprintf("Cleared %d completed item(s).", affected)), nil
}

func (s *Server) handleGetOptimizedRoute(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args GetOptimizedRouteArgs
	if err := req.BindArguments(&args); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
	}

	items, err := s.database.ListItems(args.IncludeCompleted)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to fetch items: %v", err)), nil
	}

	if !args.IncludeCompleted {
		var pending []models.Item
		for _, it := range items {
			if !it.Completed {
				pending = append(pending, it)
			}
		}
		items = pending
	}

	route := BuildOptimizedRoute(items)
	return mcp.NewToolResultText(route.ToFormattedText()), nil
}

func (s *Server) handleGetAisleCorrectionsLog(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args GetAisleCorrectionsLogArgs
	if err := req.BindArguments(&args); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
	}

	limit := args.Limit
	if limit <= 0 {
		limit = 30
	}

	corrections, err := s.database.GetAisleCorrections(limit)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to get aisle corrections: %v", err)), nil
	}

	if len(corrections) == 0 {
		return mcp.NewToolResultText("No aisle corrections recorded yet. All items are currently placed using default heuristics."), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Agora Store Aisle Corrections History (%d entries):\n\n", len(corrections)))
	for _, c := range corrections {
		reason := ""
		if c.Reason != "" {
			reason = fmt.Sprintf(" (Reason: %s)", c.Reason)
		}
		sb.WriteString(fmt.Sprintf("- [%s] '%s': '%s' -> '%s' (by %s)%s\n",
			c.CreatedAt.Format("2006-01-02 15:04"),
			c.ItemName,
			c.PreviousAisle,
			c.CorrectedAisle,
			c.CorrectedBy,
			reason,
		))
	}

	jsonBytes, _ := json.MarshalIndent(corrections, "", "  ")
	sb.WriteString("\nJSON:\n")
	sb.WriteString(string(jsonBytes))

	return mcp.NewToolResultText(sb.String()), nil
}

func (s *Server) handleLearnAislePlacement(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var args LearnAislePlacementArgs
	if err := req.BindArguments(&args); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid arguments: %v", err)), nil
	}

	itemName := strings.TrimSpace(args.ItemName)
	aisleID := strings.TrimSpace(args.AisleID)
	if itemName == "" || aisleID == "" {
		return mcp.NewToolResultError("item_name and aisle_id cannot be empty"), nil
	}

	err := s.database.RecordAisleCorrection(itemName, args.PreviousAisle, aisleID, "hermes", args.Reason)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to record learning: %v", err)), nil
	}

	// Broadcast learning to frontend so live maps and caches update immediately
	s.hub.Broadcast("aisle_learned", map[string]any{
		"item_name":       itemName,
		"previous_aisle":  args.PreviousAisle,
		"corrected_aisle": aisleID,
		"source":          "hermes",
		"reason":          args.Reason,
	})

	return mcp.NewToolResultText(fmt.Sprintf("Successfully learned placement: '%s' is now permanently mapped to aisle '%s'. Agora store route generator will place it here for all future shopping lists.", itemName, aisleID)), nil
}
