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
| `key_derivation_salt` | TEXT | - | Random salt for PBKDF2 |
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
Membership records. Each member has their own encrypted copy of the chapter's symmetric key.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | TEXT | PRIMARY KEY | - |
| `user_id` | TEXT | NOT NULL, FK → users(id) | - |
| `chapter_id` | TEXT | NOT NULL, FK → chapters(id) | - |
| `role` | chapter_member_role | NOT NULL, DEFAULT 'MEMBER' | ADMIN or MEMBER |
| `encrypted_chapter_key` | BYTEA | - | Chapter key encrypted for this user's public key |
| `key_nonce` | BYTEA | - | AES-GCM nonce |
| `joined_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | - |
| `encrypted_blob` | BYTEA | -	| Encrypted name, description, etc. |
| `nonce` | BYTEA | - | AES-GCM nonce |

**Unique**: (user_id, chapter_id)

**Indexes**: chapter_id, user_id

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
| `encrypted_blob` | BYTEA | - | Encrypted `{discussionNotes}` — per-occurrence, never carried forward |
| `nonce` | BYTEA | - | AES-GCM nonce for `encrypted_blob` |
| `location_encrypted_blob` | BYTEA | - | Encrypted `{videoCallLink, physicalAddress}` — copied forward on recurring meetings |
| `location_nonce` | BYTEA | - | AES-GCM nonce for `location_encrypted_blob` |
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
| `frequency` | meeting_frequency | NOT NULL | MINUTES, DAILY, WEEKLY, BIWEEKLY, MONTHLY, MONTHLY_WEEKDAY |
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

- **User key derivation**: PBKDF2-SHA256 (600k iterations) from password + `users.key_derivation_salt`
- **Content encryption**: AES-256-GCM (all encrypted_blob columns)
- **Key distribution**: Chapter keys stored in `chapter_members.encrypted_chapter_key`, encrypted with creator's public key
- **Server visibility**: Only plaintext columns (names, IDs, timestamps, status enums) are visible to the server

---

## Migration History

- `001_init.sql` — Initial schema with E2EE (users, chapters, members, meetings, topics, themes, recurring_rules)
- `002_topics_meeting_id.sql` — Added `meeting_id` FK to topics, removed `chapter_id`
