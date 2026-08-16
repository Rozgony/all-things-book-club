package services

import (
	"context"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/all-things-book-club/internal/crypto"
)

type UserService struct {
	db *pgxpool.Pool
}

func NewUserService(db *pgxpool.Pool) *UserService {
	return &UserService{db: db}
}

type UserInput struct {
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
	// PublicKey is the client-generated X25519 public key used for asymmetric
	// chapter key handoff (invites). Stored plaintext — it's public by design.
	PublicKey     []byte `json:"publicKey"`
}

type User struct {
	ID            string `json:"id"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
	PublicKey     []byte `json:"publicKey"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// GetOrCreateSalt is the frontend's first call on login — it needs the salt
func (s *UserService) GetOrCreateSalt(ctx context.Context, userID string) (string, error) {
	// Try to get existing salt
	var salt string
	err := s.db.QueryRow(ctx, `
		SELECT key_derivation_salt FROM users WHERE id = $1
	`, userID).Scan(&salt)

	// Salt exists — return it
	if err == nil && salt != "" {
		return salt, nil
	}

	// No salt yet — generate one and upsert the user row
	saltBytes, err := crypto.RandomBytes(32)
	if err != nil {
		return "", fmt.Errorf("UserService.GetOrCreateSalt: generate salt: %w", err)
	}
	salt = hex.EncodeToString(saltBytes)

	_, err = s.db.Exec(ctx, `
		INSERT INTO users (id, key_derivation_salt, created_at, updated_at)
		VALUES ($1, $2, now(), now())
		ON CONFLICT (id) DO UPDATE SET key_derivation_salt = EXCLUDED.key_derivation_salt
	`, userID, salt)
	if err != nil {
		return "", fmt.Errorf("UserService.GetOrCreateSalt: upsert: %w", err)
	}

	return salt, nil
}

func (s *UserService) GetByID(ctx context.Context, userID string) (*User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		SELECT id, encrypted_blob, nonce, public_key, created_at, updated_at
		FROM users
		WHERE id = $1
	`, userID).
		Scan(&u.ID, &u.EncryptedBlob, &u.Nonce, &u.PublicKey, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("UserService.GetByID: %w", err)
	}
	return &u, nil
}

// Update writes the encrypted profile blob and/or the X25519 public key.
// PublicKey is only ever written once per device-derivation (idempotent —
// re-deriving the same password + salt always yields the same key).
func (s *UserService) Update(ctx context.Context, input UserInput, userID string) (*User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		UPDATE users
		SET encrypted_blob = COALESCE($1, encrypted_blob),
			nonce = COALESCE($2, nonce),
			public_key = COALESCE($3, public_key),
			updated_at = now()
		WHERE id = $4
		RETURNING id, encrypted_blob, nonce, public_key, created_at, updated_at
	`, input.EncryptedBlob, input.Nonce, input.PublicKey, userID).
		Scan(&u.ID, &u.EncryptedBlob, &u.Nonce, &u.PublicKey, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("UserService.Update: %w", err)
	}
	return &u, nil
}

func (s *UserService) Delete(ctx context.Context, userID string) error {

	_, err := s.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("UserService.Delete: delete user: %w", err)
	}

	return nil
}
