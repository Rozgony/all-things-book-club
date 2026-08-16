# E2EE Study Guide

A self-study map of the concepts behind this app's encryption, in the order they build on each other. Each section has pointers to where the concept lives in the code — read the code, then answer the questions yourself before moving on.

---

## 1. Symmetric Encryption — AES-256-GCM

**Where:** `frontend/src/lib/crypto.ts` (`encrypt`/`decrypt`, `generateChapterKey`, `wrapChapterKeyWithSecret`); every `encrypted_blob`/`nonce` column pair in `backend-go/SCHEMA.md`

- ✅ What does the GCM "authentication tag" protect against that a cipher mode without one (e.g. AES-CBC) wouldn't catch?
	- It makes sure that it hasn't been tampered with by a hacker.  With CBC, a hacker do an "_chosen-ciphertext_ attack" where they pass it an arbitrary message to decrypt and then deduce information about the secret.
	- CGM is CTM (Counter Mode) that also layers the authentication tag on it to detect tampering. If an attacker tries to decrypt something that doesn't have the tag, it rejects it.  G= Galois
		- The tag is a MAC (Message Authentication Code) that summarizes the cipher text into a fixed size finger print. 
- ✅ Why does every encryption call generate a fresh random `nonce`/`iv`? What specifically goes wrong if the same key + nonce pair is ever reused to encrypt two different messages?
	- If it was re-used then they could they could forge a valid authentication tags
	- since you have the nonce, the encrypted data, and the key. If the nonce is re-used it makes it much easier to re-construct the encryption process
- ✅ Why is the nonce stored and sent alongside the ciphertext in plaintext — is that a security problem?
	- No because the key isn't available and the nonce is used only once. 


#### Notes:
- `crypto.subtle` 
	- interface name includes the term "subtle" to indicate that many of its algorithms have subtle usage requirements that need to be used carefully.
- `wrapKey`
	- exports key into an external portable format for use in unsafe envs.

---

## 2. Key Derivation Functions — Argon2id

**Where:** `crypto.ts` → `deriveUserKey` (Argon2id, `:userkey` label) and `deriveX25519KeyPair` (Argon2id, `:x25519` label)

> **Design history:** `deriveUserKey` was originally written using PBKDF2-SHA256 (600k iterations). The reasoning was that the user profile blob is low-sensitivity data, so a lighter KDF was acceptable there. This was a mistake: `userKey` wraps the `chapter_members.encrypted_chapter_key`, which in turn unlocks all chapter content. PBKDF2 is purely compute-bound so GPUs can attack it cheaply in parallel — cracking `userKey` would therefore bypass Argon2id entirely and expose everything. A user caught this during review, and both derivations were upgraded to Argon2id.

- ✅ What does "memory-hard" mean, and why would that property matter more for one of these derivations than the other?
	- Memory-hard is a function that uses a lot of memory to run.  
	- Argon2id is memory hard PBKDF2 is not and so Argon2id for anything that does not require National Institute of Standards and Technology Compliance (NIST) Certification.
	- If you set PBKDF2 to 600,000 iterations with a SHA-256 hash it can be considered secure. 
		- Why is that still considered good enough? Is it memory-hard with those settings?
- ✅ Look at the salt used in each function — `deriveX25519KeyPair` appends `":x25519"` before hashing. What is this called, and what specifically breaks if both derivations used the exact same salt with no label?
	- This is called "domain separation"
	- So this is used specifically with invites and should be distinguished from the userKey that is salted. 
		-  Claude: The label isn't specifically about invites — the X25519 keypair is used throughout (key wrapping, ECDH handshake). It's about separating _any_ two derivations that share the same inputs.
	- Since this is part of the invite, you don't want to share your same salted key that could give an attacker a chance to derive the inviters password.
		- Claude: If both derivations used the same KDF with the same password + salt and no label, they'd produce **the same bytes**. You'd be using one secret as both your AES content encryption key _and_ your X25519 private key seed. An attacker who observes your X25519 public key (which is stored server-side) now has a target to attack that is mathematically linked to your symmetric key. Compromise one context, you've undermined the other.
- ✅ What happens on login if the server-stored salt (`users.key_derivation_salt`) were ever lost?
	- then the user would not be able to recover their encrypted data
