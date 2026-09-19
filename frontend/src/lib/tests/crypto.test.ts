import { describe, it, expect } from 'vitest'
import {
  toBase64,
  fromBase64,
  fromBase64Url,
  deriveUserKey,
  generateChapterKey,
  encryptChapterKey,
  decryptChapterKey,
  wrapChapterKeyWithSecret,
  unwrapChapterKeyWithSecret,
  importChapterKey,
  encrypt,
  decrypt,
} from '../crypto'

describe('base64 helpers', () => {
  it('round-trips bytes through toBase64/fromBase64', () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255])
    expect(fromBase64(toBase64(bytes))).toEqual(bytes)
  })

  it('decodes unpadded base64url', () => {
    const bytes = new Uint8Array([251, 255, 191]) // encodes to chars needing - and _
    const url = toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(fromBase64Url(url)).toEqual(bytes)
  })
})

describe('deriveUserKey', () => {
  it('is deterministic for the same password and salt', async () => {
    const key1 = await deriveUserKey('correct horse battery staple', 'somesalt')
    const key2 = await deriveUserKey('correct horse battery staple', 'somesalt')

    const raw1 = await crypto.subtle.exportKey('raw', key1)
    const raw2 = await crypto.subtle.exportKey('raw', key2)
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2))
  })

  it('produces different keys for different salts', async () => {
    const key1 = await deriveUserKey('password', 'salt-a')
    const key2 = await deriveUserKey('password', 'salt-b')

    const raw1 = await crypto.subtle.exportKey('raw', key1)
    const raw2 = await crypto.subtle.exportKey('raw', key2)
    expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2))
  })
})

describe('content encryption', () => {
  it('round-trips an object through encrypt/decrypt', async () => {
    const chapterKey = await generateChapterKey()
    const payload = { title: 'The Great Gatsby', pages: 180 }

    const { encryptedBlob, nonce } = await encrypt(payload, chapterKey)
    const result = await decrypt<typeof payload>(encryptedBlob, nonce, chapterKey)

    expect(result).toEqual(payload)
  })

  it('fails to decrypt with the wrong key', async () => {
    const chapterKey = await generateChapterKey()
    const wrongKey = await generateChapterKey()
    const { encryptedBlob, nonce } = await encrypt({ secret: true }, chapterKey)

    await expect(decrypt(encryptedBlob, nonce, wrongKey)).rejects.toThrow()
  })
})

describe('chapter key wrapping', () => {
  it('round-trips a chapter key through encryptChapterKey/decryptChapterKey', async () => {
    const userKey = await deriveUserKey('password', 'salt')
    const chapterKey = await generateChapterKey()

    const { encryptedChapterKey, keyNonce } = await encryptChapterKey(chapterKey, userKey)
    const unwrapped = await decryptChapterKey(encryptedChapterKey, keyNonce, userKey)

    const originalRaw = await crypto.subtle.exportKey('raw', chapterKey)
    const unwrappedRaw = await crypto.subtle.exportKey('raw', unwrapped)
    expect(new Uint8Array(unwrappedRaw)).toEqual(new Uint8Array(originalRaw))
  })

  it('round-trips a chapter key through an invite secret', async () => {
    const chapterKey = await generateChapterKey()
    const inviteSecret = crypto.getRandomValues(new Uint8Array(32))

    const { encryptedChapterKey, keyNonce } = await wrapChapterKeyWithSecret(chapterKey, inviteSecret)
    const rawUnwrapped = await unwrapChapterKeyWithSecret(encryptedChapterKey, keyNonce, inviteSecret)
    const restored = await importChapterKey(rawUnwrapped)

    const originalRaw = await crypto.subtle.exportKey('raw', chapterKey)
    const restoredRaw = await crypto.subtle.exportKey('raw', restored)
    expect(new Uint8Array(restoredRaw)).toEqual(new Uint8Array(originalRaw))
  })
})
