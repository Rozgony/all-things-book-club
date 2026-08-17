# Release Plan

Critical E2EE and privacy features required before launch, plus post-launch hardening improvements to reduce metadata exposure without changing the core crypto primitives or requiring special hardware from users.

## Threat Model & Opt-In Tiers

The architecture defends against a server-level adversary (honest-but-curious or legally coerced): the server holds only ciphertext it cannot read. The remaining exposure is metadata — who is in a group, when they joined, who invited whom.

Two usage tiers share the same codebase and crypto:

**Standard (default)**
- Email signup for easy account recovery
- Timestamps stored server-side for sorting and filtering
- Invites sent via email
- Suitable for book clubs, hobby groups, and anyone without an elevated threat model

**Privacy mode (opt-in per user)**
- Anonymous sign-in — no email required
- Timestamps encrypted inside content blobs; ordering happens client-side
- Invites shared as one-time URLs out-of-band (not sent to an email the server knows)
- No account recovery if session is lost — communicated clearly in the UI
- Suitable for activists, journalists, or anyone who needs to minimize metadata linkage

---

## Pre-Launch

### ✅ 0. Upgrade `deriveUserKey` from PBKDF2 to Argon2id

**Completed.** `deriveUserKey` was originally PBKDF2-SHA256 (600k iterations). The reasoning was that the user profile blob is low-sensitivity, so a lighter KDF was acceptable there. This was incorrect: `userKey` wraps `chapter_members.encrypted_chapter_key`, which decrypts all chapter content. PBKDF2 is compute-bound and GPU-parallelisable — cracking it bypasses Argon2id entirely.

- Both `deriveUserKey` and `deriveX25519KeyPair` now use Argon2id (19 MiB, t=2, p=1)
- Domain labels `:userkey` and `:x25519` appended to the shared salt prevent the two derivations from producing the same output
- **Breaking change** for any existing stored data — requires clearing/re-registering any test accounts created before this change

### 1. Short Log Retention Policy

Auto-delete server-side **infrastructure logs** (access logs, query logs, error logs) after 48 hours.

- Applies to Go server logs, Supabase auth logs, and hosting provider logs
- Does **not** affect application data (DB rows — meetings, members, encrypted blobs)
- Configure at the hosting/infra layer; document the policy publicly (warrant canary)
- Goal: cannot be compelled to produce logs that no longer exist

### 2. Strip Timestamps from Content *(Privacy mode only)*

Move sensitive timestamps client-side by encrypting them inside the content blob rather than storing them as plaintext DB columns.

- Exact columns to be determined during implementation (likely `meetings.date`, topic/theme `created_at`)
- Structural timestamps needed for DB ordering (e.g. `inserted_at` as an opaque sequence) can remain, but must carry no semantic meaning
- Tradeoff: server-side sort/filter by date is no longer possible; all ordering happens client-side after decryption
- Must be decided before launch — retrofitting requires re-encrypting every row with each user's key, which cannot be coordinated after the fact

### 3. Password Change / Key Rotation

Allow users to change their password without losing access to their encrypted data. See `documentation/Password-Change-Plan.md` for the full implementation plan.

- When a user changes their password, `deriveUserKey` and `deriveX25519KeyPair` both produce new outputs from the new password + existing salt
- The new `userKey` must re-wrap every `chapter_members.encrypted_chapter_key` the user holds before the old password is discarded
- The new X25519 keypair must be re-stored in the user profile blob; existing chapter keys were wrapped to the old public key and must be re-encrypted to the new one
- Without this, a user who changes their Supabase auth password loses all their chapter keys permanently — unrecoverable
- Must be implemented before any real users exist; there is no safe migration path after the fact

---

## Post-Launch

### 4. Per-IP Rate Limiting on Public Endpoints

Add rate limiting to unauthenticated endpoints to defend against brute-force and enumeration attacks.

