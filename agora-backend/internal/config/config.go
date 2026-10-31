package config

import (
	"os"
	"path/filepath"
)

type Config struct {
	Port        string
	DBPath      string
	MCPAPIKey   string
	CORSOrigin  string
	Environment string
}

func Load() *Config {
	port := getEnv("PORT", "8080")
	env := getEnv("ENVIRONMENT", "development")
	corsOrigin := getEnv("CORS_ORIGIN", "*")
	mcpKey := getEnv("MCP_API_KEY", "agora-secret-key-change-me")

	// Support DATA_DIR for PVC mounts in Kubernetes
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dataDir := os.Getenv("DATA_DIR")
		if dataDir != "" {
			dbPath = filepath.Join(dataDir, "agora.db")
		} else {
			dbPath = "agora.db"
		}
	}

	return &Config{
		Port:        port,
		DBPath:      dbPath,
		MCPAPIKey:   mcpKey,
		CORSOrigin:  corsOrigin,
		Environment: env,
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
