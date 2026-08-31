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

- [x] **0.1** Install `@noble/hashes`
  - `@noble/hashes` — Argon2id (memory-hard KDF) and HKDF; small, audited, tree-shakable
  - (`@noble/curves` was installed for the original X25519 design but is no longer used for permanent key storage)

- [x] **0.2** Functions in `frontend/src/lib/crypto.ts`:
  - `deriveUserKey(password, salt)` — `Argon2id(password, salt + ":userkey", ...)` → AES-256-GCM `CryptoKey`. Wraps chapter keys and encrypts the profile blob.
  - `encryptChapterKey(chapterKey, userKey)` / `decryptChapterKey(...)` — AES-256-GCM wrap/unwrap using `crypto.subtle.wrapKey`
  - `wrapChapterKeyWithSecret(chapterKey, inviteSecret)` — AES-256-GCM wrap using a one-time random secret; used for invite transport only
  - `unwrapChapterKeyWithSecret(...)` → raw `Uint8Array` chapter key bytes; caller immediately re-wraps with `encryptChapterKey`

- [x] **0.3** `frontend/src/lib/keyStore.ts`:
  - `getAndSetChapterKey(chapterId, encryptedChapterKey, keyNonce)` — uses `decryptChapterKey(userKey)` to unwrap and cache the chapter key in memory

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
  - `POST /api/chapters/{id}/invites` 
    1. body: `{ invitedEmail, encryptedChapterKey, keyNonce, inviteSecretBase64url }`; 
    2. backend generates `invite_token` (32 random bytes, hex), constructs invite URL as `APP_URL + "/accept-invite?token=" + token + "#" + inviteSecretBase64url`, 
    3. sends email via Supabase SMTP, **does not persist `inviteSecretBase64url`** (only `encryptedChapterKey` and `keyNonce` are stored in DB); sets `expires_at = now() + 7 days`; 
    4. returns 201.   
      **Trust boundary note:** the server sees `inviteSecretBase64url` in-memory during email dispatch and could decrypt the chapter key — this is a concession for the invite flow specifically and should be documented as such. The server is trusted for availability; the ongoing E2EE model (post-accept) remains server-blind.
  - `GET /api/invites/{token}` — **no auth required** (invitee may not have an account yet); returns `{ inviterEmail, encryptedChapterKey, keyNonce, expiresAt, status }`; apply rate limiting (e.g. 20 req/min per IP)
  - `POST /api/invites/{token}/accept` — auth required; body: `{ encryptedChapterKey, keyNonce }`; use `crypto/subtle.ConstantTimeCompare` when comparing the token to prevent timing side-channels; atomically verifies token is PENDING + not expired + authed user's email matches `invited_email`; inserts `chapter_members` row; marks invite ACCEPTED; returns 201
- [x] **2.5** `backend-go/internal/services/members.go` — no `EphemeralPublicKey` field needed; `MemberInput` and INSERT use only `encrypted_chapter_key` / `key_nonce`

---

### Phase 3 — Login Key Setup

- [x] **3.1** Update `frontend/src/pages/Home/LoginPage.tsx` — after the Argon2id step, derive `userKey` and store it in keyStore. No X25519 derivation or public key upload needed.
- [x] **3.2** `frontend/src/pages/Home/SignUpPage.tsx` — for new chapter founders (no invite): `supabase.auth.signUp()` → `GET /api/users/me/salt` → derive `userKey` → redirect to profile.

---

### Phase 4 — Accept Invite Page

