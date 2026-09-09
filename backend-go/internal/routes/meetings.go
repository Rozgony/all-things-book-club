package routes

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/db"
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
	var input struct {
		Status           		*string    `json:"status,omitempty"`
		ScheduledAt      		*string    `json:"scheduledAt,omitempty"` // ISO 8601 string
		Duration         		*int       `json:"duration,omitempty"`
		RecurringGroupId 		*string    `json:"recurringGroupId,omitempty"`
		EncryptedBlob    		[]byte     `json:"encryptedBlob,omitempty"`
		Nonce            		[]byte     `json:"nonce,omitempty"`
		LocationEncryptedBlob   []byte     `json:"locationEncryptedBlob,omitempty"`
		LocationNonce           []byte     `json:"locationNonce,omitempty"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	meetingID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	// Verify user is a member of the chapter that owns this meeting
	ok, err := db.IsMemberOfMeeting(r.Context(), h.meetings.GetDB(), meetingID, userID)
	if err != nil {
		handleError(w, err)
		return
	}
	if !ok {
		handleError(w, db.ErrNotMember)
		return
	}

	// Apply updates based on what was provided
	if input.Status != nil {
		if err := h.meetings.UpdateStatus(r.Context(), meetingID, *input.Status); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.ScheduledAt != nil {
		parsed, err := time.Parse(time.RFC3339, *input.ScheduledAt)
		if err != nil {
			handleError(w, badRequest(err))
			return
		}
		if err := h.meetings.UpdateScheduledAt(r.Context(), meetingID, parsed); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.Duration != nil {
		if err := h.meetings.UpdateDuration(r.Context(), meetingID, *input.Duration); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.RecurringGroupId != nil {
		if err := h.meetings.UpdateRecurringGroupId(r.Context(), meetingID, input.RecurringGroupId); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.EncryptedBlob != nil {
		if err := h.meetings.UpdateEncryptedData(r.Context(), meetingID, input.EncryptedBlob, input.Nonce); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.LocationEncryptedBlob != nil {
		if err := h.meetings.UpdateEncryptedLocationData(r.Context(), meetingID, input.LocationEncryptedBlob, input.LocationNonce); err != nil {
			handleError(w, err)
			return
		}
	}

	// Return updated meeting
	meeting, err := h.meetings.GetByID(r.Context(), meetingID, userID)
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