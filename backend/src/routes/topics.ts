import { Router, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import {
	createTopic,
	getTopicById,
	updateTopicStatus,
	deleteTopic,
} from '../services/topics.service'
import { TopicStatus } from '@prisma/client'

const router = Router()

// POST / — create a topic for a meeting
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const { meetingId, title, description } = req.body
		if (!meetingId || !title) throw new AppError(400, 'meetingId and title are required')

		const topic = await createTopic({
			meetingId,
			title,
			description,
			createdById: req.user?.id
		})
		res.status(201).json(topic)
	} catch (err) {
		next(err)
	}
})

// PATCH /:id — update topic wheel status
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const topicId = req.params.id as string
		const topic = await getTopicById(topicId)
		if (!topic) throw new AppError(404, 'Topic not found')

		const { wheelStatus } = req.body
		if (!wheelStatus) throw new AppError(400, 'wheelStatus is required')

		const updated = await updateTopicStatus(topicId, wheelStatus as TopicStatus)
		res.json(updated)
	} catch (err) {
		next(err)
	}
})

// DELETE /:id — delete a topic
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
		const topicId = req.params.id as string
		const topic = await getTopicById(topicId)
		if (!topic) throw new AppError(404, 'Topic not found')

		await deleteTopic(topicId)
		res.status(204).send()
	} catch (err) {
		next(err)
	}
})

export default router
