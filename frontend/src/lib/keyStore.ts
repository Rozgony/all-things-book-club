/**
 * In-memory key store for the current session.
 *
 * Keys are never persisted to disk — they live only in memory.
 * If the user closes the tab, they must re-derive their key on next login.
 *
 * CryptoKey objects are non-extractable (except chapterKeys which need wrapping),
 * so even if someone inspects the JS heap they can't read the raw key bytes.
 */

let userKey: CryptoKey | null = null
const chapterKeys = new Map<string, CryptoKey>()

// ─── User Key ────────────────────────────────────────────────────────────────

export function setUserKey(key: CryptoKey): void {
  userKey = key
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
  chapterKeys.clear()
}
