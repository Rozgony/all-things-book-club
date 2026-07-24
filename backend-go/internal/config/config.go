package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all environment-driven configuration for the app.
// Using a struct (instead of reading os.Getenv everywhere) means:
// - Config is validated once at startup, not scattered across the codebase
// - Easy to pass around and test
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	Env         string
}

// Load reads the .env file (if present) then pulls values from the environment.
// Call this once in main() and pass cfg down to everything that needs it.
func Load() *Config {
	// godotenv.Load() reads .env into the process environment.
	// If no .env file exists (e.g. in production), it logs a warning and continues —
	// production values come from real environment variables instead.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: requireEnv("DATABASE_URL"),
		JWTSecret:   requireEnv("JWT_SECRET"),
		Env:         getEnv("ENV", "development"),
	}

	return cfg
}

// getEnv returns the env var value or a fallback default.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// requireEnv exits the program if a required env var is missing.
// Better to crash at startup than to fail mysteriously at runtime.
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("Required environment variable %q is not set", key)
	}
	return val
}
