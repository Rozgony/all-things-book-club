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
    chapter: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../services/chapters.service', () => ({
  createChapter: vi.fn(),
  getChapterById: vi.fn(),
  getChaptersByUserId: vi.fn(),
}))

import { supabase } from '../../lib/supabase'
import { prisma } from '../../lib/prisma'
import { createChapter, getChapterById, getChaptersByUserId } from '../../services/chapters.service'

// Fixtures
const mockMember = {
  id: 'member-123',
  userId: 'user-123',
  chapterId: 'chapter-123',
  role: 'ADMIN' as const,
  joinedAt: new Date(),
}

const mockMember2 = {
  id: 'member-234',
  userId: 'user-234',
  chapterId: 'chapter-234',
  role: 'ADMIN' as const,
  joinedAt: new Date(),
}


const mockChapter = {
  id: 'chapter-123',
  name: 'Test Chapter',
  description: null,
  creatorId: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  members: [mockMember],
}

// Helper: sets up auth middleware to pass for 'user-123'
const authenticatedRequest = (method: 'get' | 'post' | 'patch' | 'delete', url: string, user?: Object) => {
  const thisUser = user || { id: 'user-123', email: 'test@example.com' }
  vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
    data: { user: thisUser },
    error: null,
  } as any)
  vi.mocked(prisma.user.upsert).mockResolvedValueOnce({} as any)
  return request(app)[method](url).set('Authorization', 'Bearer valid-token')
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── POST /api/chapters ───────────────────────────────────────────────────────

describe('POST /api/chapters', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/chapters').send({ name: 'Test Chapter' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const res = await authenticatedRequest('post', '/api/chapters').send({})
    expect(res.status).toBe(400)
  })

  it('creates and returns a chapter with 201', async () => {
    vi.mocked(createChapter).mockResolvedValueOnce(mockChapter)

    const res = await authenticatedRequest('post', '/api/chapters').send({ name: 'Test Chapter' })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('chapter-123')
    expect(createChapter).toHaveBeenCalledWith('user-123', { name: 'Test Chapter', description: undefined })
  })
})

// ─── GET /api/chapters ────────────────────────────────────────────────────────
describe('GET /api/chapters', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/chapters')
    expect(res.status).toBe(401)
  })

  it('returns a 200 with an array of chapters', async () => {
    vi.mocked(getChaptersByUserId).mockResolvedValueOnce([mockChapter])

    const res = await authenticatedRequest('get', '/api/chapters')

    expect(res.status).toBe(200)
    expect(res.body[0].id).toBe('chapter-123')
    expect(getChaptersByUserId).toHaveBeenCalledWith('user-123')
  })
})


// ─── GET /api/chapters/:id ────────────────────────────────────────────────────

// TODO: describe('GET /api/chapters/:id') — 401 unauthenticated, 404 not found, 403 not a member, 200 success
describe('GET /api/chapters/:id', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/chapters')
    expect(res.status).toBe(401)
  })

  it('returns a 404 if not found', async () => {
    vi.mocked(getChapterById).mockResolvedValueOnce(null)

    const res = await authenticatedRequest('get', '/api/chapters/chapter-12345')

    expect(res.status).toBe(404)
    expect(res.body.id).toBe(undefined)
    expect(getChapterById).toHaveBeenCalledWith('chapter-12345')
  })

  it('returns a 403 if not a member', async () => {
    vi.mocked(getChapterById).mockResolvedValueOnce(mockChapter)

    const res = await authenticatedRequest('get', '/api/chapters/chapter-123', mockMember2)

    expect(res.status).toBe(403)
    expect(res.body.id).toBe(undefined)
    expect(getChapterById).toHaveBeenCalledWith('chapter-123')
  })

  it('returns a 200 with a chapter', async () => {
    vi.mocked(getChapterById).mockResolvedValueOnce(mockChapter)

    const res = await authenticatedRequest('get', '/api/chapters/chapter-123')

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('chapter-123')
    expect(getChapterById).toHaveBeenCalledWith('chapter-123')
  })
})
