import { Router, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import {
	createMeeting,
	getMeetingById,
	getMeetingsByChapterId,
	updateMeeting,
	deleteMeeting,
	UpdateMeetingData,
} from '../services/meetings.service'

const router = Router()

// POST / — create a meeting
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const { scheduledAt, duration, chapterId } = req.body
	  console.log('scheduledAt: '+scheduledAt);
	  console.log('duration: '+duration);
	  console.log('chapterId: '+chapterId);
	  if (!chapterId || !scheduledAt) throw new AppError(400, 'chapterId and scheduledAt are required')

	  const chapter = await createMeeting({ scheduledAt, duration, chapterId })
	  res.status(201).json(chapter)
	} catch (err) {
	  next(err)
	}
})

// GET / — get all meetings of a chapter
router.get('/chapter/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params
		console.log('chapterId: '+id)
		const meetings = await getMeetingsByChapterId(id as string)
		console.log(meetings)
		res.json(meetings || [])
	} catch (err) {
	  	console.error('Error fetching meetings:', err)
	  	res.json([])
	}
})

// GET / — get a specific meeting by id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const id = req.params.id as string
		console.log('id: '+id)
		const includeNotes = true;
		const includeTopics = true;
		const meeting = await getMeetingById(id,includeNotes,includeTopics)
		if (!meeting) throw new AppError(404, 'meeting not found')

		res.json(meeting)
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
		const meeting = await getMeetingById(req.params.id as string)
		if (!meeting) throw new AppError(404, 'meeting not found')

		// TODO: do I need ownership/permissions checks here?

		const { scheduledAt, duration, status, discussionNotes, topics } = req.body

		let meetingData: Partial<UpdateMeetingData> = {};
		if (scheduledAt) meetingData.scheduledAt = scheduledAt
		if (duration) meetingData.duration = duration
		if (status) meetingData.status = status
		if (topics) meetingData.topics = topics
		if (discussionNotes) meetingData.discussionNotes = discussionNotes

		const updated = await updateMeeting(req.params.id as string, meetingData as UpdateMeetingData)
		res.json(updated)
	} catch (err) {
	  next(err)
	}
})

// DELETE /:id — delete chapter (creator only)
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const meeting = await getMeetingById(req.params.id as string)
		if (!meeting) throw new AppError(404, 'meeting not found')

		// TODO: do I need ownership/permissions checks here?

		await deleteMeeting(req.params.id as string)
		res.status(204).send()
	} catch (err) {
	  	next(err)
	}
})

export default router