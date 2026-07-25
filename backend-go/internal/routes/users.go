package routes

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
)

type UserHandler struct {
	users *services.UserService
}

func NewUserHandler(s *services.UserService) *UserHandler {
	return &UserHandler{users: s}
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input services.UpdateUserInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	userIdParam := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	user, err := h.users.Update(r.Context(), input, userIdParam, userID)
	if errors.Is(err, services.ErrNotMember) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userIdParam := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	err := h.users.Delete(r.Context(), userIdParam, userID)
	if errors.Is(err, services.ErrNotMember) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
