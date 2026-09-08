package services

import (
	"context"
	"fmt"
	"time"

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

// GetDB returns the database pool for use in route handlers
func (s *MeetingService) GetDB() *pgxpool.Pool {
	return s.db
}

// MeetingInput is the data the client sends when creating a member.
// The server stores name plaintext, and the encrypted blob opaquely.
type MeetingInput struct {
	EncryptedBlob    []byte    `json:"encryptedBlob"`
	Nonce            []byte    `json:"nonce"`
	ChapterID        string    `json:"chapterId"`
	ScheduledAt      time.Time `json:"scheduledAt"`
	Duration         int       `json:"duration"`
	RecurringGroupId *string   `json:"recurringGroupId"`
}

type Meeting struct {
	ID               string           `json:"id"`
	ChapterID        string           `json:"chapterId"`
	ScheduledAt      time.Time        `json:"scheduledAt"`
	Duration         int              `json:"duration"`
	RecurringGroupId *string          `json:"recurringGroupId"`
	Status           string           `json:"status"`
	EncryptedBlob    []byte           `json:"encryptedBlob"`
	Nonce            []byte           `json:"nonce"`
	Chapter          *Chapter         `json:"chapter"`
	Topics           []*Topic         `json:"topics"`
	ChapterMembers   []*ChapterMember `json:"chapterMember"`
}

func (s *MeetingService) Create(ctx context.Context, input MeetingInput, userID string) (*Meeting, error) {
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
		return nil, db.ErrNotMember
	}

	var m Meeting
	err = s.db.QueryRow(ctx, `
		INSERT INTO meetings (id, chapter_id, duration, scheduled_at, recurring_group_id, status, encrypted_blob, nonce)
		VALUES ($1, $2, $3, $4, $5, 'SCHEDULED', $6, $7)
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
	var cm ChapterMember
	var ch Chapter
	err := s.db.QueryRow(ctx, `
		SELECT m.id, m.chapter_id, m.duration, m.scheduled_at, m.recurring_group_id, m.status, m.nonce, m.encrypted_blob,
			cm.id, cm.encrypted_chapter_key, cm.key_nonce,
			c.id, c.creator_id, c.is_public, c.encrypted_blob, c.nonce
		FROM meetings m
		JOIN chapter_members cm ON cm.chapter_id = m.chapter_id AND cm.user_id = $2
		JOIN chapters c ON c.id = m.chapter_id
		WHERE m.id = $1
	`, meetingID, userID).
		Scan(&m.ID, &m.ChapterID, &m.Duration, &m.ScheduledAt, &m.RecurringGroupId,
			&m.Status, &m.Nonce, &m.EncryptedBlob,
			&cm.ID, &cm.EncryptedChapterKey, &cm.KeyNonce,
			&ch.ID, &ch.CreatorID, &ch.IsPublic, &ch.EncryptedBlob, &ch.Nonce)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.GetByID: %w", err)
	}

	m.Chapter = &ch
	m.ChapterMembers = append(m.ChapterMembers, &cm)

	// Fetch topics for this meeting
	topicRows, err := s.db.Query(ctx, `
		SELECT id, chapter_id, meeting_id, status, encrypted_blob, nonce
		FROM topics
		WHERE meeting_id = $1
	`, meetingID)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.GetByID: fetch topics: %w", err)
	}
	defer topicRows.Close()

	for topicRows.Next() {
		var t Topic
		if err := topicRows.Scan(&t.ID, &t.ChapterID, &t.MeetingID, &t.Status, &t.EncryptedBlob, &t.Nonce); err != nil {
			return nil, fmt.Errorf("MeetingService.GetByID: scan topic: %w", err)
		}
		m.Topics = append(m.Topics, &t)
	}

	// Fetch theme associations for these topics
	if len(m.Topics) > 0 {
		topicIDs := make([]string, len(m.Topics))
		topicIndex := make(map[string]int, len(m.Topics))
		for i, t := range m.Topics {
			topicIDs[i] = t.ID
			topicIndex[t.ID] = i
		}

		themeRows, err := s.db.Query(ctx, `
			SELECT topic_id, theme_id
			FROM topic_themes
			WHERE topic_id = ANY($1)
		`, topicIDs)
		if err != nil {
			return nil, fmt.Errorf("MeetingService.GetByID: fetch topic themes: %w", err)
		}
		defer themeRows.Close()

		for themeRows.Next() {
			var topicID, themeID string
			if err := themeRows.Scan(&topicID, &themeID); err != nil {
				return nil, fmt.Errorf("MeetingService.GetByID: scan topic theme: %w", err)
			}
			if idx, ok := topicIndex[topicID]; ok {
				m.Topics[idx].ThemeIDs = append(m.Topics[idx].ThemeIDs, themeID)
			}
		}
	}

	return &m, nil
}

func (s *MeetingService) GetByChapterID(ctx context.Context, chapterID string, userID string) ([]*Meeting, error) {

	ok, err := db.IsMember(ctx, s.db, chapterID, userID)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.GetByChapterID: %w", err)
	}
	if !ok {
		return nil, db.ErrNotMember
	}

	rows, err := s.db.Query(ctx, `
		SELECT m.id, m.chapter_id, m.scheduled_at, m.duration, m.recurring_group_id, m.status, m.nonce, m.encrypted_blob,
			c.id, c.creator_id, c.is_public, c.encrypted_blob, c.nonce
		FROM meetings m
		JOIN chapters c ON c.id = m.chapter_id
		WHERE m.chapter_id = $1
	`, chapterID)
	if err != nil {
		return nil, fmt.Errorf("MeetingService.GetByChapterID: query: %w", err)
	}
	defer rows.Close()

	meetings := []*Meeting{}
	for rows.Next() {
		var m Meeting
		var ch Chapter
		if err := rows.Scan(&m.ID, &m.ChapterID, &m.ScheduledAt, &m.Duration, &m.RecurringGroupId, &m.Status, &m.Nonce, &m.EncryptedBlob,
			&ch.ID, &ch.CreatorID, &ch.IsPublic, &ch.EncryptedBlob, &ch.Nonce); err != nil {
			return nil, fmt.Errorf("MeetingService.GetByChapterID: scan: %w", err)
		}
		m.Chapter = &ch
		meetings = append(meetings, &m)
	}

	return meetings, nil
}

func (s *MeetingService) UpdateStatus(ctx context.Context, meetingID string, status string) error {
	_, err := s.db.Exec(ctx, `
		UPDATE meetings
		SET status = $1
		WHERE id = $2
	`, status, meetingID)
	if err != nil {
		return fmt.Errorf("MeetingService.UpdateStatus: %w", err)
	}
	return nil
}

func (s *MeetingService) UpdateScheduledAt(ctx context.Context, meetingID string, scheduledAt time.Time) error {
	_, err := s.db.Exec(ctx, `
		UPDATE meetings
		SET scheduled_at = $1
		WHERE id = $2
	`, scheduledAt, meetingID)
	if err != nil {
		return fmt.Errorf("MeetingService.UpdateScheduledAt: %w", err)
	}
	return nil
}

func (s *MeetingService) UpdateDuration(ctx context.Context, meetingID string, duration int) error {
	_, err := s.db.Exec(ctx, `
		UPDATE meetings
		SET duration = $1
		WHERE id = $2
	`, duration, meetingID)
	if err != nil {
		return fmt.Errorf("MeetingService.UpdateDuration: %w", err)
	}
	return nil
}

func (s *MeetingService) UpdateRecurringGroupId(ctx context.Context, meetingID string, recurringGroupId *string) error {
	_, err := s.db.Exec(ctx, `
		UPDATE meetings
		SET recurring_group_id = $1
		WHERE id = $2
	`, recurringGroupId, meetingID)
	if err != nil {
		return fmt.Errorf("MeetingService.UpdateRecurringGroupId: %w", err)
	}
	return nil
}

func (s *MeetingService) UpdateEncryptedData(ctx context.Context, meetingID string, encryptedBlob []byte, nonce []byte) error {
	_, err := s.db.Exec(ctx, `
		UPDATE meetings
		SET encrypted_blob = $1, nonce = $2
		WHERE id = $3
	`, encryptedBlob, nonce, meetingID)
	if err != nil {
		return fmt.Errorf("MeetingService.UpdateEncryptedData: %w", err)
	}
	return nil
}

func (s *MeetingService) Delete(ctx context.Context, meetingID string, userID string) error {

	var m Meeting
	err := s.db.QueryRow(ctx, `
		SELECT m.id, m.chapter_id
		FROM meetings m
		WHERE m.id = $1
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
		return db.ErrNotMember
	}

	_, deleteErr := s.db.Exec(ctx, `DELETE FROM meetings WHERE id = $1`, meetingID)
	if deleteErr != nil {
		return fmt.Errorf("MeetingService.Delete: %w", deleteErr)
	}
	return nil
}
