package routes

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
)

type ChapterHandler struct {
	chapters *services.ChapterService
}

func NewChapterHandler(s *services.ChapterService) *ChapterHandler {
	return &ChapterHandler{chapters: s}
}

func (h *ChapterHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	chapters, err := h.chapters.ListForUser(r.Context(), userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chapters)
}

type CreateResponse struct {
	Chapter       *services.Chapter       `json:"chapter"`
	ChapterMember *services.ChapterMember `json:"member"`
}

func (h *ChapterHandler) Create(w http.ResponseWriter, r *http.Request) {
	
	var input services.CreateChapterInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	chapter, member, err := h.chapters.Create(r.Context(), input, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	createResponse := CreateResponse{Chapter: chapter, ChapterMember: member}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createResponse)
}

func (h *ChapterHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	chapter, err := h.chapters.GetByID(r.Context(), chapterID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chapter)
}

func (h *ChapterHandler) Update(w http.ResponseWriter, r *http.Request) {
	
	var input services.ChapterInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	chapterID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	chapter, err := h.chapters.Update(r.Context(), input, chapterID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chapter)
}

func (h *ChapterHandler) Delete(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	err := h.chapters.Delete(r.Context(), chapterID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}