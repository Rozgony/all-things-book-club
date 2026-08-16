# Privacy & Encryption

> **Draft outline** — fill in each section, then review.

---

## Portfolio Note: How to Reference the Code

To close the credibility gap without publishing the full codebase:

- **Publish `frontend/src/lib/crypto.ts` as a standalone snippet** (e.g., GitHub Gist or embed in the website). It contains no secrets and is the most technically interesting file.
- **Link directly from each section to relevant code lines:**
  - Section 4 (Key Hierarchy): link to the KDF calls in `deriveUserKey` and `deriveX25519KeyPair`
  - Section 5 (AES-256-GCM): link to `encrypt`/`decrypt` functions and nonce generation
  - Section 6 (Argon2id): link to the domain separation labels (`:userkey`, `:x25519`) and the parameter choices (19 MiB, t=2, p=1)
  - Section 7 (X25519): link to `wrapChapterKeyForRecipient` / `unwrapChapterKey` and the HKDF call with the `atbc-chapter-key-v1` context
  - Section 8 (Invitations): reference the invite secret mechanism in both the frontend and backend handling
- **Add a brief architecture diagram** showing the key flow as it actually exists in your schema (`backend-go/SCHEMA.md`, migrations) and service layer.

This anchors the writing in verifiable implementation, not just theory.

---

## 1. Our Commitment in Plain Language

_Who this document is for. What "end-to-end encrypted" actually means here in one paragraph a non-technical reader can verify. What we cannot read even if compelled._

---

## 2. Threat Model

_What we are protecting against (honest-but-curious server, legal compulsion, database breach) and what we are not (compromised client device, forgotten password)._

---

## 3. What the Server Sees vs. What It Cannot See

_A plain table: column or field / plaintext or encrypted / who holds the key. Cover the profile blob, chapter keys, meeting/topic/theme blobs, public key, invite secrets._

---

## 4. Key Hierarchy

_Walk through the three-level key hierarchy in plain terms, then show the diagram:_

```
password + server salt
  → (Argon2id :userkey)   userKey          — encrypts profile blob
  → (Argon2id :x25519)    X25519 keypair   — used for chapter key wrapping
        ↓ per chapter
        chapterKey (AES-256-GCM)           — encrypts all chapter content
```

_Explain why breaking one level does not automatically break another._

---

## 5. Symmetric Encryption — AES-256-GCM

_What is encrypted with AES-256-GCM (every content blob). What a nonce is and why a fresh one is generated per operation. What the GCM authentication tag protects against (tampering / chosen-ciphertext attacks)._

---

## 6. Password-Based Key Derivation — Argon2id

_Why a KDF is used instead of hashing. What memory-hardness means and why it matters for browser-based login. Parameters chosen (19 MiB, t=2, p=1) and the tradeoff that prevented going higher. Domain separation labels (`:userkey` / `:x25519`) and why both derivations share a salt without producing the same bytes._

_Include the design mistake: the original PBKDF2 derivation for `userKey`, why it was wrong (GPU-parallelisable, would have bypassed Argon2id entirely), and how it was caught and corrected before any user data existed._

---

## 7. Asymmetric Key Wrapping — X25519 / ECDH

_How a chapter member receives a chapter key they can decrypt without the server ever seeing it in plaintext. Walk through the ECDH handshake at a high level. Why the raw shared secret is passed through HKDF before use. Why a fresh ephemeral keypair is generated per wrap (forward unlinkability). The `atbc-chapter-key-v1` context string and what it binds._

---

## 8. Invitations

_How a new member receives a chapter key without the inviter's private key ever leaving the inviter's device. The role of the one-time invite secret embedded in the URL fragment (never sent to the server). What happens to the invite record after it is accepted._

---

## 9. What We Store Server-Side (Metadata)

_Honest accounting of what the server does know: membership graph, timestamps (standard mode), public chapter topics, auth provider identity (standard mode). Describe the Privacy Mode option that reduces this._

---

## 10. Privacy Mode (Opt-In)

_Anonymous sign-in (no email). Timestamps encrypted inside content blobs; ordering is client-side. Invites shared as out-of-band URLs. The explicit tradeoff: no account recovery if credentials are lost._

---

## 11. Password Changes & Key Rotation

_What happens when a user changes their password: both Argon2id derivations produce new outputs, every wrapped chapter key must be re-wrapped before the old password is discarded, and the new X25519 public key is stored. What would have been permanently lost without this._

---

## 12. Log Retention

_Infrastructure logs (access, query, error) are auto-deleted after 48 hours. What this means for compelled disclosure._

---

## 13. What This Architecture Cannot Protect Against

_Compromised client device. Forgotten password with no recovery email. A chapter member who copies plaintext after decrypting it. Social engineering._

---

## 14. Open Source

_Link to the repository. Invite readers to audit the crypto code directly. Note which files implement the primitives described above._
