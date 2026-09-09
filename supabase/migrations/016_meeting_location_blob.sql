-- Add separate encrypted data fields for location to be copied between recurring meetings
ALTER TABLE meetings
  ADD COLUMN location_encrypted_blob BYTEA,
  ADD COLUMN location_nonce BYTEA;

COMMENT ON COLUMN meetings.location_encrypted_blob IS 'Encrypted {videoCallLink, physicalAddress} — can be copied forward on recurring meetings';
COMMENT ON COLUMN meetings.encrypted_blob IS 'Encrypted {discussionNotes} only — per-occurrence, never carried forward';
COMMENT ON COLUMN meetings.nonce IS 'Nonce for encrypted_blob (discussionNotes)';
