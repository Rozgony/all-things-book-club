# Invite Plan: X25519 E2EE Key Handoff

Replace the current symmetric chapter-key wrapping (Argon2id `userKey` → AES-GCM) with asymmetric ECDH wrapping (Argon2id → X25519 keypair). A one-time invite secret embedded in the email link's `#hash` fragment hands off the chapter key to new users fully asynchronously — the inviter does nothing after clicking "send."

> **Note:** `enable_confirmations = false` is already set in `supabase/config.toml`, so `supabase.auth.signUp()` returns an active session immediately. The accept-invite flow is unblocked without a separate confirmation email.

---

## Key Architecture

```
password + salt → Argon2id → 32-byte seed → X25519 keypair
                                                   │
                              ┌────────────────────┘
                              │  (ephemeral ECDH wrap)
                              ▼
                         chapterKey  ←── AES-256-GCM ──► meetings, topics, themes
```

- **X25519 keypair** — derived deterministically from password via Argon2id. Same password + salt = same keypair on any device. Private key stays in memory only (re-derived each login, never persisted).
- **Ephemeral sender ECDH** — each wrap uses a fresh random keypair as the sender. Prevents linking `chapter_members` rows to the same inviter. Follows the `age` encryption tool pattern.
- **Argon2id `userKey` kept** — still used for user profile blob encryption only. Coexists without migration.
- **Invite secret** — 32 random bytes generated client-side, never sent to the server. Travels only in the `#hash` fragment of the invite email link. Used once to transport the chapter key to the invitee; discarded after accept.

---

## Checklist

### Phase 0 — Crypto Foundation

