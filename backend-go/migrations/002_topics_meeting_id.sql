-- Add meeting_id to topics so they can be scoped to a specific meeting.
ALTER TABLE topics
    ADD COLUMN meeting_id TEXT REFERENCES meetings(id) ON DELETE CASCADE;

CREATE INDEX ON topics(meeting_id);
