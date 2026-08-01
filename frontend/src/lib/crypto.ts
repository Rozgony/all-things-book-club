/**
 * Crypto primitives for E2EE using the browser's built-in Web Crypto API,
 * plus @noble/curves (X25519) and @noble/hashes (Argon2id, HKDF) for the
 * asymmetric invite key-handoff scheme (see documentation/Invite-Plan.md).
 *
 * Key hierarchy:
 *   password + server_salt → userKey        (PBKDF2 — profile blob encryption only)
 *   password + server_salt → X25519 keypair (Argon2id — chapter key wrapping)
 *   chapterKey → encrypts all chapter content (meetings, topics, themes)
 *
 * The two derivations share the server-provided salt but use different
 * domain-separation labels appended to it, so compromising one derived
 * value gives no shortcut toward the other.
 */

import { x25519 } from '@noble/curves/ed25519.js'
import { argon2id } from '@noble/hashes/argon2.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(str: string): Uint8Array<ArrayBuffer> {
  const binary = atob(str)
  const buf = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export { toBase64, fromBase64 }

// ─── Key Derivation ──────────────────────────────────────────────────────────

/**
 * Derives the user's master encryption key from their password and a
 * server-provided salt. This is deterministic — same password + salt
 * always produces the same key, on any device.
 *
 * Uses PBKDF2-SHA256 with 600,000 iterations (NIST recommended).
 */
export async function deriveUserKey(password: string, saltHex: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()

  // Import the raw password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Convert hex salt to bytes
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))

  // Derive a 256-bit AES-GCM key
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,        // extractable — needed to export to sessionStorage for reload support
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )
}

// ─── Chapter Key ─────────────────────────────────────────────────────────────

/**
 * Generates a fresh random AES-256-GCM key for a new chapter.
 * This key is what encrypts all content in the chapter.
 */
export async function generateChapterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,   // extractable — must be exportable so we can encrypt and store it
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts a chapter key with the user's master key for storage in the DB.
 * Returns { encryptedChapterKey, keyNonce } as base64 strings.
 */
export async function encryptChapterKey(
  chapterKey: CryptoKey,
  userKey: CryptoKey
): Promise<{ encryptedChapterKey: string; keyNonce: string }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12))

  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    chapterKey,
    userKey,
    { name: 'AES-GCM', iv: nonce }
  )

  return {
    encryptedChapterKey: toBase64(new Uint8Array(wrapped)),
    keyNonce: toBase64(nonce),
  }
}

/**
 * Decrypts a chapter key using the user's master key.
 */
export async function decryptChapterKey(
  encryptedChapterKey: string,
  keyNonce: string,
  userKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    fromBase64(encryptedChapterKey),
    userKey,
    { name: 'AES-GCM', iv: fromBase64(keyNonce) },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─── X25519 Key Exchange (Invites) ──────────────────────────────────────────
//
// Used to hand off a chapter's symmetric key to a member asymmetrically —
// the sender never needs to know the recipient's password-derived secret.
// See documentation/Invite-Plan.md for the full design.

export interface X25519KeyPair {
  privateKey: Uint8Array
  publicKey: Uint8Array
}

/**
 * Derives a deterministic X25519 keypair from the user's password and the
 * server-provided salt via Argon2id. Same password + salt = same keypair,
 * on any device — no key storage or backup required.
 *
 * Parameters follow OWASP's minimum recommendation for Argon2id
 * (19 MiB memory, 2 iterations, 1 degree of parallelism). The "x25519"
 * label domain-separates this derivation from `deriveUserKey`'s PBKDF2
 * output, which uses the same salt for a different purpose.
 */
export function deriveX25519KeyPair(password: string, saltHex: string): X25519KeyPair {
  const seed = argon2id(password, saltHex + ':x25519', { t: 2, m: 19456, p: 1, dkLen: 32 })
  const { secretKey, publicKey } = x25519.keygen(seed)
  return { privateKey: secretKey, publicKey }
}

/** Derives the public key matching a given X25519 private key. */
export function getX25519PublicKey(privateKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(privateKey)
}

/**
 * Wraps a chapter key for a specific recipient's X25519 public key.
 *
 * Generates a fresh ephemeral keypair per call — the ephemeral public key
 * (not the sender's own identity key) is used as the ECDH sender, so
 * multiple wraps by the same inviter cannot be linked to each other.
 * Follows the `age` encryption format: the ECDH shared secret is the HKDF
 * input key material, the concatenated public keys are the HKDF salt, and
 * a fixed string is the HKDF info label.
 */
export async function wrapChapterKeyForRecipient(
  chapterKey: CryptoKey,
  recipientPublicKey: Uint8Array
): Promise<{ encryptedChapterKey: string; keyNonce: string; ephemeralPublicKey: string }> {
  const ephemeral = x25519.keygen()
  const shared = x25519.getSharedSecret(ephemeral.secretKey, recipientPublicKey)

  const hkdfSalt = new Uint8Array([...ephemeral.publicKey, ...recipientPublicKey])
  const hkdfInfo = new TextEncoder().encode('atbc-chapter-key-v1')
  const wrapKeyBytes = hkdf(sha256, shared, hkdfSalt, hkdfInfo, 32)

  const wrapKey = await crypto.subtle.importKey('raw', wrapKeyBytes, 'AES-GCM', false, ['encrypt'])
  const rawChapterKey = await crypto.subtle.exportKey('raw', chapterKey)

  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, wrapKey, rawChapterKey)

  return {
    encryptedChapterKey: toBase64(new Uint8Array(ciphertext)),
    keyNonce: toBase64(nonce),
    ephemeralPublicKey: toBase64(ephemeral.publicKey),
  }
}

