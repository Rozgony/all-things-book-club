package routes

import (
	"encoding/json"
	"net/http"

	"github.com/all-things-book-club/internal/db"
	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserHandler struct {
	users *services.UserService
	pool  *pgxpool.Pool
}

func NewUserHandler(s *services.UserService, pool *pgxpool.Pool) *UserHandler {
	return &UserHandler{users: s, pool: pool}
}

func (h *UserHandler) GetSalt(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	salt, err := h.users.GetOrCreateSalt(r.Context(), userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"salt": salt})
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input services.UserInput

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		handleError(w, badRequest(err))
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	user, err := h.users.Update(r.Context(), input, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserIDFromContext(r.Context())

	err := h.users.Delete(r.Context(), userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetByEmail looks up an existing user's public key by email, for inviting
// them into a chapter with an ECDH-wrapped key instead of a one-time secret.
// Requires the caller to already share a chapter with the target — otherwise
// this endpoint could be used to enumerate which emails have accounts.
func (h *UserHandler) GetByEmail(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		handleError(w, badRequest(errMissingEmail))
		return
	}

	requesterID := middleware.UserIDFromContext(r.Context())

	target, err := h.users.GetByEmail(r.Context(), email)
	if err != nil {
		handleError(w, err)
		return
	}

	shared, err := db.SharesAnyChapter(r.Context(), h.pool, requesterID, target.ID)
	if err != nil {
		handleError(w, err)
		return
	}
	if !shared {
		handleError(w, db.ErrNotMember)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"id":        target.ID,
		"publicKey": target.PublicKey,
	})
}