- ✅ The memory parameter `m` is set to 19456 (19 MiB). Why can't you simply set it much higher for more security, and what constraint is specific to running this in a browser vs. a native app?
	- Because it can take 1-3 seconds in JS because JS doesn't have 64-bit integers.  That's the OWASP minimum. 
	- 64 MiB is preferred but that would take 5-10 seconds for login in JS. 
	- A MiB is a Mebibyte, which is used for binary.
- ✅ How is the salt generated?
	- in Go crypto.RandomBytes(32) (meaning 256 bits)

#### Notes:
- `pepper` 
	-  A secret salt and should be stored in "secrets vaults" or HSMs

---

## 3. Diffie-Hellman Key Exchange — X25519 / ECDH

**Where:** `crypto.ts` → `wrapChapterKeyForRecipient` / `unwrapChapterKey`

- ？Two parties who've never spoken before can each compute the *same* shared secret using their own private key and the other's public key. What mathematical property makes this possible?
	- The Dillie-Hellman key exchange uses an logrithmic algorithm that is very easy to computer forward but not backwards. That means its takes little computation if you have the secret and the public key but is nearly impossible if you only have the public key.
	- The exchange goes:
		1. Both parties already know gg and pp (or in X25519, the curve parameters)
		2. Alice picks a random private key aa, computes A=ga  pA=gamodp, sends AA to Bob
		3. Bob picks a random private key bb, computes B=gb  pB=gbmodp, sends BB to Alice
		4. Alice computes Ba  pBamodp — she has BB (received) and aa (her own private key)
		5. Bob computes Ab  pAbmodp — he has AA (received) and bb (his own private key)
		6. Both get gab  pgabmodp
- ✅ The raw ECDH output (`x25519.getSharedSecret(...)`) is never used directly as an AES key — it's passed into HKDF first. Why not use it directly?
	- The EDCH output is just a point on a curve and so it needs to be modified to be turned into a proper key.
	- HKDF also lets you bind the derived key to a specific context via the `info` string (`atbc-chapter-key-v1`)
- ✅ What is an "ephemeral" keypair, and why is a fresh one generated for every single wrap (`wrapChapterKeyForRecipient`) instead of reusing the sender's own long-term keypair? What would an observer be able to link together if it *weren't* ephemeral?
	- without ephemeral keys, you could easily see all the keys who came from the same person. with the ephemeral key, each key looks like it came from a new sender. 

---

## 4. HKDF (Extract-and-Expand Key Derivation)

**Where:** `crypto.ts` → the `hkdf(sha256, shared, hkdfSalt, hkdfInfo, 32)` call inside `wrapChapterKeyForRecipient`/`unwrapChapterKey`

- ✅ HKDF takes three distinct inputs: IKM, salt, and info. What role does each play, and why are they *not* interchangeable?
	- uses the "age" design pattern
		- IKM: input key material. In our code this is the Diffie-Hellman shared secret
		- salt: a psuedo-random value to increase the uniqueness and entropy of the IKM
		- info: so we could distinguish from other keys we derive from the same source.  Its a similar reason we have a label in argon2id.
	- The above three are not interchangeable because they do different things and allows it to be deterministic, unique, and doesn't reuse keys
- ✅ This code uses the concatenation of the ephemeral public key and the recipient's public key as the HKDF **salt**, and a fixed string (`"atbc-chapter-key-v1"`) as the **info**. Why those specific choices? (Look up the `age` encryption tool's format — this follows it.)
	- Salt is the concatenation of the ephemeral and recipient public keys so both parties can recompute the same salt. 
	- While still being deterministic, its different from argon2id because no work needs to be done in deriving the key since its already high entropy. 
	- The info string is a domain separator. 
- ✅ What's the difference between HKDF-Extract ### HKDF-Expand?
	- Extract takes the high-entropy input and extracts it into a fixed-length pseudorandom key
	- Expand just expands it into multiple output bytes.

---

## 5. Key Wrapping vs. Content Encryption

**Where:** `chapter_members.encrypted_chapter_key`/`key_nonce` vs. `meetings`/`chapter_topics`/`themes`'s `encrypted_blob`/`nonce`

- ✅ Both ultimately use AES-256-GCM. What's structurally different between "wrapping a key" and "encrypting content"?
	- the wrapping and unwrapping is a specific function that validates that its a proper encryption key
- ✅ Every chapter member has their *own* row with their *own* wrapped copy of the same chapter key. Why not store one shared wrapped copy for the whole chapter?
	- The chapter key is wrapped with each member's **X25519 public key** via ECDH. That's the whole point of the asymmetric key exchange.
	- When a user creates a chapter, it is wrapped and unwrapped using their userKey. Otherwise, they'd need to have a separate password for each chapter to derive the key from. 
	- separately wrapped keys means a user can leave a chapter without everyone having to re-encrypt data
