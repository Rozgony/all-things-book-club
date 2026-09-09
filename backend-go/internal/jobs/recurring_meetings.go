package jobs

import (
	"context"
	"log"
	"time"

    "github.com/all-things-book-club/internal/services"
)

func StartRecurringMeetingGenerator(ctx context.Context, recurringRuleService *services.RecurringRuleService) {
    ticker := time.NewTicker(1 * time.Minute)
    go func() {
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                if err := recurringRuleService.GenerateUpcomingOccurrences(ctx); err != nil {
                    log.Printf("recurring meeting generation failed: %v", err)
                }
            case <-ctx.Done():
                return // graceful shutdown
            }
        }
    }()
}