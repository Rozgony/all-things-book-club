package routes

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
)

type TopicHandler struct {
	topics *services.TopicService
}

func NewTopicHandler(s *services.TopicService) *TopicHandler {
	return &TopicHandler{topics: s}
}

func (h *TopicHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input services.CreateTopicInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	topic, err := h.topics.Create(r.Context(), input, userID)
	if errors.Is(err, services.ErrNotMember) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(topic)
}

func (h *TopicHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input services.CreateTopicInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	topicID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	topic, err := h.topics.Update(r.Context(), input, topicID, userID)
	if errors.Is(err, services.ErrNotMember) {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(topic)
}

func (h *TopicHandler) Delete(w http.ResponseWriter, r *http.Request) {
	topicID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	err := h.topics.Delete(r.Context(), topicID, userID)
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