- **Scope**: applies primarily to `/api/invites/{token}` (public invite lookup) and any future public endpoints
- **Implementation**: middleware or third-party library (e.g. `github.com/go-chi/httprate`); track client IP via `X-Forwarded-For` header (set by Railway/Vercel reverse proxy)
- **Rate limit**: e.g. 10 requests per minute per IP address for invite lookups; lower for password attempts if auth endpoints become public
- **Tradeoff**: legitimate users behind NAT or corporate proxies may hit the limit if multiple people from the same IP try simultaneously; document in UI
- **Code**: middleware added to the public group in `backend-go/main.go` before the invite handler group

### 5. Hard-Delete Member Records on Leave

When a member leaves a chapter, hard-delete their `chapter_members` row. No soft-delete, no `deleted_at` column.

- The `encrypted_chapter_key`, `key_nonce`, and `ephemeral_public_key` columns live on the `chapter_members` row, so they are automatically destroyed with it — no extra step needed
- Chapter content (topics, meetings, themes) is scoped to `chapter_id` only with no `user_id` or `created_by` column, so it remains intact for remaining members
- Implementation: add a `Delete` method to `MemberService` in `backend-go/internal/services/members.go` that runs `DELETE FROM chapter_members WHERE id = $1` — the schema has no soft-delete pattern so nothing else needs to change

### 6. Minimize Invite Metadata

Hard-delete `chapter_invitations` rows rather than retaining them with a status flag. Each row currently exposes `inviter_id`, `invited_email`, `chapter_id`, and `created_at` in plaintext — enough to reconstruct a social graph even if the invite was never accepted.

- **On accept**: delete the row after the chapter key has been re-wrapped into `chapter_members`
- **On reject**: delete the row immediately
- **On expiry**: run a periodic cleanup job (or DB trigger) to hard-delete expired rows — do not leave them with `status = 'EXPIRED'`
- The `status` column and its index can be removed once rows are deleted instead of updated
- If item 11 (anonymous sign-in) is implemented, `invited_email` may be eliminated entirely — invites would be shared as one-time URLs out-of-band rather than sent to an email address the server knows

### 7. Ghost Mode *(Privacy mode only)*

A chapter-level setting that automatically hard-deletes all content after a configurable retention window.

- Configurable per chapter (e.g. 7 days, 30 days, 90 days) — set by the chapter admin at creation or any time
- Applies to: meetings, topics, themes, and their associated encrypted blobs
- Does **not** delete chapter membership or the chapter itself — only the content rows
- Implementation: a scheduled background job (or Postgres `pg_cron`) that runs `DELETE FROM meetings WHERE chapter_id = $1 AND created_at < now() - interval '$n days'` — cascades to topics and themes via `ON DELETE CASCADE`
- Since content timestamps may be encrypted (item 2), Ghost Mode uses the server-side `inserted_at` opaque sequence for deletion timing, not the encrypted semantic date
- Tradeoff: members lose access to history older than the retention window; this must be communicated clearly when a chapter enables Ghost Mode

### 8. Log Out Everywhere

A user-initiated action that invalidates all active sessions across all devices simultaneously and clears derived keys from each device's session storage.

- Implementation: call `supabase.auth.signOut({ scope: 'global' })` — invalidates all refresh tokens for the user across all sessions
- Each device must listen for session invalidation (Supabase `onAuthStateChange`) and clear `sessionStorage` (derived `userKey`, `privateKey`) on detection
- Useful when a device is lost, stolen, or suspected compromised — closes the session hijacking window immediately
- Does not revoke the chapter key in the DB — content remains accessible on next login with the correct password; this is intentional (the key is still wrapped, not plaintext)

### 9. Strip IP Addresses from Application Logs

Configure the reverse proxy (Nginx or Caddy) to not log client IP addresses at the app layer.

- Works even on Railway/Vercel without moving off managed hosting
- Complements item 1 (infrastructure log retention) — item 1 deletes logs after 48 hours; this prevents IPs from being written at all
- Activists using Tor Browser already hide their IP from the server; this protects non-Tor users from IP logging on your side
- Implementation: set `log_format` in Nginx to omit `$remote_addr`, or use Caddy's `log` directive with IP field removed

