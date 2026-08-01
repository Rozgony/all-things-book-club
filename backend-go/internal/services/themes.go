package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/all-things-book-club/internal/crypto"
	"github.com/all-things-book-club/internal/db"
)

type ThemeService struct {
	db *pgxpool.Pool
}

func NewThemeService(db *pgxpool.Pool) *ThemeService {
	return &ThemeService{db: db}
}

type Theme struct {
	ID            string `json:"id"`
	ChapterID     string `json:"chapterId"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
	CreatedAt     time.Time `json:"createdAt"`
}

// ThemeInput is used when the frontend creates a brand new theme.
// The name is encrypted client-side before sending.
type ThemeInput struct {
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
}

// LinkThemeInput is used when linking a theme to a topic.
// Send ThemeID to link an existing theme, or EncryptedBlob+Nonce to create a new one and link it in one call.
type LinkThemeInput struct {
	ThemeID       string `json:"themeId"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
}

// ListByChapter returns all encrypted themes for a chapter.
// The frontend decrypts them locally with the chapter key and uses them for autocomplete.
func (s *ThemeService) ListByChapter(ctx context.Context, chapterID string, userID string) ([]*Theme, error) {
	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("ThemeService.ListByChapter: %w", err)
	}
	if !ok {
		return nil, db.ErrNotMember
	}

	rows, err := s.db.Query(ctx, `
		SELECT id, chapter_id, encrypted_blob, nonce, created_at
		FROM themes
		WHERE chapter_id = $1
		ORDER BY created_at ASC
	`, chapterID)
	if err != nil {
		return nil, fmt.Errorf("ThemeService.ListByChapter: query: %w", err)
	}
	defer rows.Close()

	themes := []*Theme{}
	for rows.Next() {
		var t Theme
		if err := rows.Scan(&t.ID, &t.ChapterID, &t.EncryptedBlob, &t.Nonce, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("ThemeService.ListByChapter: scan: %w", err)
		}
		themes = append(themes, &t)
	}

	return themes, nil
}

// LinkToTopic links a theme to a topic in one call.
// If ThemeID is set, links the existing theme.
// If EncryptedBlob+Nonce are set, creates the theme in the chapter first, then links it — all in one transaction.
// Returns the ID of the theme that was linked (existing or newly created).
func (s *ThemeService) LinkToTopic(ctx context.Context, input LinkThemeInput, topicID string, userID string) (string, error) {
	// Get the topic's chapter to verify membership
	var chapterID string
	err := s.db.QueryRow(ctx, `
		SELECT chapter_id FROM topics WHERE id = $1
	`, topicID).Scan(&chapterID)
	if err != nil {
		return "", fmt.Errorf("ThemeService.LinkToTopic: fetch topic: %w", err)
	}

	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return "", fmt.Errorf("ThemeService.LinkToTopic: %w", err)
	}
	if !ok {
		return "", db.ErrNotMember
	}

	themeID := input.ThemeID

	// New theme: create it in the chapter first, then link
	if themeID == "" {
		tx, err := s.db.Begin(ctx)
		if err != nil {
			return "", fmt.Errorf("ThemeService.LinkToTopic: begin tx: %w", err)
		}
		defer tx.Rollback(ctx)

		newThemeID, err := crypto.GenerateID()
		if err != nil {
			return "", fmt.Errorf("ThemeService.LinkToTopic: generate theme ID: %w", err)
		}

		err = tx.QueryRow(ctx, `
			INSERT INTO themes (id, chapter_id, encrypted_blob, nonce, created_at)
			VALUES ($1, $2, $3, $4, now())
			RETURNING id
		`, newThemeID, chapterID, input.EncryptedBlob, input.Nonce).Scan(&themeID)
		if err != nil {
			return "", fmt.Errorf("ThemeService.LinkToTopic: create theme: %w", err)
		}

		linkID, err := crypto.GenerateID()
		if err != nil {
			return "", fmt.Errorf("ThemeService.LinkToTopic: generate link ID: %w", err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO topic_themes (id, topic_id, theme_id)
			VALUES ($1, $2, $3)
			ON CONFLICT (topic_id, theme_id) DO NOTHING
		`, linkID, topicID, themeID)
		if err != nil {
			return "", fmt.Errorf("ThemeService.LinkToTopic: link theme: %w", err)
		}

		if err := tx.Commit(ctx); err != nil {
			return "", fmt.Errorf("ThemeService.LinkToTopic: commit tx: %w", err)
		}

		return themeID, nil
	}

	// Existing theme: just link it
	linkID, err := crypto.GenerateID()
	if err != nil {
		return "", fmt.Errorf("ThemeService.LinkToTopic: generate link ID: %w", err)
	}

	_, err = s.db.Exec(ctx, `
		INSERT INTO topic_themes (id, topic_id, theme_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (topic_id, theme_id) DO NOTHING
	`, linkID, topicID, themeID)
	if err != nil {
		return "", fmt.Errorf("ThemeService.LinkToTopic: link theme: %w", err)
	}

	return themeID, nil
}

// RemoveFromTopic unlinks a theme from a topic. Does not delete the theme itself.
func (s *ThemeService) RemoveFromTopic(ctx context.Context, topicID string, themeID string, userID string) error {
	// Get the topic's chapter to verify membership
	var chapterID string
	err := s.db.QueryRow(ctx, `
		SELECT chapter_id FROM topics WHERE id = $1
	`, topicID).Scan(&chapterID)
	if err != nil {
		return fmt.Errorf("ThemeService.RemoveFromTopic: fetch topic: %w", err)
	}

	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return fmt.Errorf("ThemeService.RemoveFromTopic: %w", err)
	}
	if !ok {
		return db.ErrNotMember
	}

	_, err = s.db.Exec(ctx, `
		DELETE FROM topic_themes WHERE topic_id = $1 AND theme_id = $2
	`, topicID, themeID)
	if err != nil {
		return fmt.Errorf("ThemeService.RemoveFromTopic: delete: %w", err)
	}

	return nil
}
