package config

import "testing"

func TestGetEnv_ReturnsSetValue(t *testing.T) {
	t.Setenv("TEST_GET_ENV_VAR", "actual-value")

	if got := getEnv("TEST_GET_ENV_VAR", "fallback"); got != "actual-value" {
		t.Errorf("getEnv() = %q, want %q", got, "actual-value")
	}
}

func TestGetEnv_ReturnsFallbackWhenUnset(t *testing.T) {
	if got := getEnv("TEST_GET_ENV_VAR_UNSET", "fallback"); got != "fallback" {
		t.Errorf("getEnv() = %q, want %q", got, "fallback")
	}
}

func TestGetEnv_ReturnsFallbackWhenEmpty(t *testing.T) {
	t.Setenv("TEST_GET_ENV_VAR_EMPTY", "")

	if got := getEnv("TEST_GET_ENV_VAR_EMPTY", "fallback"); got != "fallback" {
		t.Errorf("getEnv() = %q, want %q", got, "fallback")
	}
}

func TestRequireEnv_ReturnsSetValue(t *testing.T) {
	t.Setenv("TEST_REQUIRE_ENV_VAR", "actual-value")

	if got := requireEnv("TEST_REQUIRE_ENV_VAR"); got != "actual-value" {
		t.Errorf("requireEnv() = %q, want %q", got, "actual-value")
	}
}

// Note: requireEnv's missing-variable path calls log.Fatalf (os.Exit), which
// can't be exercised in-process — it would need a subprocess test. Not worth
// the complexity for a one-line fatal-log wrapper.
