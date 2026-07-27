package routes

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
)

type MeetingHandler struct {
	meetings *services.MeetingService
}

func NewMeetingHandler(s *services.MeetingService) *MeetingHandler {
	return &MeetingHandler{meetings: s}
}

func (h *MeetingHandler) Create(w http.ResponseWriter, r *http.Request) {
	
	var input services.MeetingInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	meeting, err := h.meetings.Create(r.Context(), input, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(meeting)
}

func (h *MeetingHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	meeting, err := h.meetings.GetByID(r.Context(), meetingID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(meeting)
}

func (h *MeetingHandler) GetByChapterID(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	meetings, err := h.meetings.GetByChapterID(r.Context(), meetingID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(meetings)
}

func (h *MeetingHandler) Update(w http.ResponseWriter, r *http.Request) {
	
	var input services.MeetingInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	meetingID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	meeting, err := h.meetings.Update(r.Context(), input, meetingID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(meeting)
}

func (h *MeetingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	meetingID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	err := h.meetings.Delete(r.Context(), meetingID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}