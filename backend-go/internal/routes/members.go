package routes

import (
	"encoding/json"
	"net/http"

	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
	"github.com/go-chi/chi/v5"
)

type MemberHandler struct {
	members *services.MemberService
}

func NewMemberHandler(s *services.MemberService) *MemberHandler {
	return &MemberHandler{members: s}
}

func (h *MemberHandler) Create(w http.ResponseWriter, r *http.Request) {
	
	var input services.MemberInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	member, err := h.members.Create(r.Context(), input)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}

func (h *MemberHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	memberID := chi.URLParam(r, "memberID")

	var input services.UpdateMemberInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		handleError(w, badRequest(err))
		return
	}

	member, err := h.members.Update(r.Context(), memberID, userID, input)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}