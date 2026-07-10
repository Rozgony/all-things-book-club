import { Router, Response } from 'express'
import { AuthRequest, requireAuth } from '../middleware/auth'

const router = Router()

router.post('/verify', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({
    userId: req.userId,
    email: req.userEmail,
  })
})

export default router
