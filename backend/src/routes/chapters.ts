import { Router, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import {
  createChapter,
  getChapterById,
  getChaptersByUserId
} from '../services/chapters.service'

const router = Router()

// POST / — create a chapter
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body
    if (!name) throw new AppError(400, 'name is required')

    const chapter = await createChapter(req.userId!, { name, description })
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

    const chapter = await getChapterById(id)
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

// TODO v3: PATCH /:id — update chapter name/description (updateChapter, admin only)
// TODO v3: DELETE /:id — delete chapter (deleteChapter, creator only)
// TODO v3: DELETE /:id/members/:userId — remove member (removeChapterMember, admin only)

export default router