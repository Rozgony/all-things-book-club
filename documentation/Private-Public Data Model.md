## Build Prompt: Go E2EE Backend — Data Model

### Context

The current schema has: `User`, `Chapter`, `ChapterMember`, `ChapterInvitation`, `Theme`, `Meeting`, `Topic`, `TopicTheme`, `TopicStatus`, `DiscussionNote`, `MeetingStatus`

---

### Privacy Model

**Binary at the chapter level:**
- `is_public = true` — chapter name, all topics, all themes visible to anyone
- `is_public = false` — nothing attributed to this chapter publicly; optionally donates anonymously to the public corpus

---

### Private Layer (E2EE — server is blind)

```sql
-- Users: unchanged, still keyed to Supabase auth.uid
users (
  id          TEXT PRIMARY KEY,  -- Supabase auth UID
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  timezone    TEXT DEFAULT 'UTC',
  -- Client-generated public key for asymmetric key exchange (see Invite-Plan.md)
  public_key  BYTEA,              -- X25519 public key, plaintext; nullable until first login after rollout
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
)

-- Chapters: name stored plaintext (needed for lookup/display), everything else encrypted
chapters (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,         -- plaintext: needed for invitation flows
  creator_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  is_public        BOOLEAN DEFAULT false, -- the single privacy toggle
  -- E2EE fields: server cannot read these
  encrypted_blob   BYTEA,                 -- AES-256-GCM: description, settings, metadata
  nonce            BYTEA,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
)

-- Chapter members: role stored plaintext (needed for authorization checks)
chapter_members (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  chapter_id  TEXT REFERENCES chapters(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'MEMBER',  -- 'ADMIN' | 'MEMBER'
  joined_at   TIMESTAMPTZ DEFAULT now(),
  -- E2EE: the chapter's symmetric key, encrypted with THIS member's public key
  -- Only this member can decrypt it with their private key
  encrypted_chapter_key  BYTEA NOT NULL,
  key_nonce              BYTEA NOT NULL,
  -- Ephemeral X25519 public key the sender used for the ECDH wrap above
  ephemeral_public_key   BYTEA,
  UNIQUE(user_id, chapter_id)
)

-- Meetings: all content encrypted. scheduled_at stored plaintext for calendar queries.
meetings (
  id                  TEXT PRIMARY KEY,
  chapter_id          TEXT REFERENCES chapters(id) ON DELETE CASCADE,
  scheduled_at        TIMESTAMPTZ NOT NULL,   -- plaintext: needed for ordering/display
  duration_minutes    INT DEFAULT 60,
  status              TEXT DEFAULT 'SCHEDULED', -- plaintext: needed for active meeting logic
  recurring_group_id  TEXT,
  encrypted_blob      BYTEA,                  -- AES-256-GCM: description, notes, settings
  nonce               BYTEA,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
)

-- Topics: all content encrypted. wheel_status plaintext for wheel logic.
-- title/themes live ONLY here for private chapters.
-- For public chapters, a parallel row is written to public_topics (see below).
chapter_topics (
  id              TEXT PRIMARY KEY,
  meeting_id      TEXT REFERENCES meetings(id) ON DELETE CASCADE,
  chapter_id      TEXT NOT NULL,              -- denormalized for efficient chapter-level queries
  created_by_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  wheel_status    TEXT DEFAULT 'PENDING',     -- plaintext: 'PENDING' | 'SELECTED' | 'DISCUSSED'
  encrypted_blob  BYTEA NOT NULL,             -- AES-256-GCM: title, description, themes
  nonce           BYTEA NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Discussion notes: fully encrypted
discussion_notes (
  id              TEXT PRIMARY KEY,
  topic_id        TEXT REFERENCES chapter_topics(id) ON DELETE CASCADE,
  meeting_id      TEXT REFERENCES meetings(id) ON DELETE CASCADE,
  author_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  encrypted_blob  BYTEA NOT NULL,             -- AES-256-GCM: note content
  nonce           BYTEA NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

---

### Public Layer (build later — additive, no changes to private layer)

```sql
-- Global discovery table. Server can read/index/search this freely.
-- chapter_id is NULL for anonymous contributions, set for opted-in public chapters.
public_topics (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  themes            TEXT[],                   -- plaintext theme names
  discussion_count  INT DEFAULT 1,
  chapter_id        TEXT REFERENCES chapters(id) ON DELETE SET NULL,  -- nullable
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(title)                               -- deduplicate; write is an upsert + increment
)
```

**Dual-write rule** (enforced in Go service layer, not DB):
- When a topic is added to a `public` chapter → upsert `public_topics` with `chapter_id` set
- When a topic is added to a `private` chapter → optionally upsert `public_topics` with `chapter_id = NULL`
- When a chapter toggles from public → private → nullify their `chapter_id` on all `public_topics` rows

---

### Key Management (Go client-side flow)

```
New user signs up
  └─► client derives an X25519 keypair from their password (Argon2id)
  └─► public_key stored in users table (plaintext); private key never leaves the client

User creates a chapter
  └─► client generates random 32-byte symmetric chapter key
  └─► encrypts chapter data with chapter key (AES-256-GCM)
  └─► wraps chapter key via ECDH for own public key → stores in chapter_members.encrypted_chapter_key
```

Invitation/handoff flow for granting a new member access to `chapter_members.encrypted_chapter_key` is out of scope for this doc — see `documentation/Invite-Plan.md`.

---

### Go Project Structure (when ready)
- Framework: `net/http` + `chi` router (or `gin` — decide at build time)
- Crypto: `golang.org/x/crypto` (Argon2, ChaCha20-Poly1305 or AES-GCM)
- DB: `pgx/v5` directly (no ORM — schema is managed by raw migrations)
- Auth: validate Supabase JWTs with `golang-jwt/jwt`
- Migrations: `golang-migrate/migrate`