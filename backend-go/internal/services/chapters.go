package services

import (
	"context"
	"fmt"

	"github.com/all-things-book-club/internal/crypto"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/all-things-book-club/internal/db"
)

// ChapterInput is the data the client sends when creating a chapter.
// The server stores name plaintext, and the encrypted blob opaquely.
type ChapterInput struct {
	Name          string `json:"name"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
	IsPublic      bool   `json:"isPublic"`
	// EncryptedChapterKey is the chapter's symmetric key encrypted with the creator's public key.
	// Only the creator can decrypt it using their private key (never sent to the server).
	EncryptedChapterKey []byte `json:"encryptedChapterKey"`
	KeyNonce            []byte `json:"keyNonce"`
}

// Chapter represents a book club chapter returned from the database.
// In Go, exported fields (capitalized) are what get serialized to JSON.
// Unexported fields (lowercase) are invisible to encoding/json.
type Chapter struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatorID string `json:"creatorId"`
	IsPublic  bool   `json:"isPublic"`
	CreatedAt string `json:"createdAt"`
}

// ChapterService holds the database pool.
// Methods on this struct are the only things allowed to run DB queries for chapters.
type ChapterService struct {
	db *pgxpool.Pool
}

// NewChapterService constructs a ChapterService.
// This pattern (New<Thing>) is Go's convention for constructors.
func NewChapterService(db *pgxpool.Pool) *ChapterService {
	return &ChapterService{db: db}
}

// ListForUser returns all chapters the given user is a member of.
func (s *ChapterService) ListForUser(ctx context.Context, userID string) ([]Chapter, error) {
	
	// Note: No membership check since its part of the query
	rows, err := s.db.Query(ctx, `
		SELECT c.id, c.name, c.creator_id, c.is_public, c.created_at
		FROM chapters c
		JOIN chapter_members cm ON cm.chapter_id = c.id
		WHERE cm.user_id = $1
		ORDER BY c.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("ChapterService.ListForUser: %w", err)
	}
	defer rows.Close()

	var chapters []Chapter
	for rows.Next() {
		var ch Chapter
		if err := rows.Scan(&ch.ID, &ch.Name, &ch.CreatorID, &ch.IsPublic, &ch.CreatedAt); err != nil {
			return nil, fmt.Errorf("ChapterService.ListForUser scan: %w", err)
		}
		chapters = append(chapters, ch)
	}

	// Return an empty slice (not nil) so the JSON response is [] not null
	if chapters == nil {
		chapters = []Chapter{}
	}

	return chapters, nil
}

// Create inserts a new chapter and adds the creator as an ADMIN member.
// This runs both inserts in a transaction — if the membership insert fails,
// the chapter insert is rolled back. You never want a chapter with no members.
func (s *ChapterService) Create(ctx context.Context, input ChapterInput, creatorID string) (*Chapter, error) {
	chapterID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("ChapterService.Create: generate chapter ID: %w", err)
	}
	memberID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("ChapterService.Create: generate member ID: %w", err)
	}

	// Begin a transaction — both inserts must succeed or both are rolled back
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("ChapterService.Create: begin transaction: %w", err)
	}
	defer tx.Rollback(ctx) // no-op if tx.Commit() is called below

	var ch Chapter
	err = tx.QueryRow(ctx, `
		INSERT INTO chapters (id, name, creator_id, is_public, encrypted_blob, nonce, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, now(), now())
		RETURNING id, name, creator_id, is_public, created_at
	`, chapterID, input.Name, creatorID, input.IsPublic, input.EncryptedBlob, input.Nonce).
		Scan(&ch.ID, &ch.Name, &ch.CreatorID, &ch.IsPublic, &ch.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("ChapterService.Create: insert chapter: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO chapter_members (id, user_id, chapter_id, role, joined_at, encrypted_chapter_key, key_nonce)
		VALUES ($1, $2, $3, 'ADMIN', now(), $4, $5)
	`, memberID, creatorID, chapterID, input.EncryptedChapterKey, input.KeyNonce)
	if err != nil {
		return nil, fmt.Errorf("ChapterService.Create: insert member: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("ChapterService.Create: commit: %w", err)
	}

	return &ch, nil
}

func (s *ChapterService) GetByID(ctx context.Context, chapterID string, userID string) (*Chapter, error) {
	// Note: No membership check since its part of the query
	var ch Chapter
	err := s.db.QueryRow(ctx, `
		SELECT c.id, c.name, c.creator_id, c.is_public, c.created_at
		FROM chapters c
		JOIN chapter_members cm ON cm.chapter_id = c.id
		WHERE c.id = $1 AND cm.user_id = $2
	`, chapterID, userID).
		Scan(&ch.ID, &ch.Name, &ch.CreatorID, &ch.IsPublic, &ch.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("ChapterService.GetByID: %w", err)
	}
	return &ch, nil
}

func (s *ChapterService) Update(ctx context.Context, input ChapterInput, chapterID string, userID string) (*Chapter, error) {
	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.Create: %w", err)
	}
	if !ok {
		return nil, db.ErrNotMember
	}

	var ch Chapter
	err = s.db.QueryRow(ctx, `
		UPDATE chapters
		SET name = $1, is_public = $2, encrypted_blob = $3, nonce = $4, updated_at = now()
		WHERE id = $5
		RETURNING id, name, creator_id, is_public, created_at
	`, input.Name, input.IsPublic, input.EncryptedBlob, input.Nonce, chapterID).
		Scan(&ch.ID, &ch.Name, &ch.CreatorID, &ch.IsPublic, &ch.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("ChapterService.Update: %w", err)
	}
	return &ch, nil
}

func (s *ChapterService) Delete(ctx context.Context, chapterID string, userID string) error {
	ok, err := db.IsAdmin(ctx, s.db, chapterID, userID)
	if err != nil {
		return fmt.Errorf("MeetingService.Create: %w", err)
	}
	if !ok {
		return db.ErrNotMember
	}
	_, err = s.db.Exec(ctx, `DELETE FROM chapters WHERE id = $1`, chapterID)
	if err != nil {
		return fmt.Errorf("ChapterService.Delete: %w", err)
	}
	return nil
}
