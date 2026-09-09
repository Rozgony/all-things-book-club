package services

import (
	"context"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/all-things-book-club/internal/crypto"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrInviteExpired = errors.New("invite has expired")
var ErrInviteNotPending = errors.New("invite is not pending")

type InviteService struct {
	db *pgxpool.Pool
}

func NewInviteService(db *pgxpool.Pool) *InviteService {
	return &InviteService{db: db}
}

// Invite is what the invitee's browser sees at GET /api/invites/{token}.
// Deliberately excludes inviter_id — the invitee's own session (once
// created) supplies their identity, so nothing here needs to be trusted.
type Invite struct {
	InviterName         string    `json:"inviterName"`
	EncryptedChapterKey []byte    `json:"encryptedChapterKey"`
	KeyNonce            []byte    `json:"keyNonce"`
	ExpiresAt           time.Time `json:"expiresAt"`
}

// Create generates a random invite token and stores the invite. It does NOT
// receive or persist the invite secret — that only ever lives in the caller's
// (this request's) memory long enough to build the returned URL. Invites are
// link-only: whoever holds the token can accept, there is no per-email
// restriction.
func (s *InviteService) Create(ctx context.Context, chapterID, inviterID string, encryptedChapterKey, keyNonce []byte, inviterName string) (token string, err error) {
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
			(id, chapter_id, inviter_id, invite_token, encrypted_chapter_key, key_nonce, inviter_name, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now() + interval '7 days')
	`, id, chapterID, inviterID, token, encryptedChapterKey, keyNonce, inviterName)
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
		SELECT ci.inviter_name, ci.encrypted_chapter_key, ci.key_nonce, ci.expires_at
		FROM chapter_invitations ci
		WHERE ci.invite_token = $1
	`, token).Scan(&inv.InviterName, &inv.EncryptedChapterKey, &inv.KeyNonce, &inv.ExpiresAt)
	if err != nil {
		return nil, fmt.Errorf("InviteService.GetByToken: %w", err)
	}
	return &inv, nil
}

// Accept validates the invite and admits the authenticated user into the
// chapter with their own copy of the chapter key. Runs as a transaction so
// the membership insert and invite deletion are atomic.
func (s *InviteService) Accept(ctx context.Context, token, userID string, encryptedChapterKey, keyNonce []byte) (*ChapterMember, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var chapterID, storedToken string
	var expiresAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT chapter_id, invite_token, expires_at
		FROM chapter_invitations
		WHERE invite_token = $1
		FOR UPDATE
	`, token).Scan(&chapterID, &storedToken, &expiresAt)
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
	if time.Now().After(expiresAt) {
		return nil, ErrInviteExpired
	}

	memberID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: generate member id: %w", err)
	}

	var cm ChapterMember
	err = tx.QueryRow(ctx, `
		INSERT INTO chapter_members (id, user_id, chapter_id, role, encrypted_chapter_key, key_nonce)
		VALUES ($1, $2, $3, 'MEMBER', $4, $5)
		RETURNING id, user_id, chapter_id, role, encrypted_chapter_key, key_nonce
	`, memberID, userID, chapterID, encryptedChapterKey, keyNonce).
		Scan(&cm.ID, &cm.UserId, &cm.ChapterId, &cm.Role, &cm.EncryptedChapterKey, &cm.KeyNonce)
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: insert member: %w", err)
	}

	// The invite (and its wrapped chapter key) has no further purpose once
	// accepted — delete it rather than retaining an ACCEPTED row.
	_, err = tx.Exec(ctx, `DELETE FROM chapter_invitations WHERE invite_token = $1`, token)
	if err != nil {
		return nil, fmt.Errorf("InviteService.Accept: delete invite: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("InviteService.Accept: commit: %w", err)
	}

	return &cm, nil
}

// DeleteExpired removes pending invites past their expiry, along with the
// wrapped chapter key each carries. Intended to be run periodically.
func (s *InviteService) DeleteExpired(ctx context.Context) (int64, error) {
	tag, err := s.db.Exec(ctx, `DELETE FROM chapter_invitations WHERE expires_at < now()`)
	if err != nil {
		return 0, fmt.Errorf("InviteService.DeleteExpired: %w", err)
	}
	return tag.RowsAffected(), nil
}
