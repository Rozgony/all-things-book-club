import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  setUserKey,
  restoreUserKey,
  getUserKey,
  hasUserKey,
  clearUserKey,
  setChapterKey,
  getChapterKey,
  hasChapterKey,
  clearAll,
  getAndSetChapterKey,
} from '../keyStore'
import { encryptChapterKey } from '../crypto'

async function makeAesKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )
}

afterEach(() => {
  clearAll()
  sessionStorage.clear()
})

describe('user key', () => {
  it('has no user key initially', () => {
    expect(hasUserKey()).toBe(false)
  })

  it('stores and retrieves the user key', async () => {
    const key = await makeAesKey()
    await setUserKey(key)
    expect(hasUserKey()).toBe(true)
    expect(getUserKey()).toBe(key)
  })

  it('throws when no user key is set', () => {
    expect(() => getUserKey()).toThrow('No user key')
  })

  it('persists the user key to sessionStorage', async () => {
    const key = await makeAesKey()
    await setUserKey(key)
    expect(sessionStorage.getItem('atbc_user_key')).not.toBeNull()
  })

  it('clears the in-memory key and sessionStorage', async () => {
    const key = await makeAesKey()
    await setUserKey(key)
    clearUserKey()
    expect(hasUserKey()).toBe(false)
    expect(sessionStorage.getItem('atbc_user_key')).toBeNull()
  })

  it('returns false when restoring with nothing in sessionStorage', async () => {
    expect(await restoreUserKey()).toBe(false)
  })

  it('returns false and clears invalid sessionStorage data', async () => {
    sessionStorage.setItem('atbc_user_key', 'not-json')
    expect(await restoreUserKey()).toBe(false)
    expect(sessionStorage.getItem('atbc_user_key')).toBeNull()
  })

  it('restores the user key from sessionStorage after a simulated reload', async () => {
    const key = await makeAesKey()
    await setUserKey(key)

    // Simulate a page reload: fresh module instance, same sessionStorage.
    vi.resetModules()
    const { restoreUserKey: restoreInFreshModule, hasUserKey: hasKeyInFreshModule } =
      await import('../keyStore')

    expect(hasKeyInFreshModule()).toBe(false)
    expect(await restoreInFreshModule()).toBe(true)
    expect(hasKeyInFreshModule()).toBe(true)
  })
})

describe('chapter keys', () => {
  it('has no chapter key initially', () => {
    expect(hasChapterKey('chapter-1')).toBe(false)
  })

  it('stores and retrieves a chapter key', async () => {
    const key = await makeAesKey()
    setChapterKey('chapter-1', key)
    expect(hasChapterKey('chapter-1')).toBe(true)
    expect(getChapterKey('chapter-1')).toBe(key)
  })

  it('throws for an unknown chapter id', () => {
    expect(() => getChapterKey('missing')).toThrow('No chapter key for chapter missing')
  })
})

describe('getAndSetChapterKey', () => {
  it('returns null when there is no user key to unwrap with', async () => {
    const result = await getAndSetChapterKey('chapter-1', 'ciphertext', 'nonce')
    expect(result).toBeNull()
  })

  it('unwraps and caches the chapter key using the current user key', async () => {
    const userKey = await makeAesKey()
    await setUserKey(userKey)
    const chapterKey = await makeAesKey()
    const { encryptedChapterKey, keyNonce } = await encryptChapterKey(chapterKey, userKey)

    const result = await getAndSetChapterKey('chapter-1', encryptedChapterKey, keyNonce)

    expect(result).not.toBeNull()
    expect(hasChapterKey('chapter-1')).toBe(true)
    const resultRaw = await crypto.subtle.exportKey('raw', result!)
    const originalRaw = await crypto.subtle.exportKey('raw', chapterKey)
    expect(new Uint8Array(resultRaw)).toEqual(new Uint8Array(originalRaw))
  })

  it('returns null when unwrapping fails', async () => {
    await setUserKey(await makeAesKey())
    const result = await getAndSetChapterKey('chapter-1', 'bad-ciphertext', 'bad-nonce')
    expect(result).toBeNull()
  })
})
