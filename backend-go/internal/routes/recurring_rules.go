package routes

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/all-things-book-club/internal/db"
	"github.com/all-things-book-club/internal/middleware"
	"github.com/all-things-book-club/internal/services"
)

type RecurringRuleHandler struct {
	rules *services.RecurringRuleService
}

func NewRecurringRuleHandler(s *services.RecurringRuleService) *RecurringRuleHandler {
	return &RecurringRuleHandler{rules: s}
}

func (h *RecurringRuleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input services.RecurringRuleInput

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		handleError(w, badRequest(err))
		return
	}

	userID := middleware.UserIDFromContext(r.Context())

	meeting, err := h.rules.Create(r.Context(), input, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(meeting)
}

func (h *RecurringRuleHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	ruleID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	rule, err := h.rules.GetByID(r.Context(), ruleID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rule)
}

func (h *RecurringRuleHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Frequency    *string    `json:"frequency,omitempty"`
		Interval     *int       `json:"interval,omitempty"`
		Duration     *int       `json:"duration,omitempty"`
		EndDate      *time.Time `json:"endDate,omitempty"`
		ClearEndDate bool       `json:"clearEndDate,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		handleError(w, badRequest(err))
		return
	}

	ruleID := chi.URLParam(r, "id")
	userID := middleware.UserIDFromContext(r.Context())

	ok, err := db.IsMemberOfRecurringRule(r.Context(), h.rules.GetDB(), ruleID, userID)
	if err != nil {
		handleError(w, err)
		return
	}
	if !ok {
		handleError(w, db.ErrNotMember)
		return
	}

	if input.Frequency != nil {
		if err := h.rules.UpdateFrequency(r.Context(), ruleID, *input.Frequency); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.Interval != nil {
		if err := h.rules.UpdateInterval(r.Context(), ruleID, *input.Interval); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.Duration != nil {
		if err := h.rules.UpdateDuration(r.Context(), ruleID, *input.Duration); err != nil {
			handleError(w, err)
			return
		}
	}

	if input.ClearEndDate {
		if err := h.rules.UpdateEndDate(r.Context(), ruleID, nil); err != nil {
			handleError(w, err)
			return
		}
	} else if input.EndDate != nil {
		if err := h.rules.UpdateEndDate(r.Context(), ruleID, input.EndDate); err != nil {
			handleError(w, err)
			return
		}
	}

	rule, err := h.rules.GetByID(r.Context(), ruleID, userID)
	if err != nil {
		handleError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rule)
}