### 10. Forward Secrecy on Member Removal

Rotate the chapter key when a member is removed, so they cannot decrypt content created after their removal even if they retained a copy of the old key.

- **Current gap:** deleting a member's `chapter_members` row revokes API access, but a member who copied the chapter key before removal can still decrypt any ciphertext they obtain later (e.g. via subpoena of the DB). All content encrypted with the old key remains readable to them indefinitely.
- **What rotation achieves:** everything encrypted after the rotation point is protected by a new key the removed member never held. Data encrypted before rotation is a permanent gap — this is accepted and matches how Signal and WhatsApp handle it.
- **Implementation:**
  1. Admin triggers removal; client fetches all chapter ciphertext
  2. Client decrypts each blob locally with the current chapter key
  3. Client generates a new random chapter key (`generateChapterKey`)
  4. Client re-encrypts all blobs with the new key and uploads them in a batch
  5. Client re-wraps the new chapter key for each remaining member (`wrapChapterKeyForRecipient`) and updates their `chapter_members` rows
  6. Server hard-deletes the removed member's row (item 5)
- **Tradeoffs:**
  - Re-encryption is client-side only — the server cannot do this since it cannot read the blobs
  - Must be triggered by an online admin; cannot be automated server-side
  - Slow for chapters with large amounts of content; needs progress UI
  - Members offline during rotation are unaffected — they unwrap the new chapter key on next login
- This is a post-launch addition — it requires no schema changes and no changes to existing crypto primitives

### 11. Anonymous Sign-In *(Privacy mode only)*

Allow users to sign up with a **username + password** instead of an email address, using Supabase anonymous auth (`supabase.auth.signInAnonymously()`).

- Username is a pseudonym or codename — never verified, never linked to a real-world identity
- Username must be unique on the server (the server knows "this username exists" but not who it belongs to)
- Password + server salt re-derives all keys deterministically — same username/password on any device restores full access with no recovery email needed
- Invite flow must work without a recipient email: use the existing invite-secret URL fragment mechanism, shared out-of-band
- Tradeoff: if both username and password are forgotten, the account is unrecoverable — this must be communicated clearly in the UI
- **Migration path for existing email users:** create a new anonymous account and use the existing invite flow to re-join any chapters — chapter keys are re-wrapped per-member at invite-accept time, so no data is lost

#### Implementation approach

Since Supabase requires an email identity for password-based re-login across devices, anonymous users are registered with a **synthetic email** derived deterministically on the client: `username@anon.internal`. This is never verified or displayed — it exists solely as a Supabase auth handle. The key derivation flow (salt → `deriveUserKey` → `deriveX25519KeyPair`) is identical to the email path.

#### Files to change

| File | Change |
|---|---|
| `supabase/migrations/006_anonymous_auth.sql` | Add `username TEXT UNIQUE` (nullable) to `users` |
| `backend-go/internal/services/users.go` | Add `CheckUsernameAvailable`, `SetUsername` |
| `backend-go/internal/routes/users.go` | Add `GET /auth/username-check` (rate-limited, unauthenticated) |
| `backend-go/internal/routes/invites.go` | Make `invitedEmail` optional; return invite URL in response body when omitted; skip mailer |
| `backend-go/main.go` | Register new route |
| `frontend/src/pages/Home/SignUpPage.tsx` | Email/anonymous toggle; username field; no-recovery warning |
| `frontend/src/pages/Home/LoginPage.tsx` | Username login path using synthetic email |
| `frontend/src/store/authStore.ts` | Add `authMode: 'email' \| 'anonymous'` and `username: string \| null` |
| `frontend/src/pages/ChapterDetail/InviteMemberForm.tsx` | Link-based invite path; show copyable URL when email omitted |
| `frontend/src/pages/Invite/AcceptInvitePage.tsx` | Anonymous signup path in the `needs-signup` state |
| `frontend/src/api/users.ts` | Add `checkUsernameAvailable`, `setMyUsername` |
