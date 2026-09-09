package routes

import (
	"encoding/json"
	"errors"
	"fmt"
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
	EncryptedChapterKey   []byte `json:"encryptedChapterKey"`
	KeyNonce              []byte `json:"keyNonce"`
	InviteSecretBase64url string `json:"inviteSecretBase64url"`
	InviterName           string `json:"inviterName"`
}

type createInviteResponse struct {
	InviteURL string `json:"inviteURL"`
}

// createInvite is the shared core: persists the invite and builds the URL.
// It never emails anything — callers decide whether/how to deliver the link.
func (h *InviteHandler) createInvite(r *http.Request, chapterID, requesterID string, encryptedChapterKey, keyNonce []byte, inviteSecretBase64url, inviterName string) (string, error) {
	token, err := h.invites.Create(r.Context(), chapterID, requesterID, encryptedChapterKey, keyNonce, inviterName)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s/accept-invite?token=%s#%s", h.appURL, token, inviteSecretBase64url), nil
}

// Create handles POST /api/chapters/{id}/invites. It never emails the link —
// the invite secret only ever exists in this request's memory to build the
// URL, which is returned to the caller. Invites are link-only: whoever holds
// the link can accept it. The caller decides how to share it: copy it
// directly (fully private), or use POST /api/chapters/{id}/invites/email,
// which hands the secret to our email provider (Resend) as a one-time
// concession for convenience.
func (h *InviteHandler) Create(w http.ResponseWriter, r *http.Request) {
	chapterID := chi.URLParam(r, "id")
	requesterID := middleware.UserIDFromContext(r.Context())

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
	if req.InviteSecretBase64url == "" {
		handleError(w, badRequest(errors.New("inviteSecretBase64url is required")))
		return
	}

	inviteURL, err := h.createInvite(r, chapterID, requesterID, req.EncryptedChapterKey, req.KeyNonce, req.InviteSecretBase64url, req.InviterName)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createInviteResponse{InviteURL: inviteURL})
}

type createAndEmailInviteRequest struct {
	InvitedEmail          string `json:"invitedEmail"`
	EncryptedChapterKey   []byte `json:"encryptedChapterKey"`
	KeyNonce              []byte `json:"keyNonce"`
	InviteSecretBase64url string `json:"inviteSecretBase64url"`
	InviterName           string `json:"inviterName"`
}

// CreateAndEmail handles POST /api/chapters/{id}/invites/email — creates the
// invite (same core as Create) and emails the link via Resend in the same
// request. invitedEmail here is only the send-to address for this one email;
// it is never persisted on the invite itself (invites remain link-only).
func (h *InviteHandler) CreateAndEmail(w http.ResponseWriter, r *http.Request) {
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

	var req createAndEmailInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handleError(w, badRequest(err))
		return
	}
	if req.InvitedEmail == "" || req.InviteSecretBase64url == "" {
		handleError(w, badRequest(errors.New("invitedEmail and inviteSecretBase64url are required")))
		return
	}

	inviteURL, err := h.createInvite(r, chapterID, requesterID, req.EncryptedChapterKey, req.KeyNonce, req.InviteSecretBase64url, req.InviterName)
	if err != nil {
		handleError(w, err)
		return
	}

	if err := h.mailer.SendInviteEmail(req.InvitedEmail, requesterEmail, inviteURL); err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createInviteResponse{InviteURL: inviteURL})
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

	var req acceptInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handleError(w, badRequest(err))
		return
	}

	member, err := h.invites.Accept(r.Context(), token, userID, req.EncryptedChapterKey, req.KeyNonce)
	if err != nil {
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			http.Error(w, `{"error":"invalid invite token"}`, http.StatusNotFound)
		case errors.Is(err, services.ErrInviteExpired):
			http.Error(w, `{"error":"invite has expired"}`, http.StatusGone)
		case errors.Is(err, services.ErrInviteNotPending):
			http.Error(w, `{"error":"invite already used"}`, http.StatusConflict)
		default:
			handleError(w, err)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}