/**
 * Unwraps a chapter key that was wrapped with `wrapChapterKeyForRecipient`,
 * using this recipient's own X25519 private key.
 */
export async function unwrapChapterKey(
  encryptedChapterKey: string,
  keyNonce: string,
  ephemeralPublicKey: string,
  myPrivateKey: Uint8Array
): Promise<CryptoKey> {
  const ephPub = fromBase64(ephemeralPublicKey)
  const myPublicKey = x25519.getPublicKey(myPrivateKey)
  const shared = x25519.getSharedSecret(myPrivateKey, ephPub)

  const hkdfSalt = new Uint8Array([...ephPub, ...myPublicKey])
  const hkdfInfo = new TextEncoder().encode('atbc-chapter-key-v1')
  const wrapKeyBytes = hkdf(sha256, shared, hkdfSalt, hkdfInfo, 32)

  const wrapKey = await crypto.subtle.importKey('raw', wrapKeyBytes, 'AES-GCM', false, ['decrypt'])
  const rawChapterKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(keyNonce) },
    wrapKey,
    fromBase64(encryptedChapterKey)
  )

  return crypto.subtle.importKey('raw', rawChapterKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

/**
 * Wraps a chapter key with a one-time random secret instead of a public
 * key. Used only for new-user invites, where the invitee has no keypair
 * yet — the secret travels in the invite email's URL hash fragment,
 * which is never sent to the server.
 */
export async function wrapChapterKeyWithSecret(
  chapterKey: CryptoKey,
  inviteSecret: Uint8Array
): Promise<{ encryptedChapterKey: string; keyNonce: string }> {
  const wrapKey = await crypto.subtle.importKey('raw', inviteSecret, 'AES-GCM', false, ['encrypt'])
  const rawChapterKey = await crypto.subtle.exportKey('raw', chapterKey)

  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, wrapKey, rawChapterKey)

  return {
    encryptedChapterKey: toBase64(new Uint8Array(ciphertext)),
    keyNonce: toBase64(nonce),
  }
}

/**
 * Inverse of `wrapChapterKeyWithSecret`. Returns the raw chapter key bytes
 * so the caller can immediately re-wrap them with the invitee's own
 * public key via `wrapChapterKeyForRecipient`.
 */
export async function unwrapChapterKeyWithSecret(
  encryptedChapterKey: string,
  keyNonce: string,
  inviteSecret: Uint8Array
): Promise<Uint8Array> {
  const wrapKey = await crypto.subtle.importKey('raw', inviteSecret, 'AES-GCM', false, ['decrypt'])
  const rawChapterKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(keyNonce) },
    wrapKey,
    fromBase64(encryptedChapterKey)
  )
  return new Uint8Array(rawChapterKey)
}

/** Imports raw chapter key bytes (e.g. from `unwrapChapterKeyWithSecret`) as a usable CryptoKey. */
export async function importChapterKey(rawChapterKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawChapterKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

// ─── Content Encryption ──────────────────────────────────────────────────────

/**
 * Encrypts an arbitrary object with a chapter key.
 * Returns { encryptedBlob, nonce } as base64 strings ready to send to the API.
 */
export async function encrypt(
  data: object,
  chapterKey: CryptoKey
): Promise<{ encryptedBlob: string; nonce: string }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    chapterKey,
    encoded
  )

  return {
    encryptedBlob: toBase64(new Uint8Array(ciphertext)),
    nonce: toBase64(nonce),
  }
}

/**
 * Decrypts an encrypted blob back into a typed object.
 */
export async function decrypt<T>(
  encryptedBlob: string,
  nonce: string,
  chapterKey: CryptoKey
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(nonce) },
    chapterKey,
    fromBase64(encryptedBlob)
  )

  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
