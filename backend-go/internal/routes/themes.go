package routes

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
)

type ThemeHandler struct {
	themes *services.ThemeService
}

func NewThemeHandler(s *services.ThemeService) *ThemeHandler {
	return &ThemeHandler{themes: s}
}

// ListByChapter handles GET /api/chapters/{id}/themes
// Returns all themes for a chapter, used to power the autocomplete UI.
func (h *ThemeHandler) ListByChapter(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	themes, err := h.themes.ListByChapter(r.Context(), chapterID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(themes)
}

// LinkToTopic handles POST /api/topics/{id}/themes
// Links an existing theme (by ID) to a topic, or creates a new theme and links it.
func (h *ThemeHandler) LinkToTopic(w http.ResponseWriter, r *http.Request) {
	var input services.LinkThemeInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	topicID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	themeID, err := h.themes.LinkToTopic(r.Context(), input, topicID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"themeId": themeID})
}

// RemoveFromTopic handles DELETE /api/topics/{id}/themes/{themeId}
// Unlinks a theme from a topic without deleting the theme itself.
func (h *ThemeHandler) RemoveFromTopic(w http.ResponseWriter, r *http.Request) {
	topicID := chi.URLParam(r, "id")
	themeID := chi.URLParam(r, "themeId")
	userID := middleware.UserIDFromContext(r.Context())

	err := h.themes.RemoveFromTopic(r.Context(), topicID, themeID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
