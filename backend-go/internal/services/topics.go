package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/all-things-book-club/internal/crypto"
	"github.com/all-things-book-club/internal/db"
)

type TopicService struct {
	db *pgxpool.Pool
}

func NewTopicService(db *pgxpool.Pool) *TopicService {
	return &TopicService{db: db}
}

type CreateTopicInput struct {
	ChapterID     string `json:"chapterId"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
}

type Topic struct {
	ID            string `json:"id"`
	ChapterID     string `json:"chapterId"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
}

var ErrTopicNotFound = errors.New("topic not found")

func (s *TopicService) Create(ctx context.Context, input CreateTopicInput, userID string) (*Topic, error) {
	topicID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("TopicService.Create: generate topic ID: %w", err)
	}

	// Verify the caller is a member of the chapter
	ok, err := db.IsMember(ctx, s.db, input.ChapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("TopicService.Create: %w", err)
	}
	if !ok {
		return nil, ErrNotMember
	}

	var t Topic
	err = s.db.QueryRow(ctx, `
		INSERT INTO topics (id, chapter_id, encrypted_blob, nonce, created_at, updated_at)
		VALUES ($1, $2, $3, $4, now(), now())
		RETURNING id, chapter_id, encrypted_blob, nonce, created_at, updated_at
	`, topicID, input.ChapterID, input.EncryptedBlob, input.Nonce).
		Scan(&t.ID, &t.ChapterID, &t.EncryptedBlob, &t.Nonce, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("TopicService.Create: insert topic: %w", err)
	}

	return &t, nil
}

func (s *TopicService) Update(ctx context.Context, input CreateTopicInput, topicID string, userID string) (*Topic, error) {
	// Get the topic's chapter first to verify membership
	var chapterID string
	err := s.db.QueryRow(ctx, `
		SELECT chapter_id FROM topics WHERE id = $1
	`, topicID).Scan(&chapterID)
	if err != nil {
		return nil, fmt.Errorf("TopicService.Update: fetch topic: %w", err)
	}

	// Verify the caller is a member of the chapter
	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("TopicService.Update: %w", err)
	}
	if !ok {
		return nil, ErrNotMember
	}

	var t Topic
	err = s.db.QueryRow(ctx, `
		UPDATE topics
		SET encrypted_blob = $1, nonce = $2, updated_at = now()
		WHERE id = $3
		RETURNING id, chapter_id, encrypted_blob, nonce, created_at, updated_at
	`, input.EncryptedBlob, input.Nonce, topicID).
		Scan(&t.ID, &t.ChapterID, &t.EncryptedBlob, &t.Nonce, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("TopicService.Update: update topic: %w", err)
	}

	return &t, nil
}

func (s *TopicService) Delete(ctx context.Context, topicID string, userID string) error {
	// Get the topic's chapter first to verify membership
	var chapterID string
	err := s.db.QueryRow(ctx, `
		SELECT chapter_id FROM topics WHERE id = $1
	`, topicID).Scan(&chapterID)
	if err != nil {
		return fmt.Errorf("TopicService.Delete: fetch topic: %w", err)
	}

	// Verify the caller is an admin of the chapter
	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return fmt.Errorf("TopicService.Delete: %w", err)
	}
	if !ok {
		return ErrNotMember
	}

	_, err = s.db.Exec(ctx, `DELETE FROM topics WHERE id = $1`, topicID)
	if err != nil {
		return fmt.Errorf("TopicService.Delete: delete topic: %w", err)
	}

	return nil
}
