import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import authRouter from './auth'
import usersRouter from './users'
import chaptersRouter from './chapters'
import meetingsRouter from './meetings'
import topicsRouter from './topics'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', requireAuth, usersRouter)
router.use('/chapters', requireAuth, chaptersRouter)
router.use('/meetings', requireAuth, meetingsRouter)
router.use('/topics', requireAuth, topicsRouter)

export default router
