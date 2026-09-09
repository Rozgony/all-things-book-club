package services

import (
	"context"
	"fmt"

	"github.com/all-things-book-club/internal/crypto"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MemberService struct {
	db *pgxpool.Pool
}

// NewMemberService constructs a MemberService.
// This pattern (New<Thing>) is Go's convention for constructors.
func NewMemberService(db *pgxpool.Pool) *MemberService {
	return &MemberService{db: db}
}

type ChapterMemberRole string

const (
	RoleAdmin  ChapterMemberRole = "ADMIN"
	RoleMember ChapterMemberRole = "MEMBER"
)

// MemberInput is the data the client sends when creating a member.
// The server stores name plaintext, and the encrypted blob opaquely.
type MemberInput struct {
	EncryptedBlob []byte            `json:"encryptedBlob"`
	Nonce         []byte            `json:"nonce"`
	UserId        string            `json:"userId"`
	ChapterId     string            `json:"chapterId"`
	Role          ChapterMemberRole `json:"role"`
	// EncryptedChapterKey is the chapter's symmetric key, ECDH-wrapped for this member's X25519 public key.
	// Only this member can unwrap it using their private key (never sent to the server).
	EncryptedChapterKey []byte `json:"encryptedChapterKey"`
	KeyNonce            []byte `json:"keyNonce"`
}

type ChapterMember struct {
	ID                  string            `json:"id"`
	UserId              string            `json:"userId"`
	ChapterId           string            `json:"chapterId"`
	Role                ChapterMemberRole `json:"role"`
	EncryptedChapterKey []byte            `json:"encryptedChapterKey"`
	KeyNonce            []byte            `json:"keyNonce"`
	EncryptedBlob       []byte            `json:"encryptedBlob"`
	Nonce               []byte            `json:"nonce"`
}

func (s *MemberService) Create(ctx context.Context, input MemberInput) (*ChapterMember, error) {
	memberID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("MemberService.Create: generate member ID: %w", err)
	}

	var cm ChapterMember
	err = s.db.QueryRow(ctx, `
		INSERT INTO chapter_members 
			(id, user_id, chapter_id, role, encrypted_blob, nonce, encrypted_chapter_key, key_nonce)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, chapter_id, role
	`, memberID, input.UserId, input.ChapterId, input.Role, input.EncryptedBlob, input.Nonce, input.EncryptedChapterKey, input.KeyNonce).
		Scan(&cm.ID, &cm.UserId, &cm.ChapterId, &cm.Role)
	if err != nil {
		return nil, fmt.Errorf("MemberService.Create: insert member: %w", err)
	}

	return &cm, nil
}

// UpdateEncryptedBlob updates the member's encrypted name blob.
// Only the member themselves (matching userID) can update their own blob.
func (s *MemberService) UpdateEncryptedBlob(ctx context.Context, memberID string, encryptedBlob []byte, nonce []byte, userID string) (*ChapterMember, error) {
	var cm ChapterMember
	err := s.db.QueryRow(ctx, `
		UPDATE chapter_members
		SET encrypted_blob = $1, nonce = $2
		WHERE id = $3 AND user_id = $4
		RETURNING id, user_id, chapter_id, role, encrypted_chapter_key, key_nonce, encrypted_blob, nonce
	`, encryptedBlob, nonce, memberID, userID).
		Scan(&cm.ID, &cm.UserId, &cm.ChapterId, &cm.Role, &cm.EncryptedChapterKey, &cm.KeyNonce, &cm.EncryptedBlob, &cm.Nonce)
	if err != nil {
		return nil, fmt.Errorf("MemberService.UpdateEncryptedBlob: %w", err)
	}
	return &cm, nil
}
