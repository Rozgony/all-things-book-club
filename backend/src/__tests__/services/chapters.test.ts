import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import { createChapter } from '../../services/chapters.service'
import { VisibilityLevel } from '@prisma/client'

vi.mock('../../lib/prisma', () => ({
	prisma: {
	  chapter: {
	    create: vi.fn(),
	    findUnique: vi.fn(),
	    findMany: vi.fn(),
	    update: vi.fn(),
	    delete: vi.fn(),
	  },
	  chapterMember: {
	    create: vi.fn(),
	    deleteMany: vi.fn(),
	  },
	  chapterInvitation: {
	    create: vi.fn(),
	    findMany: vi.fn(),
	    findUnique: vi.fn(),
	    delete: vi.fn(),
	  },
	  $transaction: vi.fn(),
	},
}))

// Fixtures
const mockMember = {
	id: 'member-123',
	userId: 'user-123',
	chapterId: 'chapter-123',
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
	visibility: VisibilityLevel.MEMBERS_ONLY
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('createChapter', () => {
	it('creates a chapter and seeds creator as ADMIN member', async () => {
	  vi.mocked(prisma.chapter.create).mockResolvedValueOnce(mockChapter)

	  const result = await createChapter('user-123', { name: 'Test Chapter', visibility: VisibilityLevel.MEMBERS_ONLY })

	  expect(prisma.chapter.create).toHaveBeenCalledWith({
	    data: {
	      name: 'Test Chapter',
	      description: undefined,
	      creatorId: 'user-123',
		  visibility: VisibilityLevel.MEMBERS_ONLY,
	      members: {
	        create: { userId: 'user-123', role: 'ADMIN' },
	      },
	    },
	    include: { members: true },
	  })
	  expect(result).toEqual(mockChapter)
	})
})

// TODO: describe('getChapterById') — test found and null cases
// TODO: describe('getChaptersByUserId') — test returns array, empty array
// TODO v2: describe('addChapterMember') — test creates ChapterMember with correct role
// TODO v2: describe('removeChapterMember') — test deleteMany called with chapterId + userId
// TODO v2: describe('createChapterInvitation') — test expiresAt is ~30 days from now
// TODO v2: describe('getChapterInvitationsByEmail') — test filters by email
// TODO v2: describe('acceptChapterInvitation') — test $transaction called, member created, invite deleted
// TODO v2: describe('rejectChapterInvitation') — test delete called with correct id
// TODO v3: describe('updateChapter') — test partial update
// TODO v3: describe('deleteChapter') — test delete called with correct id
