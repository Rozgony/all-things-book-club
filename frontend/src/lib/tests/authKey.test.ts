import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deriveAndStoreUserKey } from '../authKey'
import { deriveUserKey } from '../crypto'
import { setUserKey } from '../keyStore'

vi.mock('../crypto', () => ({
  deriveUserKey: vi.fn(),
}))

vi.mock('../keyStore', () => ({
  setUserKey: vi.fn(),
}))

describe('deriveAndStoreUserKey', () => {
  beforeEach(() => {
    vi.mocked(deriveUserKey).mockResolvedValue({} as CryptoKey)
    vi.mocked(setUserKey).mockResolvedValue(undefined)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetches the salt, derives the key, and stores it', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ salt: 'server-salt' }),
    } as Response)

    await deriveAndStoreUserKey('access-token', 'my-password')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/me/salt'),
      expect.objectContaining({ headers: { Authorization: 'Bearer access-token' } })
    )
    expect(deriveUserKey).toHaveBeenCalledWith('my-password', 'server-salt')
    expect(setUserKey).toHaveBeenCalled()
  })

  it('throws when the salt request fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    await expect(deriveAndStoreUserKey('access-token', 'my-password')).rejects.toThrow(
      'Failed to initialize encryption. Please try again.'
    )
    expect(deriveUserKey).not.toHaveBeenCalled()
  })
})
