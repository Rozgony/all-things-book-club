import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../app'

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
	  },
	},
}))

import { supabase } from '../../lib/supabase'
import { prisma } from '../../lib/prisma'

beforeEach(() => {
	vi.clearAllMocks()
})

describe('POST /api/auth/verify', () => {
	it('returns 401 when no token provided', async () => {
	  const res = await request(app).post('/api/auth/verify')
	  expect(res.status).toBe(401)
	  expect(res.body).toHaveProperty('error')
	})

	it('returns userId and email for valid token', async () => {
	  vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
	    data: { user: { id: 'user-123', email: 'test@example.com' } },
	    error: null,
	  } as any)

	  vi.mocked(prisma.user.upsert).mockResolvedValueOnce({} as any)

	  const res = await request(app)
	    .post('/api/auth/verify')
	    .set('Authorization', 'Bearer valid-token')

	  expect(res.status).toBe(200)
	  expect(res.body).toEqual({ userId: 'user-123', email: 'test@example.com' })
	})
})