- ✅ Trace what happens when an ADMIN removes a member from a chapter — does the chapter key itself need to change? Why or why not? (Hint: research "forward secrecy" and whether this scheme provides it after a member is removed.)
	- Yes, since the encryption key is shared between chapter members, all of the chapter data needs to be re-encrypted with a new key.  There is no code to do this yet though.  And really isn't priority because API access controls would limit the non-member from accessing the newly created data.
	- A fix would require the frontend to re-encrypt all the chapter's data when a member is removed.  This would be timely and so maybe it could only be an optional feature for users that would be defaulted in Ghost mode. 
---

## 6. Deterministic vs. Random Key Generation

**Where:** `deriveX25519KeyPair` (deterministic, from password) vs. `generateChapterKey` (random, `crypto.subtle.generateKey`)

- ✅ Why must a user's own X25519 keypair be re-derivable (deterministic) rather than randomly generated once and stored?
	- So that it can be accessed across devices without actually providing a key or from a physical device something like that
- ✅ What multi-device/multi-browser problem does determinism solve, without needing any key-syncing infrastructure?
	- The user would need to provide the actual key with every login on every device the user uses. This would require a complicated sync infrastructure.
- ✅ Read `documentation/Password-Change-Plan.md`'s opening paragraph. What new problem does determinism introduce the moment a password changes?
	- All the keys on the chapter members first need to be unwrapped based on the old password and then re-wrapped based on the new passwrod.
- ✅ Why can the chapter key be randomly generated?
	- because we actually store the chapter key an a wrapped form in the data base so we don't need to derive it again.

---

## 7. Trust Boundaries & "Server-Blind" Design

**Where:** `backend-go/SCHEMA.md`'s E2EE Overview; `documentation/Invite-Plan.md`'s Phase 2.4 note about the invite secret

- For nearly every piece of user content, the Go backend only ever stores ciphertext. Find the **one exception** during the invite flow where the server briefly *could* see a decryptable chapter key in memory. Why was that judged an acceptable trade-off?
- `chapters.name` and `chapter_members.role` are stored as plaintext, not encrypted. Why those two fields specifically — what would break if they were encrypted like everything else?

---

## 8. Authentication vs. Encryption — Two Separate Concerns

**Where:** `backend-go/internal/middleware/auth.go` (JWT validation); `crypto.ts`'s two key derivations

- ✅ A valid Supabase JWT proves *who you are* to the server. Does it give the server (or anyone holding a stolen JWT) the ability to decrypt any chapter content? Why or why not?
	- No. The JWT is not the password. It holds a token to say that we have been logged in that this is the token to prove it.  I an attacker actually need the text of the password to decrypt the data. 
- ✅ Name the two secrets tied to a user's password that the JWT has zero knowledge of.
	- User Key
	- X25519 private key for the ECDH

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

- ✅ Why can't a single database transaction make "update the Supabase Auth password" and "update our own Postgres rows" happen atomically together?
	- Because they are different systems.
- ✅ The plan picks a specific ordering (rewrap keys first, change the login password second) over the reverse. Work through both orderings yourself — for each one, what does the user need in order to recover if the *second* step fails?
	- For password change then rewrap
		- If rewrap fails then we loose access to encrypted data because its all wrapped with the previous password that we no longer have. So we'd need to re-cover the key from the old password which the system doesn't have. 
	- For rewrap then password change
		- We'd need to just re-attempt the password change

---

## Suggested Study Order

1. ✅ Sections 1–4 (crypto primitives) — read `crypto.ts` top to bottom alongside them.
2. ✅ Section 5–6 (how the primitives compose into this app's key hierarchy) — re-read `documentation/Invite-Plan.md`'s "Key Architecture" diagram.
3. Section 7–8 (what the server does and doesn't know) — re-read `backend-go/SCHEMA.md`.
4. Section 9–10 (attack-focused) — read `documentation/Invite-Plan.md` fully, front to back.
5. ✅ Section 11 (systems-level) — read `documentation/Password-Change-Plan.md` fully.

**Self-check exercise:** once you've been through all 11, try to draw the full journey of one chapter key from `createChapter()` being called to a second member decrypting a meeting note, from memory, without opening any files. Then check yourself against the code.
