import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import authRouter from './auth'
import usersRouter from './users'
import chaptersRouter from './chapters'
import meetingsRouter from './meetings'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', requireAuth, usersRouter)
router.use('/chapters', requireAuth, chaptersRouter)
router.use('/meetings', requireAuth, meetingsRouter)

export default router
