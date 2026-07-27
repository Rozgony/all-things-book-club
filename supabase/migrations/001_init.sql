-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE meeting_frequency AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

CREATE TYPE chapter_member_role AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE meeting_status AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE topic_status AS ENUM ('PENDING', 'SELECTED', 'DISCUSSED');

-- ============================================================
-- USERS
-- Profile data is encrypted. The server only knows the user's ID (from Supabase Auth).
-- ============================================================

CREATE TABLE users (
    id              TEXT PRIMARY KEY,           -- Supabase Auth UID
    encrypted_blob  BYTEA,                      -- encrypted profile (name, avatar, etc.)
    nonce           BYTEA,                      -- AES-GCM nonce for decryption
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CHAPTERS
-- Name/description are encrypted. is_public controls discoverability.
-- ============================================================

CREATE TABLE chapters (
    id              TEXT PRIMARY KEY,
    creator_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public       BOOLEAN NOT NULL DEFAULT false,
    encrypted_blob  BYTEA,                      -- encrypted name, description, etc.
    nonce           BYTEA,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CHAPTER MEMBERS
-- Each member stores their own copy of the chapter key, encrypted
-- with their public key. This is the E2EE key distribution mechanism.
-- ============================================================

CREATE TABLE chapter_members (
    id                      TEXT PRIMARY KEY,
    user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id              TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    role                    chapter_member_role NOT NULL DEFAULT 'MEMBER',
    encrypted_chapter_key   BYTEA,              -- chapter's symmetric key, encrypted for this user
    key_nonce               BYTEA,
    joined_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(user_id, chapter_id)                 -- a user can only be a member once
);

-- ============================================================
-- RECURRING RULES
-- Stores the recurrence pattern for a series of meetings.
-- The application generates meeting rows on demand from this rule.
-- recurring_group_id on meetings references the id here.
-- ============================================================

CREATE TABLE recurring_rules (
    id          TEXT PRIMARY KEY,
    chapter_id  TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    frequency   meeting_frequency NOT NULL,     -- how often it repeats
    interval    INTEGER NOT NULL DEFAULT 1,     -- every N units (e.g. every 2 weeks)
    start_date  TIMESTAMPTZ NOT NULL,           -- first occurrence
    end_date    TIMESTAMPTZ,                    -- NULL = indefinite
    duration    INTEGER NOT NULL DEFAULT 60,    -- minutes per meeting
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MEETINGS
-- Metadata (scheduled_at, duration, status) is plaintext — the server
-- needs it for scheduling. Everything else is encrypted.
-- ============================================================

CREATE TABLE meetings (
    id                  TEXT PRIMARY KEY,
    chapter_id          TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    duration            INTEGER NOT NULL DEFAULT 60,    -- minutes
    status              meeting_status NOT NULL DEFAULT 'SCHEDULED',
    recurring_group_id  TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
    encrypted_blob      BYTEA,                          -- encrypted title, notes, etc.
    nonce               BYTEA,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TOPICS
-- Content is encrypted. status is plaintext so the server can
-- track wheel state across all users in a meeting in real time.
-- ============================================================

CREATE TABLE topics (
    id              TEXT PRIMARY KEY,
    chapter_id      TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    status          topic_status NOT NULL DEFAULT 'PENDING',
    encrypted_blob  BYTEA,
    nonce           BYTEA,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- THEMES
-- Chapter-scoped tags for topics. Encrypted so the server can't
-- read theme names, but all themes are fetched at once so the
-- frontend can decrypt and search locally.
-- ============================================================

CREATE TABLE themes (
    id              TEXT PRIMARY KEY,
    chapter_id      TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    encrypted_blob  BYTEA,
    nonce           BYTEA,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TOPIC THEMES (join table)
-- Many-to-many between topics and themes.
-- ============================================================

CREATE TABLE topic_themes (
    id          TEXT PRIMARY KEY,
    topic_id    TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    theme_id    TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,

    UNIQUE(topic_id, theme_id)                  -- a theme can only be on a topic once
);

-- ============================================================
-- INDEXES
-- Speed up the most common queries.
-- ============================================================

CREATE INDEX ON recurring_rules(chapter_id);
CREATE INDEX ON chapter_members(chapter_id);
CREATE INDEX ON chapter_members(user_id);
CREATE INDEX ON meetings(chapter_id);
CREATE INDEX ON meetings(scheduled_at);
CREATE INDEX ON topics(chapter_id);
CREATE INDEX ON topics(status);
CREATE INDEX ON themes(chapter_id);
CREATE INDEX ON topic_themes(topic_id);
CREATE INDEX ON topic_themes(theme_id);
