package services

import (
	"context"
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

type TopicInput struct {
	MeetingID     string `json:"meetingId"`
	ChapterID     string `json:"chapterId"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
	Status        string `json:"status"`
}

type Topic struct {
	ID            string   `json:"id"`
	ChapterID     string   `json:"chapterId"`
	MeetingID     *string  `json:"meetingId"`
	Status        string   `json:"status"`
	EncryptedBlob []byte   `json:"encryptedBlob"`
	Nonce         []byte   `json:"nonce"`
	ThemeIDs      []string `json:"themeIds"`
}

func (s *TopicService) Create(ctx context.Context, input TopicInput, userID string) (*Topic, error) {
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
		return nil, db.ErrNotMember
	}

	var t Topic
	err = s.db.QueryRow(ctx, `
		INSERT INTO topics (id, chapter_id, meeting_id, encrypted_blob, nonce, status)
		VALUES ($1, $2, $3, $4, $5, 'PENDING')
		RETURNING id, chapter_id, meeting_id, status, encrypted_blob, nonce
	`, topicID, input.ChapterID, input.MeetingID, input.EncryptedBlob, input.Nonce).
		Scan(&t.ID, &t.ChapterID, &t.MeetingID, &t.Status, &t.EncryptedBlob, &t.Nonce)
	if err != nil {
		return nil, fmt.Errorf("TopicService.Create: insert topic: %w", err)
	}

	return &t, nil
}

func (s *TopicService) UpdateStatus(ctx context.Context, topicID string, status string, userID string) error {
	ok, err := db.IsMemberOfTopic(ctx, s.db, topicID, userID)
	if err != nil {
		return fmt.Errorf("TopicService.UpdateStatus: %w", err)
	}
	if !ok {
		return db.ErrNotMember
	}

	_, err = s.db.Exec(ctx, `
		UPDATE topics
		SET status = $1
		WHERE id = $2
	`, status, topicID)
	if err != nil {
		return fmt.Errorf("TopicService.UpdateStatus: %w", err)
	}
	return nil
}

func (s *TopicService) UpdateEncrypted(ctx context.Context, topicID string, encryptedBlob []byte, nonce []byte, userID string) error {
	ok, err := db.IsMemberOfTopic(ctx, s.db, topicID, userID)
	if err != nil {
		return fmt.Errorf("TopicService.UpdateEncrypted: %w", err)
	}
	if !ok {
		return db.ErrNotMember
	}

	_, err = s.db.Exec(ctx, `
		UPDATE topics
		SET encrypted_blob = $1, nonce = $2
		WHERE id = $3
	`, encryptedBlob, nonce, topicID)
	if err != nil {
		return fmt.Errorf("TopicService.UpdateEncrypted: %w", err)
	}
	return nil
}

func (s *TopicService) Delete(ctx context.Context, topicID string, userID string) error {
	ok, err := db.IsMemberOfTopic(ctx, s.db, topicID, userID)
	if err != nil {
		return fmt.Errorf("TopicService.Delete: %w", err)
	}
	if !ok {
		return db.ErrNotMember
	}

	_, err = s.db.Exec(ctx, `DELETE FROM topics WHERE id = $1`, topicID)
	if err != nil {
		return fmt.Errorf("TopicService.Delete: delete topic: %w", err)
	}

	return nil
}
