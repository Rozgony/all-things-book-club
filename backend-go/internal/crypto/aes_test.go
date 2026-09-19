package crypto

import "testing"

func TestEncryptDecryptAESGCM_RoundTrip(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i)
	}
	plaintext := []byte("a book club's secret discussion notes")

	nonce, ciphertext, err := EncryptAESGCM(key, plaintext)
	if err != nil {
		t.Fatalf("EncryptAESGCM() error = %v", err)
	}

	got, err := DecryptAESGCM(key, nonce, ciphertext)
	if err != nil {
		t.Fatalf("DecryptAESGCM() error = %v", err)
	}
	if string(got) != string(plaintext) {
		t.Errorf("DecryptAESGCM() = %q, want %q", got, plaintext)
	}
}

func TestEncryptAESGCM_RejectsWrongKeySize(t *testing.T) {
	cases := []struct {
		name   string
		keyLen int
	}{
		{"too short", 16},
		{"too long", 64},
		{"empty", 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := EncryptAESGCM(make([]byte, tc.keyLen), []byte("data"))
			if err == nil {
				t.Errorf("EncryptAESGCM() with %d-byte key: expected error, got nil", tc.keyLen)
			}
		})
	}
}

func TestDecryptAESGCM_RejectsWrongKeySize(t *testing.T) {
	_, err := DecryptAESGCM(make([]byte, 16), make([]byte, 12), []byte("ciphertext"))
	if err == nil {
		t.Error("DecryptAESGCM() with 16-byte key: expected error, got nil")
	}
}

func TestDecryptAESGCM_DetectsTampering(t *testing.T) {
	key := make([]byte, 32)
	nonce, ciphertext, err := EncryptAESGCM(key, []byte("original message"))
	if err != nil {
		t.Fatalf("EncryptAESGCM() error = %v", err)
	}

	tampered := make([]byte, len(ciphertext))
	copy(tampered, ciphertext)
	tampered[0] ^= 0xFF // flip a bit

	if _, err := DecryptAESGCM(key, nonce, tampered); err == nil {
		t.Error("DecryptAESGCM() with tampered ciphertext: expected error, got nil")
	}
}

func TestDecryptAESGCM_RejectsWrongKey(t *testing.T) {
	key := make([]byte, 32)
	nonce, ciphertext, err := EncryptAESGCM(key, []byte("original message"))
	if err != nil {
		t.Fatalf("EncryptAESGCM() error = %v", err)
	}

	wrongKey := make([]byte, 32)
	wrongKey[0] = 1
	if _, err := DecryptAESGCM(wrongKey, nonce, ciphertext); err == nil {
		t.Error("DecryptAESGCM() with wrong key: expected error, got nil")
	}
}

func TestEncryptAESGCM_NonceIsRandomPerCall(t *testing.T) {
	key := make([]byte, 32)
	nonce1, _, err := EncryptAESGCM(key, []byte("data"))
	if err != nil {
		t.Fatalf("EncryptAESGCM() error = %v", err)
	}
	nonce2, _, err := EncryptAESGCM(key, []byte("data"))
	if err != nil {
		t.Fatalf("EncryptAESGCM() error = %v", err)
	}
	if string(nonce1) == string(nonce2) {
		t.Error("EncryptAESGCM() produced the same nonce twice — nonces must be unique per encryption")
	}
}

func TestRandomBytes(t *testing.T) {
	b, err := RandomBytes(32)
	if err != nil {
		t.Fatalf("RandomBytes() error = %v", err)
	}
	if len(b) != 32 {
		t.Errorf("RandomBytes(32) returned %d bytes, want 32", len(b))
	}
}

func TestRandomBytes_Unique(t *testing.T) {
	a, err := RandomBytes(16)
	if err != nil {
		t.Fatalf("RandomBytes() error = %v", err)
	}
	b, err := RandomBytes(16)
	if err != nil {
		t.Fatalf("RandomBytes() error = %v", err)
	}
	if string(a) == string(b) {
		t.Error("RandomBytes() produced identical output twice")
	}
}
