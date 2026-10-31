package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/victoragahi/agora/agora-backend/internal/api"
	"github.com/victoragahi/agora/agora-backend/internal/config"
	"github.com/victoragahi/agora/agora-backend/internal/db"
	"github.com/victoragahi/agora/agora-backend/internal/mcp"
)

func main() {
	cfg := config.Load()
	log.Printf("Starting Agora Backend on :%s (env: %s)", cfg.Port, cfg.Environment)

	// Open SQLite database
	database, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("Fatal: failed to initialize database: %v", err)
	}
	defer database.Close()
	log.Printf("Connected to SQLite database at: %s", cfg.DBPath)

	// Initialize Realtime SSE Hub for frontend
	hub := api.NewSSEHub()

	// Initialize MCP Server (Streamable SSE)
	mcpServer := mcp.NewServer(database, hub)

	// Initialize REST API
	apiHandler := api.NewAPI(database, hub)

	// Setup HTTP Router
	router := api.SetupRouter(api.RouterDependencies{
		API:       apiHandler,
		Hub:       hub,
		MCPHandle: mcpServer.SSEServer(),
		Cfg:       cfg,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0, // 0 for SSE streaming connections
		IdleTimeout:  120 * time.Second,
	}

	// Server run context
	go func() {
		log.Printf("Agora listening on http://0.0.0.0:%s", cfg.Port)
		log.Printf("MCP SSE endpoint available at /sse (Bearer protected)")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown handling
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down Agora Backend gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced shutdown: %v", err)
	}

	log.Println("Agora Backend stopped cleanly.")
}
