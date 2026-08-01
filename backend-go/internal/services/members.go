package services

import (
	"context"
	"fmt"
	"time"

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
	EncryptedBlob []byte 				`json:"encryptedBlob"`
	Nonce         []byte 				`json:"nonce"`
	UserId         string   			`json:"userId"`
	ChapterId      string   			`json:"chapterId"`
	Role      	   ChapterMemberRole   	`json:"role"`
	JoinedAt       time.Time   			`json:"joinedAt"`
	// EncryptedChapterKey is the chapter's symmetric key, ECDH-wrapped for this member's X25519 public key.
	// Only this member can unwrap it using their private key (never sent to the server).
	EncryptedChapterKey []byte `json:"encryptedChapterKey"`
	KeyNonce            []byte `json:"keyNonce"`
	// EphemeralPublicKey is the one-time sender key used for the ECDH wrap above.
	EphemeralPublicKey  []byte `json:"ephemeralPublicKey"`
}

type ChapterMember struct {
	ID 						string 				`json:"id"`
	UserId      			string   			`json:"userId"`
	ChapterId   			string   			`json:"chapterId"`
	Role      	   			ChapterMemberRole   `json:"role"`
	JoinedAt       			time.Time   		`json:"joinedAt"`
	EncryptedChapterKey		[]byte				`json:"encryptedChapterKey"`
	KeyNonce				[]byte				`json:"keyNonce"`
	EphemeralPublicKey		[]byte				`json:"ephemeralPublicKey"`
}

func (s *MemberService) Create(ctx context.Context, input MemberInput) (*ChapterMember, error) {
	memberID, err := crypto.GenerateID()
	if err != nil {
		return nil, fmt.Errorf("MemberService.Create: generate member ID: %w", err)
	}

	var cm ChapterMember
	err = s.db.QueryRow(ctx, `
		INSERT INTO chapter_members (id, user_id, chapter_id, role, joined_at, encrypted_blob, nonce, encrypted_chapter_key, key_nonce, ephemeral_public_key)
		VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9)
		RETURNING id, user_id, chapter_id, role, joined_at
	`, memberID, input.UserId, input.ChapterId, input.Role, input.EncryptedBlob, input.Nonce, input.EncryptedChapterKey, input.KeyNonce, input.EphemeralPublicKey).
		Scan(&cm.ID, &cm.UserId, &cm.ChapterId, &cm.Role, &cm.JoinedAt)
	if err != nil {
		return nil, fmt.Errorf("MemberService.Create: insert member: %w", err)
	}

	return &cm, nil
}