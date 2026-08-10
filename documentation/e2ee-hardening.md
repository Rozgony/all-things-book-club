# E2EE Hardening Plan

Improvements to reduce metadata exposure without changing the core crypto primitives or requiring special hardware from users.

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

### 3. Anonymous Sign-In *(Privacy mode only)*

Allow users to sign up with a **username + password** instead of an email address, using Supabase anonymous auth (`supabase.auth.signInAnonymously()`).

- Username is a pseudonym or codename — never verified, never linked to a real-world identity
- Username must be unique on the server (the server knows "this username exists" but not who it belongs to)
- Password + server salt re-derives all keys deterministically — same username/password on any device restores full access with no recovery email needed
- Invite flow must work without a recipient email: use the existing invite-secret URL fragment mechanism, shared out-of-band
- Tradeoff: if both username and password are forgotten, the account is unrecoverable — this must be communicated clearly in the UI
- Must be decided before launch — early users signed up with email cannot have that email retroactively removed

---

## Post-Launch

### 4. Hard-Delete Member Records on Leave

When a member leaves a chapter, hard-delete their `chapter_members` row. No soft-delete, no `deleted_at` column.

- The `encrypted_chapter_key`, `key_nonce`, and `ephemeral_public_key` columns live on the `chapter_members` row, so they are automatically destroyed with it — no extra step needed
- Chapter content (topics, meetings, themes) is scoped to `chapter_id` only with no `user_id` or `created_by` column, so it remains intact for remaining members
- Implementation: add a `Delete` method to `MemberService` in `backend-go/internal/services/members.go` that runs `DELETE FROM chapter_members WHERE id = $1` — the schema has no soft-delete pattern so nothing else needs to change

### 5. Minimize Invite Metadata

Hard-delete `chapter_invitations` rows rather than retaining them with a status flag. Each row currently exposes `inviter_id`, `invited_email`, `chapter_id`, and `created_at` in plaintext — enough to reconstruct a social graph even if the invite was never accepted.

- **On accept**: delete the row after the chapter key has been re-wrapped into `chapter_members`
- **On reject**: delete the row immediately
- **On expiry**: run a periodic cleanup job (or DB trigger) to hard-delete expired rows — do not leave them with `status = 'EXPIRED'`
- The `status` column and its index can be removed once rows are deleted instead of updated
- If item 3 (anonymous sign-in) is implemented, `invited_email` may be eliminated entirely — invites would be shared as one-time URLs out-of-band rather than sent to an email address the server knows

### 6. Ghost Mode *(Privacy mode only)*

A chapter-level setting that automatically hard-deletes all content after a configurable retention window.

- Configurable per chapter (e.g. 7 days, 30 days, 90 days) — set by the chapter admin at creation or any time
- Applies to: meetings, topics, themes, and their associated encrypted blobs
- Does **not** delete chapter membership or the chapter itself — only the content rows
- Implementation: a scheduled background job (or Postgres `pg_cron`) that runs `DELETE FROM meetings WHERE chapter_id = $1 AND created_at < now() - interval '$n days'` — cascades to topics and themes via `ON DELETE CASCADE`
- Since content timestamps may be encrypted (item 2), Ghost Mode uses the server-side `inserted_at` opaque sequence for deletion timing, not the encrypted semantic date
- Tradeoff: members lose access to history older than the retention window; this must be communicated clearly when a chapter enables Ghost Mode

### 7. Log Out Everywhere

A user-initiated action that invalidates all active sessions across all devices simultaneously and clears derived keys from each device's session storage.

- Implementation: call `supabase.auth.signOut({ scope: 'global' })` — invalidates all refresh tokens for the user across all sessions
- Each device must listen for session invalidation (Supabase `onAuthStateChange`) and clear `sessionStorage` (derived `userKey`, `privateKey`) on detection
- Useful when a device is lost, stolen, or suspected compromised — closes the session hijacking window immediately
- Does not revoke the chapter key in the DB — content remains accessible on next login with the correct password; this is intentional (the key is still wrapped, not plaintext)

### 8. Strip IP Addresses from Application Logs

Configure the reverse proxy (Nginx or Caddy) to not log client IP addresses at the app layer.

- Works even on Railway/Vercel without moving off managed hosting
- Complements item 1 (infrastructure log retention) — item 1 deletes logs after 48 hours; this prevents IPs from being written at all
- Activists using Tor Browser already hide their IP from the server; this protects non-Tor users from IP logging on your side
- Implementation: set `log_format` in Nginx to omit `$remote_addr`, or use Caddy's `log` directive with IP field removed
