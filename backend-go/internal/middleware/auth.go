package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"

type Claims struct {
	jwt.RegisteredClaims
}

// NewRequireAuth fetches the JWKS from Supabase at startup and returns
// a middleware that validates JWTs against it. This handles both HS256
// (anon/service keys) and ES256 (user session tokens) automatically.
func NewRequireAuth(supabaseURL string) (func(http.Handler) http.Handler, error) {
	jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", supabaseURL)

	jwks, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS from %s: %w", jwksURL, err)
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"missing or invalid authorization header"}`, http.StatusUnauthorized)
				return
			}
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, jwks.Keyfunc)
			if err != nil || !token.Valid {
				log.Printf("JWT error: %v", err)
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}, nil
}


// UserIDFromContext retrieves the authenticated user's ID from the request context.
// Returns an empty string if not set (i.e. the request didn't go through RequireAuth).
func UserIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(UserIDKey).(string)
	return id
}
