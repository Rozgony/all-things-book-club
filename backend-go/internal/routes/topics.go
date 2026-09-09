package routes

import (
	"encoding/json"
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
	var input services.TopicInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	topic, err := h.topics.Create(r.Context(), input, userID)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(topic)
}

func (h *TopicHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Status        *string `json:"status,omitempty"`
		EncryptedBlob []byte  `json:"encryptedBlob,omitempty"`
		Nonce         []byte  `json:"nonce,omitempty"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	topicID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	if input.Status != nil {
		if err := h.topics.UpdateStatus(r.Context(), topicID, *input.Status, userID); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.EncryptedBlob != nil {
		if err := h.topics.UpdateEncrypted(r.Context(), topicID, input.EncryptedBlob, input.Nonce, userID); err != nil {
			handleError(w, err)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNoContent)
}

func (h *TopicHandler) Delete(w http.ResponseWriter, r *http.Request) {
	topicID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	err := h.topics.Delete(r.Context(), topicID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
