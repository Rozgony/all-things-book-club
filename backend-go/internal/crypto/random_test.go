package crypto

import (
	"encoding/hex"
	"testing"
)

func TestGenerateID(t *testing.T) {
	id, err := GenerateID()
	if err != nil {
		t.Fatalf("GenerateID() error = %v", err)
	}
	// 12 random bytes, hex-encoded, is 24 characters.
	if len(id) != 24 {
		t.Errorf("GenerateID() length = %d, want 24", len(id))
	}
	if _, err := hex.DecodeString(id); err != nil {
		t.Errorf("GenerateID() = %q is not valid hex: %v", id, err)
	}
}

func TestGenerateID_Unique(t *testing.T) {
	id1, err := GenerateID()
	if err != nil {
		t.Fatalf("GenerateID() error = %v", err)
	}
	id2, err := GenerateID()
	if err != nil {
		t.Fatalf("GenerateID() error = %v", err)
	}
	if id1 == id2 {
		t.Error("GenerateID() produced the same ID twice")
	}
}
