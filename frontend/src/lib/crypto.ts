/**
 * Crypto primitives for E2EE using the browser's built-in Web Crypto API.
 *
 * Key hierarchy:
 *   password + server_salt → userKey  (derived once per session via PBKDF2)
 *   userKey + random → chapterKey     (generated once per chapter)
 *   chapterKey → encrypts all chapter content (meetings, topics, themes)
 */

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
