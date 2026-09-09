package routes

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5"

	"github.com/all-things-book-club/internal/db"
	"github.com/all-things-book-club/internal/services"
)

var ErrBadRequest = errors.New("bad request")

func badRequest(err error) error {
	return fmt.Errorf("%w: %w", ErrBadRequest, err)
}

func handleError(w http.ResponseWriter, err error) {
	log.Printf("handleError %+v", err)
	switch {
	case errors.Is(err, ErrBadRequest):
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
	case errors.Is(err, pgx.ErrNoRows):
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
	case errors.Is(err, db.ErrNotMember):
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
	case errors.Is(err, services.ErrRecurringRuleExists):
		http.Error(w, `{"error":"chapter already has an active recurring rule"}`, http.StatusConflict)
	default:
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
	}
}
