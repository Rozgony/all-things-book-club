package db

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5/pgxpool"
)

// IsMember checks whether a user belongs to a chapter.
// Exported (capitalized) so other packages can import and use it.
func IsMember(ctx context.Context, pool *pgxpool.Pool, chapterID string, userID string) (bool, error) {
    var exists bool
    err := pool.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM chapter_members
            WHERE chapter_id = $1 AND user_id = $2
        )
    `, chapterID, userID).Scan(&exists)
    if err != nil {
        return false, fmt.Errorf("IsMember: %w", err)
    }
    return exists, nil
}

// IsAdmin checks whether a user is an admin in a chapter
func IsAdmin(ctx context.Context, pool *pgxpool.Pool, chapterID string, userID string) (bool, error) {
    var isAdmin bool
    err := pool.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM chapter_members
            WHERE chapter_id = $1 AND user_id = $2 AND role = 'ADMIN'
        )
    `, chapterID, userID).Scan(&isAdmin)
    if err != nil {
        return false, fmt.Errorf("IsAdmin: %w", err)
    }
    return isAdmin, nil
}