# Database Schema

Reference guide for the book club database. Updated when migrations are added.

## Enums

| Name | Values |
|------|--------|
| `meeting_frequency` | DAILY, WEEKLY, BIWEEKLY, MONTHLY |
| `chapter_member_role` | ADMIN, MEMBER |
| `meeting_status` | SCHEDULED, ACTIVE, COMPLETED, CANCELLED |
| `topic_status` | PENDING, SELECTED, DISCUSSED |

---

## Tables

### `users`
Supabase Auth profiles. Only the user ID is known server-side; profile data is encrypted.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | Supabase Auth UID |
| `key_derivation_salt` | TEXT | - | Random salt for PBKDF2 |
| `public_key` | BYTEA | - | X25519 public key, plaintext; nullable until first login after rollout |
| `encrypted_blob` | BYTEA | - | Encrypted profile (name, avatar, etc.) |
| `nonce` | BYTEA | - | AES-GCM nonce |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

---

### `chapters`
Book clubs. Name/description are encrypted. `is_public` controls discoverability.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `creator_id` | TEXT | NOT NULL, FK → users(id) | - |
| `is_public` | BOOLEAN | NOT NULL, DEFAULT false | - |
| `encrypted_blob` | BYTEA | - | Encrypted name, description, etc. |
| `nonce` | BYTEA | - | AES-GCM nonce |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

**Indexes**: chapter_id (meeting, topics, themes, recurring_rules)

---

### `chapter_members`
Membership records. Each member has their own ECDH-wrapped copy of the chapter's symmetric key.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `user_id` | TEXT | NOT NULL, FK → users(id) | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `role` | chapter_member_role | NOT NULL, DEFAULT 'MEMBER' | ADMIN or MEMBER |
| `encrypted_chapter_key` | BYTEA | - | Chapter key wrapped via ECDH for this user's X25519 public key |
| `key_nonce` | BYTEA | - | AES-GCM nonce |
| `ephemeral_public_key` | BYTEA | - | Sender's one-time X25519 public key used for the ECDH wrap above |
| `joined_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |
| `encrypted_blob` | BYTEA | -	| Encrypted name, description, etc. |
| `nonce` | BYTEA | - | AES-GCM nonce |

**Unique**: (user_id, chapter_id)

**Indexes**: chapter_id, user_id

---

### `chapter_invitations`
Pending/accepted invites for members who don't have an account yet. See `documentation/Invite-Plan.md` for the full flow.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `inviter_id` | TEXT | NOT NULL, FK → users(id) | - |
| `invited_email` | TEXT | NOT NULL | - |
| `invite_token` | TEXT | NOT NULL, UNIQUE | Opaque token in the accept-invite URL |
| `encrypted_chapter_key` | BYTEA | NOT NULL | Chapter key wrapped with a one-time secret (not a public key) |
| `key_nonce` | BYTEA | NOT NULL | AES-GCM nonce |
| `status` | TEXT | NOT NULL, DEFAULT 'PENDING' | PENDING, ACCEPTED, EXPIRED |
| `expires_at` | TIMESTAMPTZ | NOT NULL | - |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

**Unique**: (chapter_id, invited_email) partial index WHERE status = 'PENDING'

---

### `meetings`
Scheduled book club meetings. Metadata (date, duration, status) is plaintext; content is encrypted.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `scheduled_at` | TIMESTAMPTZ | NOT NULL | - |
| `duration` | INTEGER | NOT NULL, DEFAULT 60 | Minutes |
| `status` | meeting_status | NOT NULL, DEFAULT 'SCHEDULED' | SCHEDULED, ACTIVE, COMPLETED, CANCELLED |
| `recurring_group_id` | TEXT | FK → recurring_rules(id), ON DELETE SET NULL | - |
| `encrypted_blob` | BYTEA | - | Encrypted title, notes, etc. |
| `nonce` | BYTEA | - | AES-GCM nonce |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

**Indexes**: chapter_id, scheduled_at

---

### `recurring_rules`
Recurrence patterns for meeting series.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `frequency` | meeting_frequency | NOT NULL | DAILY, WEEKLY, BIWEEKLY, MONTHLY |
| `interval` | INTEGER | NOT NULL, DEFAULT 1 | Every N units (e.g., every 2 weeks) |
| `start_date` | TIMESTAMPTZ | NOT NULL | First occurrence |
| `end_date` | TIMESTAMPTZ | - | NULL = indefinite |
| `duration` | INTEGER | NOT NULL, DEFAULT 60 | Minutes per meeting |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

**Indexes**: chapter_id

---

### `topics`
Discussion topics for the spin wheel. Belongs to a meeting (not a chapter anymore). Content is encrypted; status is plaintext for real-time sync.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `meeting_id` | TEXT | FK → meetings(id) | Topics scoped to meetings |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | For indexing/access control |
| `status` | topic_status | NOT NULL, DEFAULT 'PENDING' | PENDING, SELECTED, DISCUSSED |
| `encrypted_blob` | BYTEA | - | Encrypted title, description, etc. |
| `nonce` | BYTEA | - | AES-GCM nonce |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

**Indexes**: chapter_id, meeting_id, status

---

### `themes`
Chapter-scoped tags for organizing topics. Encrypted so the server can't read theme names.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `encrypted_blob` | BYTEA | - | Encrypted theme name |
| `nonce` | BYTEA | - | AES-GCM nonce |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

**Indexes**: chapter_id

---

### `topic_themes`
Many-to-many join table between topics and themes.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `topic_id` | TEXT | NOT NULL, FK → topics(id) | - |
| `theme_id` | TEXT | NOT NULL, FK → themes(id) | - |

**Unique**: (topic_id, theme_id)

**Indexes**: topic_id, theme_id

---

## E2EE Overview

- **User key derivation**: two keys, both derived from the password and never persisted:
  - PBKDF2-SHA256 (600k iterations) from password + `users.key_derivation_salt` → `userKey`, used only for the profile `encrypted_blob`
  - Argon2id from password + `users.key_derivation_salt` → seed → deterministic X25519 keypair; public half stored plaintext in `users.public_key`
- **Content encryption**: AES-256-GCM (all encrypted_blob columns)
- **Key distribution**: chapter keys are wrapped per-member via ephemeral-sender ECDH (X25519) + HKDF-SHA256 + AES-256-GCM, stored in `chapter_members.encrypted_chapter_key`/`key_nonce`/`ephemeral_public_key`
- **Invites**: existing users are wrapped directly via ECDH; new users get a one-time-secret-wrapped key emailed via a URL hash fragment, then re-wrapped to their real public key on accept — see `documentation/Invite-Plan.md`
- **Server visibility**: Only plaintext columns (names, IDs, timestamps, status enums, public keys) are visible to the server

---

## Migration History

- `001_init.sql` — Initial schema with E2EE (users, chapters, members, meetings, topics, themes, recurring_rules)
- `002_topics_meeting_id.sql` — Added `meeting_id` FK to topics, removed `chapter_id`
- `003_member_encypted_data.sql` — Added `chapter_members.encrypted_blob`/`nonce`
- `004_public_key.sql` — Added `users.public_key` (X25519)
- `005_invitations.sql` — Added `chapter_members.ephemeral_public_key`; created `chapter_invitations`
