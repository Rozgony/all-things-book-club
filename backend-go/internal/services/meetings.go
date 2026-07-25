package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/all-things-book-club/internal/crypto"
	"github.com/all-things-book-club/internal/db"
)

type MeetingService struct {
	db *pgxpool.Pool
}

// NewMeetingService constructs a MeetingService.
// This pattern (New<Thing>) is Go's convention for constructors.
func NewMeetingService(db *pgxpool.Pool) *MeetingService {
	return &MeetingService{db: db}
}

// CreateMeetingInput is the data the client sends when creating a member.
// The server stores name plaintext, and the encrypted blob opaquely.
type CreateMeetingInput struct {
	EncryptedBlob 		[]byte 	`json:"encryptedBlob"`
	Nonce         		[]byte 	`json:"nonce"`
	ChapterID      		string  `json:"chapterId"`
	ScheduledAt       	string  `json:"scheduledAt"`
	Duration       		int  	`json:"duration"`
	RecurringGroupId    string  `json:"recurringGroupId"`
}

type Meeting struct {
	ID      			string  `json:"id"`
	ChapterID      		string  `json:"chapterId"`
	ScheduledAt       	string  `json:"scheduledAt"`
	Duration       		int  	`json:"duration"`
	RecurringGroupId    *string `json:"recurringGroupId"`
	Status    			string  `json:"status"`
	EncryptedBlob 		[]byte 	`json:"encryptedBlob"`
	Nonce         		[]byte 	`json:"nonce"`
}

var ErrNotMember = errors.New("user is not a member of this chapter")

func (s *MeetingService) Create(ctx context.Context, input CreateMeetingInput, userID string) (*Meeting, error) {
	meetingID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("MeetingService.Create: generate member ID: %w", err)
	}

	// Verify the caller is a member of the chapter
	ok, err := db.IsMember(ctx, s.db, input.ChapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.Create: %w", err)
	}
	if !ok {
		return nil, ErrNotMember
	}

	var m Meeting
	err = s.db.QueryRow(ctx, `
		INSERT INTO meetings (id, chapter_id, duration, scheduled_at, recurring_group_id, created_at, updated_at, status, encrypted_blob, nonce)
		VALUES ($1, $2, $3, $4, $5, now(), now(), 'SCHEDULED', $6, $7)
		RETURNING id, chapter_id, duration, scheduled_at, status
	`, meetingID, input.ChapterID, input.Duration, input.ScheduledAt, input.RecurringGroupId, input.EncryptedBlob, input.Nonce).
		Scan(&m.ID, &m.ChapterID, &m.Duration, &m.ScheduledAt, &m.Status)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.Create: insert meeting: %w", err)
	}

	return &m, nil
}

func (s *MeetingService) GetByID(ctx context.Context, meetingID string, userID string) (*Meeting, error) {

	var m Meeting
	err := s.db.QueryRow(ctx, `
		SELECT m.id, m.chapter_id, m.duration, m.scheduled_at, m.recurring_group_id, m.status, nonce, encrypted_blob
		FROM meetings m
		JOIN topics t ON t.meeting_id = m.id
		WHERE m.id = $1
		RETURNING id, chapter_id, duration, scheduled_at, recurring_group_id, status, nonce, encrypted_blob
	`, meetingID).
		Scan(&m.ID, &m.ChapterID, &m.Duration, &m.ScheduledAt, &m.RecurringGroupId, &m.Status, &m.Nonce, &m.EncryptedBlob)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.GetByID: %w", err)
	}

	ok, memberErr := db.IsMember(ctx, s.db, m.ChapterID, userID)
	if memberErr != nil {
		return nil, fmt.Errorf("MeetingService.GetByID: %w", memberErr)
	}
	if !ok {
		return nil, ErrNotMember
	}

	return &m, nil
}

func (s *MeetingService) GetByChapterID(ctx context.Context, chapterID string, userID string) (*Meeting, error) {

	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.GetByChapterID: %w", err)
	}
	if !ok {
		return nil, ErrNotMember
	}

	var m Meeting
	err = s.db.QueryRow(ctx, `
		SELECT m.id, m.chapter_id, m.scheduled_at, m.duration, m.recurring_group_id, m.status, nonce, encrypted_blob
		FROM meetings m
		JOIN topics t ON t.meeting_id = m.id
		WHERE m.chapter_id = $1
		RETURNING id, chapter_id, duration, scheduled_at, status, nonce, encrypted_blob
	`, chapterID).
		Scan(&m.ID, &m.ChapterID, &m.Duration, &m.ScheduledAt, &m.Status, &m.Nonce, &m.EncryptedBlob)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.GetByChapterID: %w", err)
	}

	return &m, nil
}

func (s *MeetingService) Update(ctx context.Context, input CreateMeetingInput, meetingID string, userID string) (*Meeting, error) {
		// Verify the caller is a member of the chapter
	ok, err := db.IsMember(ctx, s.db, input.ChapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.Update: %w", err)
	}
	if !ok {
		return nil, ErrNotMember
	}

	var m Meeting
	err = s.db.QueryRow(ctx, `
		UPDATE meetings
		SET scheduled_at = $1, duration = $2, recurrin_grou_id = $3, encrypted_blob = $4, nonce = $5, updated_at = now()
		WHERE id = $6
		RETURNING id, scheduled_at, duration, recurrin_grou_id, encrypted_blob, nonce
	`, input.ScheduledAt, input.Duration, input.RecurringGroupId, input.EncryptedBlob, input.Nonce, meetingID).
		Scan(&m.ID, &m.ScheduledAt, &m.Duration, &m.RecurringGroupId, &m.EncryptedBlob, &m.Nonce)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.Update: %w", err)
	}
	return &m, nil
}

func (s *MeetingService) Delete(ctx context.Context, meetingID string, userID string) error {
	
	var m Meeting
	err := s.db.QueryRow(ctx, `
		SELECT m.id, m.chapter_id
		FROM meetings m
		WHERE m.id = $1
		RETURNING chapter_id
	`, meetingID).
		Scan(&m.ChapterID)
	if err != nil {
		return fmt.Errorf("MeetingService.Delete: %w", err)
	}
	
	ok, adminErr := db.IsAdmin(ctx, s.db, m.ChapterID, userID)
	if adminErr != nil {
		return fmt.Errorf("MeetingService.Delete: %w", adminErr)
	}
	if !ok {
		return ErrNotMember
	}

	_, deleteErr := s.db.Exec(ctx, `DELETE FROM chapters WHERE id = $1`, meetingID)
	if deleteErr != nil {
		return fmt.Errorf("MeetingService.Delete: %w", deleteErr)
	}
	return nil
}
