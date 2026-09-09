package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/all-things-book-club/internal/config"
	"github.com/all-things-book-club/internal/db"
	"github.com/all-things-book-club/internal/jobs"
	"github.com/all-things-book-club/internal/mailer"
	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/routes"
	"github.com/all-things-book-club/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func main() {
	// Load environment variables from .env
	cfg := config.Load()

	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	log.Printf("Connected to DB, pool max conns: %d", pool.Config().MaxConns)

	r := chi.NewRouter()

	allowedOrigins := []string{"http://localhost:5173"}
	if cfg.FrontendURL != "" {
		allowedOrigins = append(allowedOrigins, cfg.FrontendURL)
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	chapterService := services.NewChapterService(pool)
	memberService := services.NewMemberService(pool)
	meetingService := services.NewMeetingService(pool)
	topicService := services.NewTopicService(pool)
	themeService := services.NewThemeService(pool)
	userService := services.NewUserService(pool)
	inviteService := services.NewInviteService(pool)
	mailerService := mailer.New(cfg)
	recurringRuleService := services.NewRecurringRuleService(pool)

	jobs.StartRecurringMeetingGenerator(ctx, recurringRuleService)

	// Initialize handlers from services
	chapterHandler := routes.NewChapterHandler(chapterService)
	memberHandler := routes.NewMemberHandler(memberService, pool)
	meetingHandler := routes.NewMeetingHandler(meetingService)
	topicHandler := routes.NewTopicHandler(topicService)
	themeHandler := routes.NewThemeHandler(themeService)
	userHandler := routes.NewUserHandler(userService)
	inviteHandler := routes.NewInviteHandler(inviteService, mailerService, pool, cfg.FrontendURL)

	go runExpiredInviteCleanup(ctx, inviteService)
	recurringRuleHandler := routes.NewRecurringRuleHandler(recurringRuleService)

	// Public routes (no auth required)
	r.Group(func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintln(w, `{"status":"ok"}`)
		})
	})

	requireAuth, err := middleware.NewRequireAuth(cfg.SupabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize auth middleware: %v", err)
	}

	// Protected routes (auth required)
	r.Group(func(r chi.Router) {
		r.Use(requireAuth)

		// Chapters
		r.Get("/api/chapters", chapterHandler.List)
		r.Post("/api/chapters", chapterHandler.Create)
		r.Get("/api/chapters/{id}", chapterHandler.GetByID)
		r.Patch("/api/chapters/{id}", chapterHandler.Update)
		r.Delete("/api/chapters/{id}", chapterHandler.Delete)

		// Members
		r.Post("/api/members", memberHandler.Create)
		r.Patch("/api/members/{id}", memberHandler.Update)

		// Meetings
		r.Post("/api/meetings", meetingHandler.Create)
		r.Get("/api/meetings/chapter/{id}", meetingHandler.GetByChapterID)
		r.Get("/api/meetings/{id}", meetingHandler.GetByID)
		r.Patch("/api/meetings/{id}", meetingHandler.Update)
		r.Delete("/api/meetings/{id}", meetingHandler.Delete)

		// Recurring rules
		r.Post("/api/recurring-rules", recurringRuleHandler.Create)
		r.Get("/api/recurring-rules/{id}", recurringRuleHandler.GetByID)
		r.Patch("/api/recurring-rules/{id}", recurringRuleHandler.Update)

		// Topics
		r.Post("/api/topics", topicHandler.Create)
		r.Patch("/api/topics/{id}", topicHandler.Update)
		r.Delete("/api/topics/{id}", topicHandler.Delete)

		// Themes
		r.Get("/api/chapters/{id}/themes", themeHandler.ListByChapter)
		r.Post("/api/topics/{id}/themes", themeHandler.LinkToTopic)
		r.Delete("/api/topics/{id}/themes/{themeId}", themeHandler.RemoveFromTopic)

		// User
		r.Get("/api/users/me/salt", userHandler.GetSalt)
		r.Get("/api/users/me", userHandler.GetByID)
		r.Patch("/api/users/me", userHandler.Update)
		r.Delete("/api/users/me", userHandler.Update)

		// Invites (creation + acceptance require auth; GET by token does not — registered below)
		r.Post("/api/chapters/{id}/invites", inviteHandler.Create)
		r.Post("/api/chapters/{id}/invites/email", inviteHandler.CreateAndEmail)
		r.Post("/api/invites/{token}/accept", inviteHandler.Accept)
	})

	// Public: invite lookup has no account yet to authenticate with.
	r.Group(func(r chi.Router) {
		r.Get("/api/invites/{token}", inviteHandler.GetByToken)
	})

	addr := ":" + cfg.Port
	log.Printf("Server starting on %s", addr)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// runExpiredInviteCleanup deletes expired invites (and their wrapped chapter
// keys) on an hourly tick, so they don't linger once past expires_at.
func runExpiredInviteCleanup(ctx context.Context, inviteService *services.InviteService) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		if n, err := inviteService.DeleteExpired(ctx); err != nil {
			log.Printf("invite cleanup failed: %v", err)
		} else if n > 0 {
			log.Printf("invite cleanup: deleted %d expired invite(s)", n)
		}
		<-ticker.C
	}
}
