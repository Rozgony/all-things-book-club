# E2EE Study Guide

A self-study map of the concepts behind this app's encryption, in the order they build on each other. Each section has pointers to where the concept lives in the code — read the code, then answer the questions yourself before moving on.

---

## 1. Symmetric Encryption — AES-256-GCM

**Where:** `frontend/src/lib/crypto.ts` (`encrypt`/`decrypt`, `generateChapterKey`, `wrapChapterKeyWithSecret`); every `encrypted_blob`/`nonce` column pair in `backend-go/SCHEMA.md`

- What does the GCM "authentication tag" protect against that a cipher mode without one (e.g. AES-CBC) wouldn't catch?
- Why does every encryption call generate a fresh random `nonce`/`iv`? What specifically goes wrong if the same key + nonce pair is ever reused to encrypt two different messages?
- Why is the nonce stored and sent alongside the ciphertext in plaintext — is that a security problem?

---

## 2. Key Derivation Functions — PBKDF2 vs Argon2id

**Where:** `crypto.ts` → `deriveUserKey` (PBKDF2, 600k iterations) and `deriveX25519KeyPair` (Argon2id)

- Both take a password + salt and produce a key. Why does this app use *two different* KDFs for two different purposes instead of one?
- What does "memory-hard" mean, and why would that property matter more for one of these derivations than the other?
- Look at the salt used in each function — `deriveX25519KeyPair` appends `":x25519"` before hashing. What is this called, and what specifically breaks if both derivations used the exact same salt with no label?
- What happens on login if the server-stored salt (`users.key_derivation_salt`) were ever lost?

---

## 3. Diffie-Hellman Key Exchange — X25519 / ECDH

**Where:** `crypto.ts` → `wrapChapterKeyForRecipient` / `unwrapChapterKey`

- Two parties who've never spoken before can each compute the *same* shared secret using their own private key and the other's public key. What mathematical property makes this possible?
- The raw ECDH output (`x25519.getSharedSecret(...)`) is never used directly as an AES key — it's passed into HKDF first. Why not use it directly?
- What is an "ephemeral" keypair, and why is a fresh one generated for every single wrap (`wrapChapterKeyForRecipient`) instead of reusing the sender's own long-term keypair? What would an observer be able to link together if it *weren't* ephemeral?

---

## 4. HKDF (Extract-and-Expand Key Derivation)

**Where:** `crypto.ts` → the `hkdf(sha256, shared, hkdfSalt, hkdfInfo, 32)` call inside `wrapChapterKeyForRecipient`/`unwrapChapterKey`

- HKDF takes three distinct inputs: IKM, salt, and info. What role does each play, and why are they *not* interchangeable?
- This code uses the concatenation of the ephemeral public key and the recipient's public key as the HKDF **salt**, and a fixed string (`"atbc-chapter-key-v1"`) as the **info**. Why those specific choices? (Look up the `age` encryption tool's format — this follows it.)

---

## 5. Key Wrapping vs. Content Encryption

**Where:** `chapter_members.encrypted_chapter_key`/`key_nonce` vs. `meetings`/`chapter_topics`/`themes`'s `encrypted_blob`/`nonce`

- Both ultimately use AES-256-GCM. What's structurally different between "wrapping a key" and "encrypting content"?
- Every chapter member has their *own* row with their *own* wrapped copy of the same chapter key. Why not store one shared wrapped copy for the whole chapter?
- Trace what happens when an ADMIN removes a member from a chapter — does the chapter key itself need to change? Why or why not? (Hint: research "forward secrecy" and whether this scheme provides it after a member is removed.)

---

## 6. Deterministic vs. Random Key Generation

**Where:** `deriveX25519KeyPair` (deterministic, from password) vs. `generateChapterKey` (random, `crypto.subtle.generateKey`)

- Why must a user's own X25519 keypair be re-derivable (deterministic) rather than randomly generated once and stored?
- What multi-device/multi-browser problem does determinism solve, without needing any key-syncing infrastructure?
- Read `documentation/Password-Change-Plan.md`'s opening paragraph. What new problem does determinism introduce the moment a password changes?

---

## 7. Trust Boundaries & "Server-Blind" Design

**Where:** `backend-go/SCHEMA.md`'s E2EE Overview; `documentation/Invite-Plan.md`'s Phase 2.4 note about the invite secret

- For nearly every piece of user content, the Go backend only ever stores ciphertext. Find the **one exception** during the invite flow where the server briefly *could* see a decryptable chapter key in memory. Why was that judged an acceptable trade-off?
- `chapters.name` and `chapter_members.role` are stored as plaintext, not encrypted. Why those two fields specifically — what would break if they were encrypted like everything else?

---

## 8. Authentication vs. Encryption — Two Separate Concerns

**Where:** `backend-go/internal/middleware/auth.go` (JWT validation); `crypto.ts`'s two key derivations

- A valid Supabase JWT proves *who you are* to the server. Does it give the server (or anyone holding a stolen JWT) the ability to decrypt any chapter content? Why or why not?
- Name the two secrets tied to a user's password that the JWT has zero knowledge of.

---

## 9. Threat Modeling — Enumeration, TOFU, and Timing Attacks

**Where:** `backend-go/internal/db/membership.go` (`SharesAnyChapter`); `backend-go/internal/services/invites.go` (`subtle.ConstantTimeCompare`)

- `GET /api/users/by-email` requires the caller to already share a chapter with the target user. What attack does this prevent, and what could an attacker learn from this endpoint if that check didn't exist?
- Why does the invite-accept code use `crypto/subtle.ConstantTimeCompare` instead of a plain `==` when checking the invite token? What class of attack does a plain string comparison expose you to, and why?
- Read the "TOFU note" in `documentation/Invite-Plan.md`'s Phase 5. What is "Trust On First Use," and what specific attack does the existing-user invite path have no defense against?

---

## 10. Out-of-Band Secret Transport (URL Fragments)

**Where:** `frontend/src/pages/Invite/AcceptInvitePage.tsx`; `backend-go/internal/routes/invites.go` (`Create`)

- The one-time invite secret travels in the URL's `#hash` fragment, not a `?query=` parameter. Research the difference: which one does a browser send to the server in an HTTP request, and which one never leaves the browser?
- Given that, why would putting the invite secret in a query parameter instead have been a real vulnerability (think about server access logs, browser history, and the `Referer` header)?

---

## 11. Atomicity Across Independent Systems

**Where:** `documentation/Password-Change-Plan.md`'s "Ordering & Atomicity Risk" section

- Why can't a single database transaction make "update the Supabase Auth password" and "update our own Postgres rows" happen atomically together?
- The plan picks a specific ordering (rewrap keys first, change the login password second) over the reverse. Work through both orderings yourself — for each one, what does the user need in order to recover if the *second* step fails?

---

## Suggested Study Order

1. Sections 1–4 (crypto primitives) — read `crypto.ts` top to bottom alongside them.
2. Section 5–6 (how the primitives compose into this app's key hierarchy) — re-read `documentation/Invite-Plan.md`'s "Key Architecture" diagram.
3. Section 7–8 (what the server does and doesn't know) — re-read `backend-go/SCHEMA.md`.
4. Section 9–10 (attack-focused) — read `documentation/Invite-Plan.md` fully, front to back.
5. Section 11 (systems-level) — read `documentation/Password-Change-Plan.md` fully.

**Self-check exercise:** once you've been through all 11, try to draw the full journey of one chapter key from `createChapter()` being called to a second member decrypting a meeting note, from memory, without opening any files. Then check yourself against the code.
