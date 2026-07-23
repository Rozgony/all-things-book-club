import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../app'
import { supabase } from '../../lib/supabase'
import { prisma } from '../../lib/prisma'

vi.mock('../../lib/supabase', () => ({
	supabase: {
	  auth: {
	    getUser: vi.fn(),
	  },
	},
}))

vi.mock('../../lib/prisma', () => ({
	prisma: {
	  user: {
	    upsert: vi.fn(),
	    findUnique: vi.fn(),
	    update: vi.fn(),
	  },
	},
}))

const mockUser = { id: 'user-123', email: 'test@example.com', name: null, avatarUrl: null, timezone: 'UTC', createdAt: new Date(), updatedAt: new Date() }

const authenticatedRequest = (method: 'get' | 'patch', url: string) => {
	vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
	  data: { user: { id: 'user-123', email: 'test@example.com' } },
	  error: null,
	} as any)
	vi.mocked(prisma.user.upsert).mockResolvedValueOnce({} as any)
	return request(app)[method](url).set('Authorization', 'Bearer valid-token')
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('GET /api/users/me', () => {
	it('returns 401 when no token provided', async () => {
	  const res = await request(app).get('/api/users/me')
	  expect(res.status).toBe(401)
	})

	it('returns user profile for authenticated user', async () => {
	  vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser)

	  const res = await authenticatedRequest('get', '/api/users/me')

	  expect(res.status).toBe(200)
	  expect(res.body.id).toBe('user-123')
	  expect(res.body.email).toBe('test@example.com')
	})

	it('returns 404 when user record not found', async () => {
	  vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

	  const res = await authenticatedRequest('get', '/api/users/me')

	  expect(res.status).toBe(404)
	  expect(res.body).toHaveProperty('error')
	})
})

describe('PATCH /api/users/me', () => {
	it('returns 401 when no token provided', async () => {
	  const res = await request(app).patch('/api/users/me').send({ name: 'Test User' })
	  expect(res.status).toBe(401)
	})

	it('updates and returns user profile', async () => {
	  const updated = { ...mockUser, name: 'Test User' }
	  vi.mocked(prisma.user.update).mockResolvedValueOnce(updated)

	  const res = await authenticatedRequest('patch', '/api/users/me').send({ name: 'Test User' })

	  expect(res.status).toBe(200)
	  expect(res.body.name).toBe('Test User')
	})
})
