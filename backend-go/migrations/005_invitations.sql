-- Ephemeral X25519 public key used by the sender when wrapping this
-- member's copy of the chapter key (see documentation/Invite-Plan.md).
ALTER TABLE chapter_members
    ADD COLUMN ephemeral_public_key BYTEA;

-- Pending/accepted invites for members who may not have an account yet.
-- The chapter key is wrapped with a one-time secret (not a public key)
-- until the invite is accepted, at which point it is re-wrapped with the
-- new member's own X25519 public key and moved into chapter_members.
CREATE TABLE chapter_invitations (
    id                      TEXT PRIMARY KEY,
    chapter_id              TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    inviter_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_email           TEXT NOT NULL,
    invite_token            TEXT NOT NULL UNIQUE,
    encrypted_chapter_key   BYTEA NOT NULL,
    key_nonce               BYTEA NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | EXPIRED
    expires_at              TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one PENDING invite per chapter+email at a time — a partial index
-- (rather than a full UNIQUE constraint) so a chapter can be re-invited
-- after a prior invite expires or is accepted.
CREATE UNIQUE INDEX chapter_invitations_pending_unique
    ON chapter_invitations (chapter_id, invited_email)
    WHERE status = 'PENDING';
