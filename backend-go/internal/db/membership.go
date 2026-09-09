package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotMember = errors.New("user is not a member of this chapter")

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

// IsMemberOfMeeting checks whether a user is a member of the chapter that owns a meeting
func IsMemberOfMeeting(ctx context.Context, pool *pgxpool.Pool, meetingID string, userID string) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM chapter_members cm
            JOIN meetings m ON m.chapter_id = cm.chapter_id
            WHERE m.id = $1 AND cm.user_id = $2
        )
    `, meetingID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("IsMemberOfMeeting: %w", err)
	}
	return exists, nil
}

// IsMemberOfTopic checks whether a user is a member of the chapter that owns a topic
func IsMemberOfTopic(ctx context.Context, pool *pgxpool.Pool, topicID string, userID string) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM chapter_members cm
            JOIN topics t ON t.chapter_id = cm.chapter_id
            WHERE t.id = $1 AND cm.user_id = $2
        )
    `, topicID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("IsMemberOfTopic: %w", err)
	}
	return exists, nil
}

// IsMemberOfRecurringRule checks whether a user is a member of the chapter that owns a recurring rule
func IsMemberOfRecurringRule(ctx context.Context, pool *pgxpool.Pool, ruleID string, userID string) (bool, error) {
	var exists bool
	err := pool.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM chapter_members cm
            JOIN recurring_rules r ON r.chapter_id = cm.chapter_id
            WHERE r.id = $1 AND cm.user_id = $2
        )
    `, ruleID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("IsMemberOfRecurringRule: %w", err)
	}
	return exists, nil
}
