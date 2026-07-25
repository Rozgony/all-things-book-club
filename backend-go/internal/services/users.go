package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserService struct {
	db *pgxpool.Pool
}

func NewUserService(db *pgxpool.Pool) *UserService {
	return &UserService{db: db}
}

type UpdateUserInput struct {
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
}

type User struct {
	ID            string `json:"id"`
	EncryptedBlob []byte `json:"encryptedBlob"`
	Nonce         []byte `json:"nonce"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
}

var ErrUserNotFound = errors.New("User not found")

func (s *UserService) GetByID(ctx context.Context, userID string) (*User, error) {
	var u User
	err := s.db.QueryRow(ctx, `
		SELECT id, encrypted_blob, nonce, created_at, updated_at
		FROM users
		WHERE id = $1
	`, userID).
		Scan(&u.ID, &u.EncryptedBlob, &u.Nonce, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("UserService.GetByID: %w", err)
	}
	return &u, nil
}

func (s *UserService) Update(ctx context.Context, input UpdateUserInput, userIdParam string, userID string) (*User, error) {
	if userIdParam != userID {
		return nil, ErrNotMember
	}

	var u User
	err := s.db.QueryRow(ctx, `
		UPDATE users
		SET encrypted_blob = $1, nonce = $2, updated_at = now()
		WHERE id = $3
		RETURNING id, encrypted_blob, nonce, created_at, updated_at
	`, input.EncryptedBlob, input.Nonce, userID).
		Scan(&u.ID, &u.EncryptedBlob, &u.Nonce, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("UserService.Update: update user: %w", err)
	}

	return &u, nil
}

func (s *UserService) Delete(ctx context.Context, userIdParam string, userID string) error {
	if userIdParam != userID {
		return ErrNotMember
	}
	_, err := s.db.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("UserService.Delete: delete user: %w", err)
	}

	return nil
}
