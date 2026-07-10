import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { getUserById, updateUser } from '../../services/users'

const mockUser = { id: 'user-123', email: 'test@example.com', name: null, avatarUrl: null, timezone: 'UTC', createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserById', () => {
  it('returns user when found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)

    const result = await getUserById('user-123')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } })
    expect(result).toEqual(mockUser)
  })

  it('returns null when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    const result = await getUserById('nonexistent')

    expect(result).toBeNull()
  })
})

describe('updateUser', () => {
  it('updates and returns user with provided fields', async () => {
    const updated = { ...mockUser, name: 'New Name', timezone: 'America/New_York' }
    vi.mocked(prisma.user.update).mockResolvedValueOnce(updated)

    const result = await updateUser('user-123', { name: 'New Name', timezone: 'America/New_York' })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { name: 'New Name', timezone: 'America/New_York' },
    })
    expect(result?.name).toBe('New Name')
  })
})
