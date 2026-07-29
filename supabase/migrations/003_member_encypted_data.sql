-- Add encrypted profile data to chapter_members (name, avatar, etc.)
ALTER TABLE chapter_members
    ADD COLUMN encrypted_blob BYTEA,
    ADD COLUMN nonce BYTEA; 