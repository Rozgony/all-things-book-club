package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"
)

// EncryptAESGCM encrypts data with AES-256-GCM using the provided key.
// Returns the nonce (needed for decryption) and the ciphertext.
// The key MUST be exactly 32 bytes for AES-256.
//
// AES-GCM is an authenticated cipher — it detects tampering automatically.
// If someone modifies the ciphertext, decryption fails instead of returning garbage.
func EncryptAESGCM(key []byte, plaintext []byte) (nonce []byte, ciphertext []byte, err error) {
	if len(key) != 32 {
		return nil, nil, fmt.Errorf("crypto.EncryptAESGCM: key must be 32 bytes, got %d", len(key))
	}

	// Create a new cipher block from the key
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, nil, fmt.Errorf("crypto.EncryptAESGCM: %w", err)
	}

	// Create the GCM wrapper
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("crypto.EncryptAESGCM: %w", err)
	}

	// Generate a random nonce
	// For GCM, the standard nonce size is 12 bytes
	nonce = make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("crypto.EncryptAESGCM: failed to generate nonce: %w", err)
	}

	// Encrypt: gcm.Seal() returns ciphertext + authentication tag
	// The nil argument means "no additional authenticated data" (we're not using it)
	ciphertext = gcm.Seal(nil, nonce, plaintext, nil)

	return nonce, ciphertext, nil
}

// DecryptAESGCM decrypts data encrypted with EncryptAESGCM.
// If the ciphertext has been tampered with, it returns an error (authenticated encryption).
func DecryptAESGCM(key []byte, nonce []byte, ciphertext []byte) ([]byte, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("crypto.DecryptAESGCM: key must be 32 bytes, got %d", len(key))
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("crypto.DecryptAESGCM: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("crypto.DecryptAESGCM: %w", err)
	}

	// Open decrypts and verifies the authentication tag
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("crypto.DecryptAESGCM: decryption failed (possibly tampered): %w", err)
	}

	return plaintext, nil
}

// RandomBytes generates n cryptographically random bytes.
// Use this for generating keys, nonces, IDs, etc.
func RandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return nil, fmt.Errorf("crypto.RandomBytes: %w", err)
	}
	return b, nil
}