- [x] **4.1** Create `frontend/src/pages/Invite/AcceptInvitePage.tsx` and wire route `/accept-invite` in `App.tsx`
- [x] **4.2** On mount: extract `token` from `?token=` query param, `inviteSecret` from `window.location.hash` (base64url decode → `Uint8Array`) — hash fragment is never sent to the server
- [x] **4.3** `GET /api/invites/{token}` → display: `"[inviterEmail] has invited you to an All Things Book Club chapter."`
- [x] **4.4** If not logged in: show sign-up form; on submit: `supabase.auth.signUp()` → fetch salt → derive `userKey`
- [x] **4.5** `unwrapChapterKeyWithSecret(encryptedChapterKey, keyNonce, inviteSecret)` → raw chapter key bytes
- [x] **4.6** `encryptChapterKey(chapterKey, userKey)` → `{ encryptedChapterKey, keyNonce }` — re-wraps with the member's own `userKey`
- [x] **4.7** `POST /api/invites/{token}/accept` with `userKey`-wrapped chapter key
- [x] **4.8** Redirect to profile/chapter

---

### Phase 5 — Invite Creation UI

- [x] **5.1** Add invite UI to chapter settings (ADMIN only): email input + "Invite" button
- [x] **5.2** On submit — always use the invite-secret flow regardless of whether the invitee has an account:
  - Generate `inviteSecret = crypto.getRandomValues(new Uint8Array(32))`; `wrapChapterKeyWithSecret(chapterKey, inviteSecret)`; `POST /api/chapters/{id}/invites` with `{ invitedEmail, encryptedChapterKey, keyNonce, inviteSecretBase64url: base64url(inviteSecret) }` 
    - backend generates the real token, constructs the full URL, and sends the email. 
    - The `inviteSecret` is never persisted by the backend, only handled in-memory during email dispatch. See trust boundary note in Phase 2.4.
  - **Existing users** click the link, log in (or are already logged in), and land on `AcceptInvitePage` where Phase 4.5–4.7 re-wraps the chapter key to their own public key. A few extra seconds versus the removed direct-wrap path — one code path is worth it.
  - **No `GET /api/users/by-email` lookup needed** — removed entirely. Avoids the enumeration trade-off and eliminates a branch of frontend and backend code.

---

### Phase 6 — Update Existing Chapter Creation Flow

- [x] **6.1** Update `frontend/src/api/chapters.ts` `createChapter()`:
  - Use `encryptChapterKey(chapterKey, userKey)` — same wrapping as everywhere else
  - No `ephemeralPublicKey` in the POST body
- [x] **6.2** Backend chapter creation stores only `encrypted_chapter_key` / `key_nonce` in `chapter_members` — no `ephemeral_public_key` column
- [x] **6.3** All `getAndSetChapterKey` call sites take only 3 args: `(chapterId, encryptedChapterKey, keyNonce)`
- [x] **6.4** `ChapterMember` and `Chapter` types in `frontend/src/api/types.ts` have no `ephemeralPublicKey` or `publicKey` fields

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

TODO
- [x] re-simplify key wrapping
- [ ] consider security improvements
  - [ ] The invite token being bound to the invitee's email (invited_email check in InviteService.Accept) — so the attacker would also need to sign up or log in with that exact email address
  - [ ] Token expiry (7 days)
  - make sure we delete invites after accepted
- [ ] Make create user flow better
  - [ ] currently: "Sign up succeeded but no session was returned" because email address confirmation is required. Does it have to be that way?
  - [ ] why is there such a delay after clicking the email accept button?
- [ ] Show warning on bounced emails
- [ ] Make email link a clickable button
- [ ] Is there a way to not be able to see the email text in Resend?
- [ ] Why are chapters now wrapped by the public key instead of the user key?
- [ ] Why was there a delay in the email invite working?
- [ ] Better welcome screen than "mkschultz@proton.me has invited you to an All Things Book Club chapter."
- [ ] No one's chapters are loading, not for the creator or the invited.


NEXT QUESTION:
ok, so it's a one-time secret only used for the invite.  A couple more questions:
1. How is that different than asymmetric? Is it related to the complex math not needed in X25519? 
2. Would it make sense to have some sort of asymmetric encryption so with the app to make that invite more secure?
3. For my own educational purposes, if asymmetric is not necessary for this app, what additional features would make it necessary? For example, why does Signal have it but this app doesn't?