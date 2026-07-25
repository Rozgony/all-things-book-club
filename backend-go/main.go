package main

import (
	"fmt"
	"log"
	"net/http"
	"context"

	"github.com/all-things-book-club/internal/config"
	"github.com/all-things-book-club/internal/db"
	"github.com/all-things-book-club/internal/routes"
	"github.com/all-things-book-club/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/all-things-book-club/internal/middleware"
)

func main() {
	// Load environment variables from .env
	cfg := config.Load()

	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil { log.Fatal(err) }
  	defer pool.Close()
	log.Printf("Connected to DB, pool max conns: %d", pool.Config().MaxConns)

	r := chi.NewRouter()

	// Initialize services from the database pool
	chapterService := services.NewChapterService(pool)
	memberService := services.NewMemberService(pool)
	meetingService := services.NewMeetingService(pool)

	// Initialize handlers from services
	chapterHandler := routes.NewChapterHandler(chapterService)
	memberHandler := routes.NewMemberHandler(memberService)
	meetingHandler := routes.NewMeetingHandler(meetingService)

	// Public routes (no auth required)
	r.Group(func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintln(w, `{"status":"ok"}`)
		})
	})

	// Protected routes (auth required)
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(cfg.JWTSecret))
		r.Get("/api/me", func(w http.ResponseWriter, req *http.Request) {
			userID := middleware.UserIDFromContext(req.Context())
			fmt.Fprintf(w, `{"userID":"%s"}`, userID)
		})

		// Chapters
		r.Get("/api/chapters", chapterHandler.List)
		r.Post("/api/chapters", chapterHandler.Create)
		r.Get("/api/chapters/{id}", chapterHandler.GetByID)
		r.Patch("/api/chapters/{id}", chapterHandler.Update)
		r.Delete("/api/chapters/{id}", chapterHandler.Delete)

		// Members
		r.Post("/api/members", memberHandler.Create)
		
		// Meetings
		r.Post("/api/meetings", meetingHandler.Create)
		r.Get("/api/meetings/{id}", meetingHandler.GetByID)
		r.Get("/api/meetings/chapter/{id}", meetingHandler.GetByChapterID)
		r.Patch("/api/meetings/{id}", meetingHandler.Update)
		r.Delete("/api/meetings/{id}", meetingHandler.Delete)
	})

	addr := ":" + cfg.Port
	log.Printf("Server starting on %s", addr)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
