-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE meeting_frequency AS ENUM ('MINUTES', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'MONTHLY_WEEKDAY');
CREATE TYPE chapter_member_role AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE meeting_status AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE topic_status AS ENUM ('PENDING', 'SELECTED', 'DISCUSSED');

-- ============================================================
-- USERS
-- Only the user's ID is known server-side (from Supabase Auth).
-- Profile data (name, avatar, etc.) is encrypted.
-- ============================================================

CREATE TABLE users (
    id                  TEXT PRIMARY KEY,           -- Supabase Auth UID
    key_derivation_salt TEXT,                       -- random salt for client-side Argon2id key derivation
    encrypted_blob      BYTEA,                      -- encrypted profile (name, avatar, etc.)
    nonce               BYTEA                       -- AES-GCM nonce for decryption
);

-- ============================================================
-- CHAPTERS
-- Name/description/createdAt are encrypted. is_public controls discoverability.
-- ============================================================

CREATE TABLE chapters (
    id              TEXT PRIMARY KEY,
    creator_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public       BOOLEAN NOT NULL DEFAULT false,
    encrypted_blob  BYTEA,                          -- encrypted name, description, createdAt
    nonce           BYTEA
);

-- ============================================================
-- CHAPTER MEMBERS
-- Each member holds their own copy of the chapter's symmetric key,
-- wrapped with their own userKey (E2EE key distribution). Name and
-- joinedAt are encrypted.
-- ============================================================

CREATE TABLE chapter_members (
    id                      TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id              TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    role                    chapter_member_role NOT NULL DEFAULT 'MEMBER',
    encrypted_chapter_key   BYTEA,                  -- chapter key wrapped with this member's userKey
    key_nonce               BYTEA,
    encrypted_blob          BYTEA,                  -- encrypted name, joinedAt, etc.
    nonce                   BYTEA,

    UNIQUE(user_id, chapter_id)                     -- a user can only be a member once
);

-- ============================================================
-- CHAPTER INVITATIONS
-- Link-only invites: whoever holds the token can accept, so there is no
-- per-email restriction. The chapter key is wrapped with a one-time secret
-- (never a public key) carried in the invite URL's hash fragment. Rows are
-- hard-deleted on accept, reject, and expiry rather than status-flagged.
-- ============================================================

CREATE TABLE chapter_invitations (
    id                      TEXT PRIMARY KEY,
    chapter_id              TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    inviter_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_token            TEXT NOT NULL UNIQUE,
    encrypted_chapter_key   BYTEA NOT NULL,          -- chapter key wrapped with a one-time secret
    key_nonce               BYTEA NOT NULL,
    inviter_name            TEXT NOT NULL DEFAULT '', -- shown to the invitee before they accept
    expires_at              TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- RECURRING RULES
-- Stores the recurrence pattern for a series of meetings. The application
-- generates meeting rows on demand from this rule; recurring_group_id on
-- meetings references the id here.
-- ============================================================

CREATE TABLE recurring_rules (
    id          TEXT PRIMARY KEY,
    chapter_id  TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    frequency   meeting_frequency NOT NULL,          -- how often it repeats
    interval    INTEGER NOT NULL DEFAULT 1,          -- every N units (e.g. every 2 weeks)
    start_date  TIMESTAMPTZ NOT NULL,                -- first occurrence
    end_date    TIMESTAMPTZ,                         -- NULL = indefinite
    duration    INTEGER NOT NULL DEFAULT 60,          -- minutes per meeting
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEETINGS
-- Metadata (scheduled_at, duration, status) is plaintext — the server
-- needs it for scheduling and real-time status sync. Content is encrypted,
-- split into two blobs: encrypted_blob (per-occurrence, never carried
-- forward) and location_encrypted_blob (copied forward on recurring meetings).
-- ============================================================

CREATE TABLE meetings (
    id                      TEXT PRIMARY KEY,
    chapter_id              TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    scheduled_at            TIMESTAMPTZ NOT NULL,
    duration                INTEGER NOT NULL DEFAULT 60,    -- minutes
    status                  meeting_status NOT NULL DEFAULT 'SCHEDULED',
    recurring_group_id      TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
    encrypted_blob          BYTEA,                  -- encrypted {discussionNotes}, per-occurrence
    nonce                   BYTEA,
    location_encrypted_blob BYTEA,                  -- encrypted {videoCallLink, physicalAddress}, copied forward
    location_nonce          BYTEA
);

-- ============================================================
-- TOPICS
-- Content (including createdAt) is encrypted. status is plaintext so the
-- server can track spin-wheel state across all users in real time.
-- ============================================================

CREATE TABLE topics (
    id              TEXT PRIMARY KEY,
    chapter_id      TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    meeting_id      TEXT REFERENCES meetings(id) ON DELETE CASCADE,
    status          topic_status NOT NULL DEFAULT 'PENDING',
    encrypted_blob  BYTEA,                          -- encrypted title, description, url, createdAt
    nonce           BYTEA
);

-- ============================================================
-- THEMES
-- Chapter-scoped tags for topics. Encrypted so the server can't read theme
-- names, but all themes are fetched at once so the frontend can decrypt
-- and search locally.
-- ============================================================

CREATE TABLE themes (
    id              TEXT PRIMARY KEY,
    chapter_id      TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    encrypted_blob  BYTEA,                          -- encrypted name, createdAt
    nonce           BYTEA
);

-- ============================================================
-- TOPIC THEMES (join table)
-- Many-to-many between topics and themes.
-- ============================================================

CREATE TABLE topic_themes (
    id          TEXT PRIMARY KEY,
    topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    theme_id    TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,

    UNIQUE(topic_id, theme_id)                      -- a theme can only be on a topic once
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX ON chapter_members(chapter_id);
CREATE INDEX ON chapter_members(user_id);
CREATE INDEX ON recurring_rules(chapter_id);
CREATE INDEX ON meetings(chapter_id);
CREATE INDEX ON meetings(scheduled_at);
CREATE INDEX ON topics(chapter_id);
CREATE INDEX ON topics(meeting_id);
CREATE INDEX ON topics(status);
CREATE INDEX ON themes(chapter_id);
CREATE INDEX ON topic_themes(topic_id);
CREATE INDEX ON topic_themes(theme_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- The Go backend connects with the service role key, which bypasses RLS.
-- Enabling it here is defense in depth against accidental/direct client
-- access via PostgREST.
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_themes ENABLE ROW LEVEL SECURITY;
