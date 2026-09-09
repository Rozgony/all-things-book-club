package crypto

import (
	"fmt"

	"golang.org/x/crypto/argon2"
)

// DeriveKeyWithSalt derives a key + returns the salt so it can be stored
func DeriveKeyWithSalt(password string) (key []byte, salt []byte, err error) {
	// Generate a random 16-byte salt
	salt, err = RandomBytes(16)
	if err != nil {
		return nil, nil, fmt.Errorf("DeriveKeyWithSalt: failed to generate salt: %w", err)
	}

	// Derive the key using Argon2id
	// time=3, memory=64MB, parallelism=4, keyLen=32 bytes
	key = argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)

	return key, salt, nil
}

// DeriveKeyFromSalt re-derives the same key using a stored salt
func DeriveKeyFromSalt(password string, salt []byte) ([]byte, error) {
	key := argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)
	return key, nil
}