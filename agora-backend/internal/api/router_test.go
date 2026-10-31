package api_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/victoragahi/agora/agora-backend/internal/api"
	"github.com/victoragahi/agora/agora-backend/internal/config"
	"github.com/victoragahi/agora/agora-backend/internal/db"
)

func TestRequireMCPAuth_FailClose(t *testing.T) {
	// Dummy handler behind auth
	okHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Case 1: Server misconfigured (empty expected key) -> MUST FAIL (Fail-Close)
	authEmpty := api.SetupRouter(api.RouterDependencies{
		API:       &api.API{},
		Hub:       api.NewSSEHub(),
		MCPHandle: okHandler,
		Cfg:       &config.Config{MCPAPIKey: ""},
	})

	req := httptest.NewRequest(http.MethodGet, "/sse", nil)
	rec := httptest.NewRecorder()
	authEmpty.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for empty expected key, got %d", rec.Code)
	}

	// Case 2: Valid key configured, but client sends wrong token
	authConfigured := api.SetupRouter(api.RouterDependencies{
		API:       &api.API{},
		Hub:       api.NewSSEHub(),
		MCPHandle: okHandler,
		Cfg:       &config.Config{MCPAPIKey: "secret-test-token-123"},
	})

	reqWrong := httptest.NewRequest(http.MethodGet, "/sse", nil)
	reqWrong.Header.Set("Authorization", "Bearer invalid-token")
	recWrong := httptest.NewRecorder()
	authConfigured.ServeHTTP(recWrong, reqWrong)

	if recWrong.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for invalid token, got %d", recWrong.Code)
	}

	// Case 3: Valid key sent in Bearer header -> OK (forwarded to handler)
	reqValid := httptest.NewRequest(http.MethodGet, "/sse", nil)
	reqValid.Header.Set("Authorization", "Bearer secret-test-token-123")
	recValid := httptest.NewRecorder()
	authConfigured.ServeHTTP(recValid, reqValid)

	if recValid.Code != http.StatusOK {
		t.Errorf("expected 200 OK for valid token, got %d", recValid.Code)
	}
}

func TestHandleAddItem_MaxBytesReader(t *testing.T) {
	tmpFile := "test_max_bytes.db"
	defer os.Remove(tmpFile)

	database, err := db.Open(tmpFile)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	defer database.Close()

	hub := api.NewSSEHub()
	apiHandler := api.NewAPI(database, hub)

	// Send an oversized body (> 64KB)
	hugePayload := `{"name":"` + strings.Repeat("A", 70000) + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/items", bytes.NewBufferString(hugePayload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	apiHandler.HandleAddItem(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for oversized payload, got %d", rec.Code)
	}
}

