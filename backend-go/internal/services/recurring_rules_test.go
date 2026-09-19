package services

import (
	"testing"
	"time"
)

func date(year int, month time.Month, day, hour, min int) time.Time {
	return time.Date(year, month, day, hour, min, 0, 0, time.UTC)
}

func TestNextOccurrence(t *testing.T) {
	cases := []struct {
		name          string
		lastScheduled time.Time
		frequency     string
		interval      int
		want          time.Time
	}{
		{
			name:          "MINUTES advances by N minutes",
			lastScheduled: date(2026, time.January, 15, 18, 0),
			frequency:     "MINUTES",
			interval:      90,
			want:          date(2026, time.January, 15, 19, 30),
		},
		{
			name:          "DAILY advances by N days",
			lastScheduled: date(2026, time.January, 15, 18, 0),
			frequency:     "DAILY",
			interval:      10,
			want:          date(2026, time.January, 25, 18, 0),
		},
		{
			name:          "WEEKLY advances by N*7 days",
			lastScheduled: date(2026, time.January, 15, 18, 0),
			frequency:     "WEEKLY",
			interval:      3,
			want:          date(2026, time.February, 5, 18, 0),
		},
		{
			name:          "MONTHLY advances by N months, same date",
			lastScheduled: date(2026, time.January, 15, 18, 0),
			frequency:     "MONTHLY",
			interval:      2,
			want:          date(2026, time.March, 15, 18, 0),
		},
		{
			name:          "unknown frequency falls back to weekly behavior",
			lastScheduled: date(2026, time.January, 15, 18, 0),
			frequency:     "SOME_UNKNOWN_VALUE",
			interval:      2,
			want:          date(2026, time.January, 29, 18, 0),
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := nextOccurrence(tc.lastScheduled, tc.frequency, tc.interval)
			if !got.Equal(tc.want) {
				t.Errorf("nextOccurrence(%v, %q, %d) = %v, want %v", tc.lastScheduled, tc.frequency, tc.interval, got, tc.want)
			}
		})
	}
}

func TestNextMonthlyWeekday(t *testing.T) {
	cases := []struct {
		name          string
		lastScheduled time.Time
		interval      int
		want          time.Time
	}{
		{
			// Jan 1, 2026 is the 1st Thursday of January.
			name:          "1st Thursday of the month, one month later",
			lastScheduled: date(2026, time.January, 1, 18, 0),
			interval:      1,
			want:          date(2026, time.February, 5, 18, 0), // 1st Thursday of February
		},
		{
			// Jan 29, 2026 is the 5th (last) Thursday of January.
			// February 2026 only has 4 Thursdays, so it falls back to the last one.
			name:          "5th occurrence falls back to the last one when the month has fewer",
			lastScheduled: date(2026, time.January, 29, 18, 0),
			interval:      1,
			want:          date(2026, time.February, 26, 18, 0), // last (4th) Thursday of February
		},
		{
			name:          "advances by more than one month",
			lastScheduled: date(2026, time.January, 1, 18, 0),
			interval:      3,
			want:          date(2026, time.April, 2, 18, 0), // 1st Thursday of April
		},
		{
			name:          "preserves time of day",
			lastScheduled: date(2026, time.January, 1, 20, 30),
			interval:      1,
			want:          date(2026, time.February, 5, 20, 30),
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := nextMonthlyWeekday(tc.lastScheduled, tc.interval)
			if !got.Equal(tc.want) {
				t.Errorf("nextMonthlyWeekday(%v, %d) = %v, want %v", tc.lastScheduled, tc.interval, got, tc.want)
			}
			if got.Weekday() != tc.lastScheduled.Weekday() {
				t.Errorf("nextMonthlyWeekday() weekday = %v, want %v", got.Weekday(), tc.lastScheduled.Weekday())
			}
		})
	}
}
