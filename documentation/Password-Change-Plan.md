# Password Change Plan: E2EE Key Rotation

Both derived secrets — the PBKDF2 `userKey` (profile blob) and the Argon2id-derived X25519 keypair (chapter-key wrapping, see `documentation/Invite-Plan.md`) — are deterministic functions of the user's password. Changing the password changes both. Every `chapter_members.encrypted_chapter_key` row the user owns was wrapped to their *old* public key and must be re-wrapped to the new one, or that member permanently loses access to their own chapters.

> **Existing gap:** `frontend/src/pages/Profile/ProfilePage.tsx` already has a password-change UI (`passwordValue`/`confirmPasswordValue` fields, `ProfileSection.tsx`) that calls `supabase.auth.updateUser({ password })` directly — **with no key rotation at all**. This is a live bug: today, changing your password silently orphans every chapter key you hold. This plan fixes that flow rather than building a new one from scratch.

---

## Key Architecture

```
oldPassword + salt → Argon2id → oldPrivateKey ─┐
                                                 │ unwrap (per chapter)
GET /api/chapters → [{ encryptedChapterKey,     │
                        keyNonce,               ▼
                        ephemeralPublicKey }]  chapterKey (CryptoKey)
                                                 │
newPassword + salt → Argon2id → newPublicKey ───┘ re-wrap (ECDH, per chapter)
                                                 ▼
                          new { encryptedChapterKey, keyNonce, ephemeralPublicKey }
```

Reuses existing primitives — no new crypto functions needed:
- `deriveUserKey`, `deriveX25519KeyPair`, `getX25519PublicKey` (`frontend/src/lib/crypto.ts`)
- `unwrapChapterKey` (unwrap with old private key), `wrapChapterKeyForRecipient` (re-wrap for new public key)
- `encrypt`/`decrypt` (re-encrypt the profile blob with the new `userKey`)

The salt (`users.key_derivation_salt`) is **not** rotated — the password itself already changing is sufficient; reusing the salt keeps this plan to one migration-free change.

---

## Ordering & Atomicity Risk (read before implementing)

Two independent systems must both end up consistent: Supabase Auth (the actual login password) and our Postgres row of ECDH-wrapped keys. They cannot be updated in one transaction. The safe order is:

1. **Rotate the DB keys first** (new backend endpoint, single SQL transaction, all-or-nothing).
2. **Only after that succeeds**, call `supabase.auth.updateUser({ password: newPassword })`.

Rationale: if step 1 fails, nothing has changed anywhere — safe to just retry. If step 1 succeeds but step 2 fails (rare — network blip), the DB now has keys wrapped for the *new* password while Supabase still accepts the *old* one. This is recoverable **only because the user is still in the same browser tab with both passwords in memory** — the UI must detect this specific failure and offer a "retry just the password update" action instead of losing the derived keys. It must *never* silently claim success if step 2 fails.

Reversing the order (Supabase password first) is worse: if the DB rotation then fails, the user's new password logs in fine, but derives a keypair that doesn't match any `chapter_members` row — and the *old* password (needed to fix it) no longer works at all. This plan deliberately avoids that dead end.

**Identity verification:** before deriving anything, the current password must be checked against Supabase itself (`supabase.auth.signInWithPassword`), not just used locally. A typo in the "current password" field would otherwise only surface later as an opaque AES-GCM decrypt failure when unwrapping the first chapter key — verifying up front fails fast with a clear "current password incorrect" message instead.

