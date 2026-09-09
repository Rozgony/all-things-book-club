-- Add the client-generated X25519 public key used for asymmetric chapter
-- key handoff (invites). Nullable: existing rows have none until next login.
ALTER TABLE users
    ADD COLUMN public_key BYTEA;
