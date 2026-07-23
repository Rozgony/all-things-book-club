import { Router, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import {
	createChapter,
	getChapterById,
	getChaptersByUserId,
	updateChapter,
	deleteChapter,
} from '../services/chapters.service'

const router = Router()

// POST / — create a chapter
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const { name, description, visibility } = req.body
	  if (!name) throw new AppError(400, 'name is required')

	  const chapter = await createChapter(req.userId!, { name, description, visibility })
	  res.status(201).json(chapter)
	} catch (err) {
	  next(err)
	}
})

// GET / — get all chapters of a user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const chapters = await getChaptersByUserId(req.userId!)
	  res.json(chapters)
	} catch (err) {
	  next(err)
	}
})

// GET / — get all chapters of a user
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const id = req.params.id as string
	  const includeUsers = true;
	  const chapter = await getChapterById(id,includeUsers)
	  if (!chapter) throw new AppError(404, 'chapter not found')
	  if (!chapter.members.some(member => member.userId === req.userId)) throw new AppError(403, 'you can only see your own chapters')

	  res.json(chapter)
	} catch (err) {
	  next(err)
	}
})

// TODO v2: GET /invitations — get invitations for current user's email (getChapterInvitationsByEmail)
// TODO v2: POST /invitations/:invitationId/accept — accept invite (acceptChapterInvitation)
// TODO v2: POST /invitations/:invitationId/reject — reject invite (rejectChapterInvitation)
// TODO v2: POST /:id/members — add member to chapter (addChapterMember, admin only)
// TODO v2: POST /:id/invitations — create invitation (createChapterInvitation, member can invite)

// PATCH /:id — update chapter name/description (admin only)
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const chapterId = req.params.id as string
	  const chapter = await getChapterById(chapterId)
	  if (!chapter) throw new AppError(404, 'chapter not found')

	  const membership = chapter.members.find(m => m.userId === req.userId)
	  if (!membership) throw new AppError(403, 'you are not a member of this chapter')
	  if (membership.role !== 'ADMIN') throw new AppError(403, 'only admins can update chapters')

	  const { name, description, visibility } = req.body
	  const updated = await updateChapter(chapterId, { name, description, visibility })
	  res.json(updated)
	} catch (err) {
	  next(err)
	}
})

// DELETE /:id — delete chapter (creator only)
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const chapterId = req.params.id as string
	  const chapter = await getChapterById(chapterId)
	  if (!chapter) throw new AppError(404, 'chapter not found')
	  if (chapter.creatorId !== req.userId) throw new AppError(403, 'only the creator can delete this chapter')

	  await deleteChapter(chapterId)
	  res.status(204).send()
	} catch (err) {
	  next(err)
	}
})

export default router