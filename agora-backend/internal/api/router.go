package api

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/victoragahi/agora/agora-backend/internal/config"
)

type RouterDependencies struct {
	API       *API
	Hub       *SSEHub
	MCPHandle http.Handler
	Cfg       *config.Config
}

func SetupRouter(deps RouterDependencies) http.Handler {
	mux := http.NewServeMux()

	// Health probes
	mux.HandleFunc("GET /healthz", deps.API.HandleHealth)
	mux.HandleFunc("GET /health", deps.API.HandleHealth)

	// REST API Endpoints
	mux.HandleFunc("GET /api/items", deps.API.HandleListItems)
	mux.HandleFunc("POST /api/items", deps.API.HandleAddItem)
	mux.HandleFunc("PATCH /api/items/{id}/toggle", deps.API.HandleToggleItem)
	mux.HandleFunc("PATCH /api/items/{id}", deps.API.HandleUpdateItem)
	mux.HandleFunc("DELETE /api/items/{id}", deps.API.HandleDeleteItem)
	mux.HandleFunc("POST /api/items/clear-completed", deps.API.HandleClearCompleted)

	// Frontend Live Updates via SSE
	mux.Handle("GET /api/stream", deps.Hub)

	// MCP SSE & Message Endpoints (Protected by MCP API Key)
	mcpAuthHandler := requireMCPAuth(deps.Cfg.MCPAPIKey, deps.MCPHandle)
	mux.Handle("/sse", mcpAuthHandler)
	mux.Handle("/messages", mcpAuthHandler)

	// Wrap in global middlewares: CORS + Logger
	return corsMiddleware(deps.Cfg.CORSOrigin, loggingMiddleware(mux))
}

func requireMCPAuth(expectedKey string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow OPTIONS preflight through
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if expectedKey == "" {
			next.ServeHTTP(w, r)
			return
		}

		// Check Authorization header: Bearer <key>
		authHeader := r.Header.Get("Authorization")
		token := ""
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// Fallback to URL query parameter (?token=...) for SSE clients that cannot set headers
		if token == "" {
			token = r.URL.Query().Get("token")
		}

		if token != expectedKey {
			http.Error(w, `{"error":"unauthorized: invalid or missing MCP API key"}`, http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := allowedOrigin
		if origin == "" {
			origin = "*"
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Session-ID, Mcp-Session-Id")
		w.Header().Set("Access-Control-Expose-Headers", "X-Session-ID, Mcp-Session-Id")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		// Do not log continuous SSE streams to avoid spamming logs
		if r.URL.Path != "/api/stream" && r.URL.Path != "/sse" {
			log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
		}
	})
}
