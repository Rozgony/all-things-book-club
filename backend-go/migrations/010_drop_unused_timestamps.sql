-- Drop timestamp columns that carry no functional dependency (never queried,
-- ordered on, or shown in the UI) to reduce server-visible activity metadata.
ALTER TABLE users DROP COLUMN created_at;
ALTER TABLE users DROP COLUMN updated_at;

ALTER TABLE chapters DROP COLUMN updated_at;

ALTER TABLE chapter_invitations DROP COLUMN created_at;

ALTER TABLE meetings DROP COLUMN created_at;
ALTER TABLE meetings DROP COLUMN updated_at;

ALTER TABLE topics DROP COLUMN updated_at;
