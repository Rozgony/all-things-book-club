package db

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool is a connection pool to PostgreSQL.
// A pool (not a single connection) is standard — it manages multiple concurrent
// connections automatically so handlers don't block each other.
type Pool = pgxpool.Pool

// Connect opens a connection pool using the DATABASE_URL from config.
// Call this once in main() and pass the pool down to anything that needs the DB.
//
// Pattern:
//
//	pool, err := db.Connect(ctx, cfg.DatabaseURL)
//	if err != nil { log.Fatal(err) }
//	defer pool.Close()
func Connect(ctx context.Context, databaseURL string) (*Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db.Connect: failed to parse database URL: %w", err)
	}

	// Supabase's connection pooler (transaction mode) can route each
	// transaction to a different backend, invalidating cached prepared
	// statements. Simple protocol avoids server-side prepared statements.
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("db.Connect: failed to create pool: %w", err)
	}

	// Ping verifies the connection is actually reachable.
	// Better to fail loudly at startup than silently at the first request.
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db.Connect: failed to ping database: %w", err)
	}

	log.Println("Database connection established")
	return pool, nil
}