- [x] **0.1** Install `@noble/curves` and `@noble/hashes`
  - `@noble/curves` — X25519 key generation and ECDH (Web Crypto can't import raw bytes as X25519 private key)
  - `@noble/hashes` — Argon2id (memory-hard KDF, stronger than PBKDF2 for keypair derivation)
  - Both are small, audited, tree-shakable; same library family

- [x] **0.2** Add to `frontend/src/lib/crypto.ts`:
  - `deriveX25519KeyPair(password, salt)` — `Argon2id(password, salt + "x25519", { m: 19456, t: 2, p: 1 })` → 32-byte seed → `{ privateKey: Uint8Array, publicKey: Uint8Array }` via `@noble/curves/x25519`. Parameters follow OWASP minimums (19 MiB memory, 2 iterations, 1 parallelism). The `"x25519"` label appended to the salt provides domain separation from the Argon2id `userKey` derivation which uses the same salt.
  - `wrapChapterKeyForRecipient(chapterKey, recipientPublicKey)` — generate ephemeral X25519 keypair; `ECDH(ephPriv, recipientPub)` → sharedSecret; `HKDF-SHA256(IKM=sharedSecret, salt=ephPub ‖ recipientPub, info="atbc-chapter-key-v1")` → wrapKey (following the `age` spec: shared secret is the IKM, concatenated public keys are the HKDF **salt**, label is the HKDF **info**); `AES-256-GCM(chapterKey_bytes, wrapKey)`; returns `{ encryptedChapterKey, keyNonce, ephemeralPublicKey }`
  - `unwrapChapterKey(encryptedChapterKey, keyNonce, ephemeralPublicKey, myPrivateKey)` — inverse: `ECDH(myPrivKey, ephPub)` → same wrapKey → AES-GCM decrypt → import as `CryptoKey`
  - `wrapChapterKeyWithSecret(chapterKey, inviteSecret)` — import `inviteSecret` as raw AES-GCM key via `crypto.subtle.importKey('raw', inviteSecret, 'AES-GCM', ...)`, then AES-256-GCM wrap; returns `{ encryptedChapterKey, keyNonce }` — invite links only
  - `unwrapChapterKeyWithSecret(encryptedChapterKey, keyNonce, inviteSecret)` → raw `Uint8Array` chapter key bytes

- [x] **0.3** Update `frontend/src/lib/keyStore.ts`:
  - Add `setPrivateKey(key: Uint8Array)`, `getPrivateKey(): Uint8Array`, `clearPrivateKey()` — in-memory only, never persisted (re-derived from password each login)
  - Update `getAndSetChapterKey` signature: add `ephemeralPublicKey` param, switch from `decryptChapterKey(userKey)` to `unwrapChapterKey(myPrivateKey)`

---

### Phase 1 — Schema Migrations

- [x] **1.1** `supabase/migrations/004_public_key.sql` + `backend-go/migrations/004_public_key.sql`:
  ```sql
  ALTER TABLE users ADD COLUMN public_key BYTEA;
  ```
  Nullable — existing rows stay valid; app enforces presence on new logins.

- [x] **1.2** `supabase/migrations/005_invitations.sql` + `backend-go/migrations/005_invitations.sql`:
  ```sql
  ALTER TABLE chapter_members ADD COLUMN ephemeral_public_key BYTEA;

  CREATE TABLE chapter_invitations (
    id                    TEXT PRIMARY KEY,
    chapter_id            TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    inviter_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_email         TEXT NOT NULL,
    invite_token          TEXT NOT NULL UNIQUE,
    encrypted_chapter_key BYTEA NOT NULL,
    key_nonce             BYTEA NOT NULL,
    status                TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | ACCEPTED | EXPIRED
    expires_at            TIMESTAMPTZ NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Partial index: only one PENDING invite per chapter per email
  CREATE UNIQUE INDEX chapter_invitations_pending_unique
    ON chapter_invitations (chapter_id, invited_email)
    WHERE status = 'PENDING';
  ```
  > The partial unique index (not a full constraint) allows re-inviting after an invite expires or is accepted without INSERT conflicts.

---

### Phase 2 — Backend API (Go)

- [x] **2.1** Extend `backend-go/internal/services/users.go` — add `PublicKey []byte` to `UserInput` struct; update `Update()` SQL to also write `public_key`
- [x] **2.2** Extend `PATCH /api/users/me` response — add `publicKey` to `User` struct and SELECT
- [x] **2.3** ~~Add `GET /api/users/by-email?email=X`~~ — **removed**. The shared-chapter guard made this endpoint useless for the invite case (invitee has no shared chapter yet), and relaxing the guard introduces user enumeration. All invites now use the single invite-secret flow regardless of whether the invitee already has an account (see Phase 5).
- [x] **2.4** Create `backend-go/internal/routes/invites.go` + `backend-go/internal/services/invites.go`:
  - `POST /api/chapters/{id}/invites` — ADMIN only; body: `{ invitedEmail, encryptedChapterKey, keyNonce, inviteSecretBase64url }`; backend generates `invite_token` (32 random bytes, hex), constructs invite URL as `APP_URL + "/accept-invite?token=" + token + "#" + inviteSecretBase64url`, sends email via Supabase SMTP, **does not persist `inviteSecretBase64url`** (only `encryptedChapterKey` and `keyNonce` are stored in DB); sets `expires_at = now() + 7 days`; returns 201. **Trust boundary note:** the server sees `inviteSecretBase64url` in-memory during email dispatch and could decrypt the chapter key — this is a concession for the invite flow specifically and should be documented as such. The server is trusted for availability; the ongoing E2EE model (post-accept) remains server-blind.
  - `GET /api/invites/{token}` — **no auth required** (invitee may not have an account yet); returns `{ inviterEmail, encryptedChapterKey, keyNonce, expiresAt, status }`; apply rate limiting (e.g. 20 req/min per IP)
  - `POST /api/invites/{token}/accept` — auth required; body: `{ encryptedChapterKey, keyNonce, ephemeralPublicKey }`; use `crypto/subtle.ConstantTimeCompare` when comparing the token to prevent timing side-channels; atomically verifies token is PENDING + not expired + authed user's email matches `invited_email`; inserts `chapter_members` row; marks invite ACCEPTED; returns 201
- [x] **2.5** Extend `backend-go/internal/services/members.go` — add `EphemeralPublicKey []byte` to `MemberInput`; include in INSERT SQL

---

### Phase 3 — Login Key Setup

- [x] **3.1** Update `frontend/src/pages/Home/LoginPage.tsx` — after existing Argon2id step, add in parallel:
  1. `deriveX25519KeyPair(password, salt)` → store `privateKey` in keyStore (memory only)
  2. Fetch profile; if `publicKey` is null → `PATCH /api/users/me` with `publicKey` (first-login upload)
- [x] **3.2** Add `frontend/src/pages/Home/SignUpPage.tsx` — for new chapter founders (no invite):
  - `supabase.auth.signUp({ email, password })` → `GET /api/users/me/salt` → derive keypair → `PATCH /api/users/me` with `publicKey` → redirect to profile

---

### Phase 4 — Accept Invite Page

- [x] **4.1** Create `frontend/src/pages/Invite/AcceptInvitePage.tsx` and wire route `/accept-invite` in `App.tsx`
- [x] **4.2** On mount: extract `token` from `?token=` query param, `inviteSecret` from `window.location.hash` (base64url decode → `Uint8Array`) — hash fragment is never sent to the server
- [x] **4.3** `GET /api/invites/{token}` → display: `"[inviterEmail] has invited you to an All Things Book Club chapter."`
- [x] **4.4** If not logged in: show sign-up form (email field for convenience — not pre-filled from server since `invited_email` is not in the response); on submit: `supabase.auth.signUp()` → fetch salt → derive X25519 keypair → `PATCH /api/users/me` with `publicKey`
- [x] **4.5** `unwrapChapterKeyWithSecret(encryptedChapterKey, keyNonce, inviteSecret)` → raw chapter key bytes
- [x] **4.6** `wrapChapterKeyForRecipient(chapterKeyBytes, ownPublicKey)` → `{ encryptedChapterKey, keyNonce, ephemeralPublicKey }`
- [x] **4.7** `POST /api/invites/{token}/accept` with ECDH-wrapped key
- [x] **4.8** Redirect to profile/chapter

---

### Phase 5 — Invite Creation UI

- [x] **5.1** Add invite UI to chapter settings (ADMIN only): email input + "Invite" button
- [x] **5.2** On submit — always use the invite-secret flow regardless of whether the invitee has an account:
  - Generate `inviteSecret = crypto.getRandomValues(new Uint8Array(32))`; `wrapChapterKeyWithSecret(chapterKey, inviteSecret)`; `POST /api/chapters/{id}/invites` with `{ invitedEmail, encryptedChapterKey, keyNonce, inviteSecretBase64url: base64url(inviteSecret) }` — backend generates the real token, constructs the full URL, and sends the email. The `inviteSecret` is never persisted by the backend, only handled in-memory during email dispatch. See trust boundary note in Phase 2.4.
  - **Existing users** click the link, log in (or are already logged in), and land on `AcceptInvitePage` where Phase 4.5–4.7 re-wraps the chapter key to their own public key. A few extra seconds versus the removed direct-wrap path — one code path is worth it.
  - **No `GET /api/users/by-email` lookup needed** — removed entirely. Avoids the enumeration trade-off and eliminates a branch of frontend and backend code.

---

### Phase 6 — Update Existing Chapter Creation Flow

- [x] **6.1** Update `frontend/src/api/chapters.ts` `createChapter()`:
  - Replace `encryptChapterKey(chapterKey, userKey)` → `wrapChapterKeyForRecipient(chapterKey, myPublicKey)`
  - Include `ephemeralPublicKey` in the POST body
  - Remove `getUserKey()` import if no longer used in this file
- [x] **6.2** Update backend chapter creation to store `ephemeral_public_key` in the `chapter_members` row
- [x] **6.3** Update all `getAndSetChapterKey` call sites to pass `ephemeralPublicKey` from the API response:
  - `frontend/src/api/chapters.ts` (lines 24, 91)
  - `frontend/src/api/meetings.ts` (line 41)
- [x] **6.4** Add `ephemeralPublicKey` to `ChapterMember` type and `publicKey` to `UserProfile` type in `frontend/src/api/types.ts`

---

## Manual Setup (before Phase 7 verification)

1. **Apply migrations** — from the repo root: `supabase db reset` (wipes and recreates the local DB with all migrations, including `004_public_key.sql` and `005_invitations.sql`). Requires Docker + the Supabase CLI running (`supabase start`).
2. **Set `backend-go/.env` variables** for invite emails:
   - `FRONTEND_URL` — used both for CORS and to build the invite link (`FRONTEND_URL + "/accept-invite?token=..."`). Set to `http://localhost:5173` for local dev.
   - `SMTP_HOST` / `SMTP_PORT` — defaults to `localhost:2500`, matching Supabase's local Inbucket (`supabase start` prints the Inbucket URL, usually `http://localhost:54324`, where dev emails can be viewed).
   - `SMTP_USER` / `SMTP_PASS` — leave unset for local Inbucket (no auth); required for a real SMTP relay in production.
   - `SMTP_FROM` — defaults to `no-reply@allthingsbookclub.app`; override as needed.
3. **Restart the Go backend** after editing `.env` so the new config is picked up.
4. **Restart the frontend dev server** if it was already running, so the new `@noble/curves`/`@noble/hashes` dependencies and routes are picked up.

---

### Phase 7 — Verification

- [ ] Log in → confirm `users.public_key` is populated in DB
- [ ] Create chapter → confirm `chapter_members.ephemeral_public_key` + `encrypted_chapter_key` are set; log out → log back in → chapter content decrypts
- [ ] Log in on a second browser with same password → chapter content decrypts (validates deterministic keypair from Argon2id)
- [ ] Invite existing user → they receive email link → log in → accept page re-wraps chapter key → can read chapter
- [ ] Invite new user → accept via email link → original inviter is never prompted again → new user reads chapter content
- [ ] Attempt to accept expired token → `POST /api/invites/{token}/accept` returns 410

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/lib/crypto.ts` | Add `deriveX25519KeyPair`, `wrapChapterKeyForRecipient`, `unwrapChapterKey`, `wrapChapterKeyWithSecret`, `unwrapChapterKeyWithSecret` |
| `frontend/src/lib/keyStore.ts` | Add X25519 private key storage; update `getAndSetChapterKey` signature |
| `frontend/src/api/types.ts` | Add `ephemeralPublicKey` to `ChapterMember`; add `publicKey` to `UserProfile` |
| `frontend/src/api/chapters.ts` | ECDH wrapping in `createChapter`; update `getAndSetChapterKey` call sites |
| `frontend/src/api/meetings.ts` | Update `getAndSetChapterKey` call site |
| `frontend/src/pages/Home/LoginPage.tsx` | Add Argon2id keypair derivation + public key upload on first login |
| `frontend/src/pages/Home/SignUpPage.tsx` | New — sign-up for chapter founders |
| `frontend/src/pages/Invite/AcceptInvitePage.tsx` | New — invite acceptance flow |
| `backend-go/internal/services/users.go` | Add `PublicKey` to `UserInput`; update `Update()` SQL |
| `backend-go/internal/routes/invites.go` | New |
| `backend-go/internal/services/invites.go` | New |
| `backend-go/internal/services/members.go` | Add `EphemeralPublicKey` to `MemberInput` |
| `supabase/migrations/004_public_key.sql` | New |
| `supabase/migrations/005_invitations.sql` | New |
| `backend-go/migrations/004_public_key.sql` | New |
| `backend-go/migrations/005_invitations.sql` | New |

---

## Scope

- **In scope:** X25519 keypair derivation, ECDH chapter key wrapping, single invite-secret flow for all invites (new and existing users), login/signup key setup, schema migrations
- **Out of scope:** `GET /api/users/by-email` (removed — see Phase 2.3 note), public topics layer, password-change key rotation, multi-device explicit re-registration
