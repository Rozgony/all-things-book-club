package services

import (
	"context"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/all-things-book-club/internal/crypto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrInviteExpired = errors.New("invite has expired")
var ErrInviteNotPending = errors.New("invite is not pending")
var ErrInviteEmailMismatch = errors.New("authenticated email does not match invited email")

type InviteService struct {
	db *pgxpool.Pool
}

func NewInviteService(db *pgxpool.Pool) *InviteService {
	return &InviteService{db: db}
}

// Invite is what the invitee's browser sees at GET /api/invites/{token}.
// Deliberately excludes invited_email/inviter_id — the invitee's own session
// (once created) supplies their email, so nothing here needs to be trusted.
type Invite struct {
	InviterEmail        string    `json:"inviterEmail"`
	EncryptedChapterKey []byte    `json:"encryptedChapterKey"`
	KeyNonce            []byte    `json:"keyNonce"`
	ExpiresAt           time.Time `json:"expiresAt"`
	Status              string    `json:"status"`
}

var ErrInviteUnique = errors.New("A user can only have one pending Chapter Invite.")

// Create generates a random invite token and stores the invite. It does NOT
// receive or persist the invite secret — that only ever lives in the caller's
// (this request's) memory long enough to build the emailed URL.
func (s *InviteService) Create(ctx context.Context, chapterID, inviterID, invitedEmail string, encryptedChapterKey, keyNonce []byte) (token string, err error) {
	id, err := crypto.GenerateID()
	if err != nil {
		return "", fmt.Errorf("InviteService.Create: generate id: %w", err)
	}

	tokenBytes, err := crypto.RandomBytes(32)
	if err != nil {
		return "", fmt.Errorf("InviteService.Create: generate token: %w", err)
	}
	token = hex.EncodeToString(tokenBytes)

	_, err = s.db.Exec(ctx, `
		INSERT INTO chapter_invitations
			(id, chapter_id, inviter_id, invited_email, invite_token, encrypted_chapter_key, key_nonce, status, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', now() + interval '7 days', now())
	`, id, chapterID, inviterID, invitedEmail, token, encryptedChapterKey, keyNonce)
	if err != nil && strings.Contains(err.Error(), "chapter_invitations_pending_unique") {
		return "", fmt.Errorf("InviteService.Create: insert: %w", ErrInviteUnique)
	}
	if err != nil {
		return "", fmt.Errorf("InviteService.Create: insert: %w", err)
	}

	return token, nil
}

// GetByToken looks up a pending invite for display on the accept page.
// Rate-limit this at the route/middleware layer — it's unauthenticated.
func (s *InviteService) GetByToken(ctx context.Context, token string) (*Invite, error) {
	fmt.Printf("token %s", token)
	var inv Invite
	err := s.db.QueryRow(ctx, `
		SELECT au.email, ci.encrypted_chapter_key, ci.key_nonce, ci.expires_at, ci.status
		FROM chapter_invitations ci
		JOIN auth.users au ON au.id::text = ci.inviter_id
		WHERE ci.invite_token = $1
	`, token).Scan(&inv.InviterEmail, &inv.EncryptedChapterKey, &inv.KeyNonce, &inv.ExpiresAt, &inv.Status)
	if err != nil {
		return nil, fmt.Errorf("InviteService.GetByToken: %w", err)
	}
	return &inv, nil
}

// Accept validates the invite and admits the authenticated user into the
// chapter with their own ECDH-wrapped copy of the chapter key. Runs as a
// transaction so the membership insert and invite status update are atomic.
func (s *InviteService) Accept(ctx context.Context, token, userID, userEmail string, encryptedChapterKey, keyNonce []byte) (*ChapterMember, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var chapterID, invitedEmail, storedToken, status string
	var expiresAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT chapter_id, invited_email, invite_token, status, expires_at
		FROM chapter_invitations
		WHERE invite_token = $1
		FOR UPDATE
	`, token).Scan(&chapterID, &invitedEmail, &storedToken, &status, &expiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("InviteService.Accept: lookup: %w", err)
	}

	// Defense in depth: the WHERE above already matched exactly, but compare
	// again in constant time so a future refactor to fuzzy/prefix lookups
	// can't silently reintroduce a timing side-channel.
	if subtle.ConstantTimeCompare([]byte(token), []byte(storedToken)) != 1 {
		return nil, pgx.ErrNoRows
	}
	if status != "PENDING" {
		return nil, ErrInviteNotPending
	}
	if time.Now().After(expiresAt) {
		return nil, ErrInviteExpired
	}
	if invitedEmail != userEmail {
		return nil, ErrInviteEmailMismatch
	}

	memberID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: generate member id: %w", err)
	}

	var cm ChapterMember
	err = tx.QueryRow(ctx, `
		INSERT INTO chapter_members (id, user_id, chapter_id, role, joined_at, encrypted_chapter_key, key_nonce)
		VALUES ($1, $2, $3, 'MEMBER', now(), $4, $5)
		RETURNING id, user_id, chapter_id, role, encrypted_chapter_key, key_nonce
	`, memberID, userID, chapterID, encryptedChapterKey, keyNonce).
		Scan(&cm.ID, &cm.UserId, &cm.ChapterId, &cm.Role, &cm.EncryptedChapterKey, &cm.KeyNonce)
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: insert member: %w", err)
	}

	_, err = tx.Exec(ctx, `UPDATE chapter_invitations SET status = 'ACCEPTED' WHERE invite_token = $1`, token)
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: update status: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("InviteService.Accept: commit: %w", err)
	}

	return &cm, nil
}
