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
