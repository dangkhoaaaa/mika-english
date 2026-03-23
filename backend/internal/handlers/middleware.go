package handlers

import (
	"context"
	"net/http"
	"strings"

	"mika-english-backend/internal/security"
)

type contextKey string

const userIDContextKey contextKey = "userID"

func withJWT(secret string, isBlocked func(ctx context.Context, token string) bool, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing token"})
			return
		}
		claims, err := security.ParseToken(secret, parts[1])
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
			return
		}
		if claims.Type != "access" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token type"})
			return
		}
		if isBlocked != nil && isBlocked(r.Context(), parts[1]) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "token is revoked"})
			return
		}
		ctx := context.WithValue(r.Context(), userIDContextKey, claims.UserID)
		next(w, r.WithContext(ctx))
	}
}

func getUserID(ctx context.Context) string {
	val, ok := ctx.Value(userIDContextKey).(string)
	if !ok {
		return ""
	}
	return val
}
