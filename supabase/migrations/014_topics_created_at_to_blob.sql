-- topics.created_at moves client-side: the client now includes createdAt
-- inside the topic's encrypted_blob, so the server no longer needs (or
-- sees) it in plaintext. Topics have no server-side ordering that depends
-- on it (unlike themes).
ALTER TABLE topics DROP COLUMN created_at;
