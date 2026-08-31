package routes

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/all-things-book-club/internal/db"
	"github.com/all-things-book-club/internal/mailer"
	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type InviteHandler struct {
	invites *services.InviteService
	mailer  *mailer.Mailer
	pool    *pgxpool.Pool
	appURL  string
}

func NewInviteHandler(s *services.InviteService, m *mailer.Mailer, pool *pgxpool.Pool, appURL string) *InviteHandler {
	return &InviteHandler{invites: s, mailer: m, pool: pool, appURL: appURL}
}

type createInviteRequest struct {
	InvitedEmail          string `json:"invitedEmail"`
	EncryptedChapterKey   []byte `json:"encryptedChapterKey"`
	KeyNonce              []byte `json:"keyNonce"`
	InviteSecretBase64url string `json:"inviteSecretBase64url"`
}

// Create handles POST /api/chapters/{id}/invites
// The invite secret is used only to build the emailed URL fragment; it is
// never written to the database (see services.InviteService.Create).
func (h *InviteHandler) Create(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	requesterID := middleware.UserIDFromContext(r.Context())
	requesterEmail := middleware.UserEmailFromContext(r.Context())

	isMember, err := db.IsMember(r.Context(), h.pool, chapterID, requesterID)
	if err != nil {
		handleError(w, err)
		return
	}
	if !isMember {
		handleError(w, db.ErrNotMember)
		return
	}

	var req createInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handleError(w, badRequest(err))
		return
	}
	if req.InvitedEmail == "" || req.InviteSecretBase64url == "" {
		handleError(w, badRequest(errors.New("invitedEmail and inviteSecretBase64url are required")))
		return
	}
	log.Printf("req %+v", req)

	token, err := h.invites.Create(r.Context(), chapterID, requesterID, req.InvitedEmail, req.EncryptedChapterKey, req.KeyNonce)
	if err != nil {
		handleError(w, err)
		return
	}

	inviteURL := fmt.Sprintf("%s/accept-invite?token=%s#%s", h.appURL, token, req.InviteSecretBase64url)
	if err := h.mailer.SendInviteEmail(req.InvitedEmail, requesterEmail, inviteURL); err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// GetByToken handles GET /api/invites/{token} — unauthenticated (the invitee
// may not have an account yet). Should sit behind rate limiting middleware.
func (h *InviteHandler) GetByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	invite, err := h.invites.GetByToken(r.Context(), token)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invite)
}

type acceptInviteRequest struct {
	EncryptedChapterKey []byte `json:"encryptedChapterKey"`
	KeyNonce            []byte `json:"keyNonce"`
}

// Accept handles POST /api/invites/{token}/accept — auth required.
func (h *InviteHandler) Accept(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	userID := middleware.UserIDFromContext(r.Context())
	userEmail := middleware.UserEmailFromContext(r.Context())

	var req acceptInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handleError(w, badRequest(err))
		return
	}

	member, err := h.invites.Accept(r.Context(), token, userID, userEmail, req.EncryptedChapterKey, req.KeyNonce)
	if err != nil {
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			http.Error(w, `{"error":"invalid invite token"}`, http.StatusNotFound)
		case errors.Is(err, services.ErrInviteExpired):
			http.Error(w, `{"error":"invite has expired"}`, http.StatusGone)
		case errors.Is(err, services.ErrInviteNotPending):
			http.Error(w, `{"error":"invite already used"}`, http.StatusConflict)
		case errors.Is(err, services.ErrInviteEmailMismatch):
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		default:
			handleError(w, err)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}
