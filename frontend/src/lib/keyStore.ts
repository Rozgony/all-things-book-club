/**
 * In-memory key store for the current session.
 *
 * The user key is also mirrored to sessionStorage (as an exported JWK string)
 * so it survives page reloads within the same tab. sessionStorage is cleared
 * when the tab closes. Chapter keys are not persisted — they are re-derived
 * from the encrypted chapter key in the DB using the restored user key.
 *
 * The user key is NEVER persisted anywhere (not even
 * sessionStorage): it is re-derived deterministically from the password
 * via Argon2id on every login, so there is nothing to restore on reload.
 */

import { decryptChapterKey } from "./crypto"

const USER_KEY_SESSION_KEY = 'atbc_user_key'

let userKey: CryptoKey | null = null
const chapterKeys = new Map<string, CryptoKey>()

// ─── User Key ────────────────────────────────────────────────────────────────

export async function setUserKey(key: CryptoKey): Promise<void> {
  userKey = key
  // Export and persist to sessionStorage so the key survives a page reload
  const jwk = await crypto.subtle.exportKey('jwk', key)
  sessionStorage.setItem(USER_KEY_SESSION_KEY, JSON.stringify(jwk))
}

/**
 * Attempts to restore the user key from sessionStorage.
 * Call this once on app startup before rendering protected content.
 * Returns true if the key was successfully restored, false otherwise.
 */
export async function restoreUserKey(): Promise<boolean> {
  const raw = sessionStorage.getItem(USER_KEY_SESSION_KEY)
  if (!raw) return false
  try {
    const jwk = JSON.parse(raw) as JsonWebKey
    userKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    )
    return true
  } catch {
    sessionStorage.removeItem(USER_KEY_SESSION_KEY)
    return false
  }
}

export function getUserKey(): CryptoKey {
  if (!userKey) throw new Error('No user key — user must log in first')
  return userKey
}

export function hasUserKey(): boolean {
  return userKey !== null
}

export function clearUserKey(): void {
  userKey = null
  sessionStorage.removeItem(USER_KEY_SESSION_KEY)
}

// ─── Chapter Keys ─────────────────────────────────────────────────────────────

export function setChapterKey(chapterId: string, key: CryptoKey): void {
  chapterKeys.set(chapterId, key)
}

export function getChapterKey(chapterId: string): CryptoKey {
  const key = chapterKeys.get(chapterId)
  if (!key) throw new Error(`No chapter key for chapter ${chapterId}`)
  return key
}

export function hasChapterKey(chapterId: string): boolean {
  return chapterKeys.has(chapterId)
}

export function clearAll(): void {
  userKey = null
  sessionStorage.removeItem(USER_KEY_SESSION_KEY)
  chapterKeys.clear()
}

/**
 * Unwraps a chapter's symmetric key using this member's X25519 private key
 * and caches it in-memory for subsequent content decryption.
 */
export async function getAndSetChapterKey(
	chapterId: string,
	encryptedChapterKey: string,
	keyNonce: string
): Promise<CryptoKey | null> {
	try {
    const chapterKey = await decryptChapterKey(encryptedChapterKey, keyNonce, getUserKey())
		setChapterKey(chapterId, chapterKey);
		return chapterKey
	} catch (error) {
		return null
	}
}