package routes

import (
	"encoding/json"
	"net/http"

	"github.com/all-things-book-club/internal/services"
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