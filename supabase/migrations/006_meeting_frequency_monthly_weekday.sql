-- Add MONTHLY_WEEKDAY to meeting_frequency: recurs on the same Nth weekday of the
-- month as the rule's start_date (e.g. "the first Thursday"), instead of the same
-- calendar day-of-month that plain MONTHLY uses.
ALTER TYPE meeting_frequency ADD VALUE IF NOT EXISTS 'MONTHLY_WEEKDAY';
