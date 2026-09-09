# Database Schema

Reference guide for the book club database. Updated when migrations are added.

## Enums

| Name | Values |
|------|--------|
| `meeting_frequency` | MINUTES, DAILY, WEEKLY, BIWEEKLY, MONTHLY, MONTHLY_WEEKDAY |
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
| `key_derivation_salt` | TEXT | - | Random salt for Argon2id key derivation |
| `encrypted_blob` | BYTEA | - | Encrypted profile (name, avatar, etc.) |
| `nonce` | BYTEA | - | AES-GCM nonce |

---

### `chapters`
Book clubs. Name/description/createdAt are encrypted. `is_public` controls discoverability.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `creator_id` | TEXT | NOT NULL, FK → users(id) | - |
| `is_public` | BOOLEAN | NOT NULL, DEFAULT false | - |
| `encrypted_blob` | BYTEA | - | Encrypted name, description, createdAt |
| `nonce` | BYTEA | - | AES-GCM nonce |

**Indexes**: chapter_id (meeting, topics, themes, recurring_rules)

---

### `chapter_members`
Membership records. Each member has their own userKey-wrapped copy of the chapter's symmetric key. Name and joinedAt are encrypted.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `user_id` | TEXT | NOT NULL, FK → users(id) | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `role` | chapter_member_role | NOT NULL, DEFAULT 'MEMBER' | ADMIN or MEMBER |
| `encrypted_chapter_key` | BYTEA | - | Chapter key wrapped with the member's `userKey` |
| `key_nonce` | BYTEA | - | AES-GCM nonce |
| `encrypted_blob` | BYTEA | -	| Encrypted name, joinedAt, etc. |
| `nonce` | BYTEA | - | AES-GCM nonce |

**Unique**: (user_id, chapter_id)

**Indexes**: chapter_id, user_id

---

### `chapter_invitations`
Pending invites for members who don't have an account yet — rows are hard-deleted on accept, reject, or expiry rather than status-flagged. Link-only — anyone holding the token can accept. See `documentation/Invite-Plan.md` for the full flow.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `inviter_id` | TEXT | NOT NULL, FK → users(id) | - |
| `invite_token` | TEXT | NOT NULL, UNIQUE | Opaque token in the accept-invite URL |
| `encrypted_chapter_key` | BYTEA | NOT NULL | Chapter key wrapped with a one-time secret (not a public key) |
| `key_nonce` | BYTEA | NOT NULL | AES-GCM nonce |
| `inviter_name` | TEXT | NOT NULL, DEFAULT '' | Inviter's display name shown to the invitee |
| `expires_at` | TIMESTAMPTZ | NOT NULL | - |

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
| `encrypted_blob` | BYTEA | - | Encrypted title, `{discussionNotes}` — per-occurrence, never carried forward |
| `nonce` | BYTEA | - | AES-GCM nonce for `encrypted_blob` |
| `location_encrypted_blob` | BYTEA | - | Encrypted `{videoCallLink, physicalAddress}` — copied forward on recurring meetings |
| `location_nonce` | BYTEA | - | AES-GCM nonce for `location_encrypted_blob` |

**Indexes**: chapter_id, scheduled_at

---

### `recurring_rules`
Recurrence patterns for meeting series.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `frequency` | meeting_frequency | NOT NULL | MINUTES, DAILY, WEEKLY, BIWEEKLY, MONTHLY, MONTHLY_WEEKDAY |
| `interval` | INTEGER | NOT NULL, DEFAULT 1 | Every N units (e.g., every 2 weeks) |
| `start_date` | TIMESTAMPTZ | NOT NULL | First occurrence |
| `end_date` | TIMESTAMPTZ | - | NULL = indefinite |
| `duration` | INTEGER | NOT NULL, DEFAULT 60 | Minutes per meeting |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |

**Indexes**: chapter_id

---

