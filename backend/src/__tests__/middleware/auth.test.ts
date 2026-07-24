import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../../middleware/auth'
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
	  },
	},
}))

const mockRes = () => {
	const res = {} as Response
	res.status = vi.fn().mockReturnValue(res)
	res.json = vi.fn().mockReturnValue(res)
	return res
}

const mockNext: NextFunction = vi.fn()

beforeEach(() => {
	vi.clearAllMocks()
})

describe('requireAuth middleware', () => {
	it('returns 401 when Authorization header is missing', async () => {
	  const req = { headers: {} } as Request
	  const res = mockRes()

	  await requireAuth(req, res, mockNext)

	  expect(res.status).toHaveBeenCalledWith(401)
	  expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization token' })
	  expect(mockNext).not.toHaveBeenCalled()
	})

	it('returns 401 when token is invalid', async () => {
	  const req = { headers: { authorization: 'Bearer bad-token' } } as Request
	  const res = mockRes()

	  vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
	    data: { user: null },
	    error: { message: 'Invalid token' },
	  } as any)

	  await requireAuth(req, res, mockNext)

	  expect(res.status).toHaveBeenCalledWith(401)
	  expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
	  expect(mockNext).not.toHaveBeenCalled()
	})

	it('calls next() and sets userId when token is valid', async () => {
	  const req = { headers: { authorization: 'Bearer valid-token' } } as Request
	  const res = mockRes()

	  vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
	    data: { user: { id: 'user-123', email: 'test@example.com' } },
	    error: null,
	  } as any)

	  vi.mocked(prisma.user.upsert).mockResolvedValueOnce({} as any)

	  await requireAuth(req as any, res, mockNext)

	  expect(mockNext).toHaveBeenCalled()
	  expect((req as any).userId).toBe('user-123')
	  expect((req as any).userEmail).toBe('test@example.com')
	})

	it('upserts user record on successful auth', async () => {
	  const req = { headers: { authorization: 'Bearer valid-token' } } as Request
	  const res = mockRes()

	  vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
	    data: { user: { id: 'user-123', email: 'test@example.com' } },
	    error: null,
	  } as any)

	  vi.mocked(prisma.user.upsert).mockResolvedValueOnce({} as any)

	  await requireAuth(req as any, res, mockNext)

	  expect(prisma.user.upsert).toHaveBeenCalledWith({
	    where: { id: 'user-123' },
	    create: { id: 'user-123', email: 'test@example.com' },
	    update: {},
	  })
	})
})
