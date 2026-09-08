/**
 * Crypto primitives for E2EE using the browser's built-in Web Crypto API
 *
 * Key hierarchy:
 *   password + server_salt → userKey        (Argon2id — profile blob encryption only)
 *   password + server_salt → userKey        (Argon2id — chapter key wrapping)
 *   chapterKey → encrypts all chapter content (meetings, topics, themes)
 *
 * The two derivations share the server-provided salt but use different
 * domain-separation labels appended to it, so compromising one derived
 * value gives no shortcut toward the other.
 */

import { argon2id } from '@noble/hashes/argon2.js'

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

// Decodes base64url (RFC 4648 §5, unpadded) — the alphabet used for the
// invite secret in the URL hash fragment.
function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return fromBase64(padded + padding)
}

export { toBase64, fromBase64, fromBase64Url }

// ─── Key Derivation ──────────────────────────────────────────────────────────

/**
 * Derives the user's master encryption key from their password and a
 * server-provided salt. This is deterministic — same password + salt
 * always produces the same key, on any device.
 *
 * Uses Argon2id (19 MiB, t=2, p=1) with a `:userkey` domain label.
 */
export async function deriveUserKey(password: string, saltHex: string): Promise<CryptoKey> {
  const seed = argon2id(password, saltHex + ':userkey', { t: 2, m: 19456, p: 1, dkLen: 32 })

  return crypto.subtle.importKey(
    'raw',
    seed,
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
    true,   // extractable — invites re-wrap this key, which requires exporting it
    ['encrypt', 'decrypt']
  )
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
  const wrapKey = await crypto.subtle.importKey('raw', inviteSecret as BufferSource, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
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
  const wrapKey = await crypto.subtle.importKey('raw', inviteSecret as BufferSource, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
  console.log('unwrapChapterKeyWithSecret',{wrapKey});
  
  const rawChapterKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(keyNonce) },
    wrapKey,
    fromBase64(encryptedChapterKey)
  )
  console.log('unwrapChapterKeyWithSecret',{rawChapterKey});
  return new Uint8Array(rawChapterKey)
}

/** Imports raw chapter key bytes (e.g. from `unwrapChapterKeyWithSecret`) as a usable CryptoKey. */
export async function importChapterKey(rawChapterKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawChapterKey as BufferSource, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
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