### `topics`
Discussion topics for the spin wheel. Belongs to a chapter and can optionally be scoped to a meeting. Content (including createdAt) is encrypted; status is plaintext for real-time sync.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `meeting_id` | TEXT | FK → meetings(id) | Optional meeting scope |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | Chapter ownership/access control |
| `status` | topic_status | NOT NULL, DEFAULT 'PENDING' | PENDING, SELECTED, DISCUSSED |
| `encrypted_blob` | BYTEA | - | Encrypted title, description, createdAt, etc. |
| `nonce` | BYTEA | - | AES-GCM nonce |

**Indexes**: chapter_id, meeting_id, status

---

### `themes`
Chapter-scoped tags for organizing topics. Content (including createdAt) is encrypted so the server can't read theme names.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `encrypted_blob` | BYTEA | - | Encrypted theme name, createdAt |
| `nonce` | BYTEA | - | AES-GCM nonce |

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

- **User key derivation**: a single `userKey` derived client-side from password + `users.key_derivation_salt` using Argon2id
- **Content encryption**: AES-256-GCM for encrypted data blobs (`encrypted_blob` + `nonce` pairs)
- **Key distribution**: chapter keys are wrapped per-member with that member's `userKey` and stored in `chapter_members.encrypted_chapter_key` + `key_nonce`
- **Invites**: invites carry a one-time-secret-wrapped chapter key; the secret is put in the URL hash fragment and never sent to the server. On accept, the client unwraps with the secret and re-wraps with the invitee's `userKey`
- **Server visibility**: only plaintext metadata (IDs, timestamps, enum/status values, inviter name, and wrapped key ciphertext) is visible server-side

---

## RLS Overview

- Row Level Security is enabled on all application tables via `007_enable_rls.sql`
- Backend requests use the Supabase service role key, which bypasses RLS
- RLS remains useful as defense in depth against accidental/direct client access to PostgREST

---

## Migration History

- `001_init.sql` — Initial schema with E2EE (users, chapters, members, meetings, topics, themes, recurring_rules)
- `002_topics_meeting_id.sql` — Added `meeting_id` FK to topics
- `003_member_encypted_data.sql` — Added `chapter_members.encrypted_blob`/`nonce`
- `004_public_key.sql` — Added `users.public_key` (X25519)
- `005_invitations.sql` — Added `chapter_members.ephemeral_public_key`; created `chapter_invitations`
- `006_simplify_keys.sql` — Removed `users.public_key` and `chapter_members.ephemeral_public_key`; moved to symmetric key-wrap model
- `007_enable_rls.sql` — Enabled RLS on all application tables
- `008_remove_invited_email.sql` — Removed `invited_email` column; invites are link-only with no per-email restriction
- `009_add_inviter_name.sql` — Added `inviter_name` column to store inviter's display name
- `010_drop_unused_timestamps.sql` — Dropped `created_at`/`updated_at` columns that were never queried, ordered on, or displayed (`users.created_at`/`updated_at`, `chapters.updated_at`, `chapter_invitations.created_at`, `meetings.created_at`/`updated_at`, `topics.updated_at`)
- `011_chapters_created_at_to_blob.sql` — Dropped `chapters.created_at`; the client now stores it inside `encrypted_blob` and sorts "my chapters" client-side after decrypting
- `012_chapter_members_joined_at_to_blob.sql` — Dropped `chapter_members.joined_at`; the client now sets it (encrypted) at invite-accept time and sorts the member list client-side after decrypting
- `013_drop_invite_status.sql` — Dropped `chapter_invitations.status`; invites are now hard-deleted on accept, reject, and expiry instead of being status-flagged, so every remaining row is implicitly PENDING
- `014_topics_created_at_to_blob.sql` — Dropped `topics.created_at`; the client now stores it inside `encrypted_blob` (topics have no server-side ordering that depends on it)
- `015_themes_created_at_to_blob.sql` — Dropped `themes.created_at`; the client now stores it inside `encrypted_blob` and sorts the autocomplete list client-side after decrypting (replaces the old `ORDER BY created_at ASC`)