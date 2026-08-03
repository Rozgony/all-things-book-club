-- Add MINUTES to meeting_frequency for testing short recurrence intervals.
-- BIWEEKLY is intentionally left in place (removed from the UI, not from existing data).
ALTER TYPE meeting_frequency ADD VALUE IF NOT EXISTS 'MINUTES';
