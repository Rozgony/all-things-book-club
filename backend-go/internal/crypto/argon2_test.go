package crypto

import "testing"

func TestDeriveKeyWithSalt(t *testing.T) {
	key, salt, err := DeriveKeyWithSalt("correct horse battery staple")
	if err != nil {
		t.Fatalf("DeriveKeyWithSalt() error = %v", err)
	}
	if len(key) != 32 {
		t.Errorf("key length = %d, want 32", len(key))
	}
	if len(salt) != 16 {
		t.Errorf("salt length = %d, want 16", len(salt))
	}
}

func TestDeriveKeyWithSalt_DifferentSaltsPerCall(t *testing.T) {
	_, salt1, err := DeriveKeyWithSalt("password")
	if err != nil {
		t.Fatalf("DeriveKeyWithSalt() error = %v", err)
	}
	_, salt2, err := DeriveKeyWithSalt("password")
	if err != nil {
		t.Fatalf("DeriveKeyWithSalt() error = %v", err)
	}
	if string(salt1) == string(salt2) {
		t.Error("DeriveKeyWithSalt() produced the same salt twice")
	}
}

func TestDeriveKeyFromSalt_MatchesOriginalDerivation(t *testing.T) {
	password := "correct horse battery staple"
	key, salt, err := DeriveKeyWithSalt(password)
	if err != nil {
		t.Fatalf("DeriveKeyWithSalt() error = %v", err)
	}

	rederived, err := DeriveKeyFromSalt(password, salt)
	if err != nil {
		t.Fatalf("DeriveKeyFromSalt() error = %v", err)
	}
	if string(rederived) != string(key) {
		t.Error("DeriveKeyFromSalt() did not reproduce the original key from the same password + salt")
	}
}

func TestDeriveKeyFromSalt_DifferentPasswordsProduceDifferentKeys(t *testing.T) {
	salt := []byte("0123456789abcdef")

	key1, err := DeriveKeyFromSalt("password-one", salt)
	if err != nil {
		t.Fatalf("DeriveKeyFromSalt() error = %v", err)
	}
	key2, err := DeriveKeyFromSalt("password-two", salt)
	if err != nil {
		t.Fatalf("DeriveKeyFromSalt() error = %v", err)
	}
	if string(key1) == string(key2) {
		t.Error("DeriveKeyFromSalt() produced the same key for two different passwords")
	}
}

func TestDeriveKeyFromSalt_DifferentSaltsProduceDifferentKeys(t *testing.T) {
	key1, err := DeriveKeyFromSalt("password", []byte("0123456789abcdef"))
	if err != nil {
		t.Fatalf("DeriveKeyFromSalt() error = %v", err)
	}
	key2, err := DeriveKeyFromSalt("password", []byte("fedcba9876543210"))
	if err != nil {
		t.Fatalf("DeriveKeyFromSalt() error = %v", err)
	}
	if string(key1) == string(key2) {
		t.Error("DeriveKeyFromSalt() produced the same key for two different salts")
	}
}