**Other active sessions:** this plan only updates the session that performs the rotation. Any other already-open tab/device still has the *old* private key in memory and will fail to decrypt chapter content until it logs out and back in — expected, and consistent with how password changes behave elsewhere. Proactively revoking other sessions (e.g. Supabase's admin `signOut(userId, { scope: 'others' })`) would require a `SUPABASE_SERVICE_ROLE_KEY` the backend doesn't currently hold — worth adding later, called out under Scope below.

---

## Checklist

### Phase 0 — Backend: Rotate-Keys Endpoint

- [ ] **0.1** `backend-go/internal/services/users.go` — add `RotateKeysInput`. Keyed on `ChapterId` (not `chapter_members.id` — `GET /api/chapters` never exposes that row's own ID, only the chapter's; `(user_id, chapter_id)` is already `UNIQUE` so it's a sufficient key):
  ```go
  type ChapterKeyUpdate struct {
    ChapterId           string `json:"chapterId"`
    EncryptedChapterKey []byte `json:"encryptedChapterKey"`
    KeyNonce            []byte `json:"keyNonce"`
    EphemeralPublicKey  []byte `json:"ephemeralPublicKey"`
  }
  type RotateKeysInput struct {
    PublicKey     []byte             `json:"publicKey"`
    EncryptedBlob []byte             `json:"encryptedBlob"`
    Nonce         []byte             `json:"nonce"`
    ChapterKeys   []ChapterKeyUpdate `json:"chapterKeys"`
  }
  ```
- [ ] **0.2** Add `RotateKeys(ctx, userID string, input RotateKeysInput) error` — single `pgx` transaction:
  1. `UPDATE users SET public_key=$1, encrypted_blob=$2, nonce=$3 WHERE id=$4`
  2. For each entry in `ChapterKeys`: `UPDATE chapter_members SET encrypted_chapter_key=$1, key_nonce=$2, ephemeral_public_key=$3 WHERE chapter_id=$4 AND user_id=$5` (scoping to `user_id=$5`, the authenticated caller, is defense-in-depth — a caller can only ever rewrap their own membership rows, never someone else's in the same chapter)
  3. Sum the rows affected by step 2; if it doesn't equal `len(input.ChapterKeys)`, roll back and return a sentinel `ErrChapterListStale` (guards against the client operating on an out-of-date `GET /api/chapters` snapshot — e.g. joining a new chapter in another tab mid-rotation)
  4. Commit
- [ ] **0.3** `backend-go/internal/routes/users.go` — add `RotateKeys` handler for `PATCH /api/users/me/keys` (auth required); map `ErrChapterListStale` → 409 Conflict
- [ ] **0.4** Wire `r.Patch("/api/users/me/keys", userHandler.RotateKeys)` in `main.go`'s protected route group

---

### Phase 1 — Frontend: Fix the Password Change Flow

- [ ] **1.1** `frontend/src/api/users.ts` — add `rotateKeys(input): Promise<void>` → `PATCH /api/users/me/keys`
- [ ] **1.2** `ProfileSection.tsx` — add a **"Current password"** field, required whenever a new password is entered (needed to re-derive the old keys; today's form only asks for the new password)
- [ ] **1.3** Replace the `if (passwordValue) { ... supabase.auth.updateUser({ password }) }` block in `ProfilePage.tsx`'s `handleSave` with:
  1. Validate `currentPassword` is non-empty, `newPassword === confirmPassword`, and `newPassword !== currentPassword`
  2. **Verify identity first**: `supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })` — if this errors, stop immediately with "Current password incorrect"; do not attempt any key derivation
  3. `GET /api/users/me/salt` → same salt used for both derivations
  4. `deriveUserKey(currentPassword, salt)` + `deriveX25519KeyPair(currentPassword, salt)` → old keys
  5. `getChapters()` (fresh fetch, not a cached list) → for each chapter, `unwrapChapterKey(encryptedChapterKey, keyNonce, ephemeralPublicKey, oldPrivateKey)` — returns a `CryptoKey` directly, ready to re-wrap (no raw-bytes round trip needed)
  6. `deriveUserKey(newPassword, salt)` + `deriveX25519KeyPair(newPassword, salt)` → new keys
  7. Re-`encrypt()` the profile blob (name/avatarUrl/timezone) with the new `userKey`
  8. For each chapter, `wrapChapterKeyForRecipient(chapterKeyCryptoKey, newPublicKey)` → new `{ encryptedChapterKey, keyNonce, ephemeralPublicKey }`
  9. Call `rotateKeys({ publicKey: newPublicKey, encryptedBlob, nonce, chapterKeys: [{ chapterId, ... }] })` — **on failure, stop here**, show an error, change nothing else; safe to retry immediately
  10. Only on success, call `supabase.auth.updateUser({ password: newPassword })`
  11. If step 10 fails, show a distinct "Your keys were updated but the password change didn't finish" error with a **retry-step-10-only** button (do not re-run steps 1–9)
  12. On full success: `setUserKey(newUserKey)`, `setPrivateKey(newPrivateKey)` in `keyStore.ts` so the current tab keeps working without a reload; clear all password fields
- [ ] **1.4** Map the backend's 409 (`ErrChapterListStale`) to a specific message: "Your chapter list changed while updating — please try again."

---

### Phase 2 — Verification

- [ ] Change password → log out → log back in with the **new** password → all chapters still decrypt
- [ ] Confirm the **old** password no longer works in Supabase Auth
- [ ] Spot-check DB: `users.public_key` and every owned `chapter_members.encrypted_chapter_key`/`ephemeral_public_key` row changed
- [ ] Log in on a second, already-authenticated browser using the new password → derives working keys, reads chapters normally
- [ ] Force step 10 (`supabase.auth.updateUser`) to fail (e.g. temporarily disconnect network after step 9 completes) → confirm the retry-only-step-10 button recovers without re-deriving/re-wrapping anything
- [ ] Join a chapter in a second tab mid-rotation in the first tab → confirm the backend rejects the stale rotation with 409 rather than silently dropping the new membership's key

---

## Scope

- **In scope:** fixing `ProfilePage.tsx`'s password-change flow to correctly rotate the X25519 keypair, `userKey`, and every chapter key the user holds; a new atomic backend endpoint for it; verifying the current password against Supabase before touching any keys
- **Out of scope:** rotating `key_derivation_salt`; rate-limiting the new endpoint (same reasoning as other authenticated, self-scoped endpoints — not public)
- **Recommended follow-ups (separate from this plan):**
  - Raise `minimum_password_length` in `supabase/config.toml` — currently `6`, which is weak; 8+ is a more defensible floor
  - Revoke other active sessions after a successful rotation via Supabase's admin API (`auth.admin.signOut(userId, 'others')`), which needs a `SUPABASE_SERVICE_ROLE_KEY` the backend doesn't currently have configured

---

## Recovery Codes

Users who forget their password have no server-side recovery by design — that's the E2EE tradeoff. Recovery codes are a client-side escape hatch: a second high-entropy secret that can decrypt the master key without the password.

### How it works

1. At signup, generate a random recovery phrase (e.g. 12 BIP-39 words)
2. Derive a recovery key from it via PBKDF2 with a separate salt
3. Encrypt the user's `userKey` with the recovery key → store `recovery_encrypted_key`, `recovery_key_nonce`, `recovery_key_salt` on the `users` table
4. Show the recovery phrase **once** — the server never stores it plaintext
5. On password reset: prompt for the recovery code → decrypt the `userKey` → re-derive the X25519 keypair from the recovered `userKey` (or store a separate wrapped copy) → re-encrypt everything with the new password

### Schema addition (one migration)

```sql
ALTER TABLE users
  ADD COLUMN recovery_encrypted_key BYTEA,
  ADD COLUMN recovery_key_nonce     BYTEA,
  ADD COLUMN recovery_key_salt      TEXT;
```

### Implementation checklist (to be detailed when built)

- [ ] Generate recovery phrase on signup (`frontend/src/lib/crypto.ts`) and derive recovery key
- [ ] Store `recovery_encrypted_key`/`recovery_key_nonce`/`recovery_key_salt` alongside the existing user record (extend the signup API call)
- [ ] Show recovery phrase once in the UI with a copy/download prompt; warn that it cannot be shown again
- [ ] Add a "Forgot password" flow that accepts the recovery code, decrypts the `userKey`, then follows the same rotation steps as Phase 1 above (re-encrypts profile blob + all chapter keys with the new password's derived key)
- [ ] Add a "Regenerate recovery code" option in Profile (requires the current password, follows same pattern as key rotation)
- [ ] Warn prominently in the UI: **without your password or recovery code, your data cannot be recovered**
