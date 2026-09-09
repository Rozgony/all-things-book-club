package routes

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/db"
	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MemberHandler struct {
	members *services.MemberService
	pool    *pgxpool.Pool
}

func NewMemberHandler(s *services.MemberService, pool *pgxpool.Pool) *MemberHandler {
	return &MemberHandler{members: s, pool: pool}
}

func (h *MemberHandler) Create(w http.ResponseWriter, r *http.Request) {

	var input services.MemberInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	// Only chapter admins can add members directly with a pre-wrapped key —
	// this is the "existing user" invite path (see documentation/Invite-Plan.md).
	requesterID := middleware.UserIDFromContext(r.Context())
	isAdmin, err := db.IsAdmin(r.Context(), h.pool, input.ChapterId, requesterID)
	if err != nil {
		handleError(w, err)
		return
	}
	if !isAdmin {
		handleError(w, db.ErrNotMember)
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
	var input struct {
		EncryptedBlob []byte `json:"encryptedBlob"`
		Nonce         []byte `json:"nonce"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	memberID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	member, err := h.members.UpdateEncryptedBlob(r.Context(), memberID, input.EncryptedBlob, input.Nonce, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}
