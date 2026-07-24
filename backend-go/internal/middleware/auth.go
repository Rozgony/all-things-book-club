package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// contextKey is an unexported type for context keys in this package.
// Using a custom type (not a plain string) prevents key collisions with
// other packages that also store values in context.
type contextKey string

const UserIDKey contextKey = "userID"

// Claims represents the payload we expect inside a Supabase JWT.
// Supabase puts the user's UUID in the "sub" (subject) field — standard JWT.
// jwt.RegisteredClaims gives us Sub, Exp, Iat, etc. for free.
type Claims struct {
	jwt.RegisteredClaims
}

// RequireAuth is an HTTP middleware — it wraps a handler and runs before it.
// In Go, middleware is just a function that takes an http.Handler and returns one.
//
// Flow: extract Bearer token → validate signature → store userID in context → call next
func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Extract the token from the Authorization header
			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"missing or invalid authorization header"}`, http.StatusUnauthorized)
				return
			}
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			// 2. Parse and validate the token
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
				// Reject tokens signed with anything other than HMAC
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			// 3. Store the userID in the request context so handlers can read it
			ctx := context.WithValue(r.Context(), UserIDKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext retrieves the authenticated user's ID from the request context.
// Returns an empty string if not set (i.e. the request didn't go through RequireAuth).
func UserIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(UserIDKey).(string)
	return id
}
