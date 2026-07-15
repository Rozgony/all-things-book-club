import { Router, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { getUserById, updateUser } from '../services/users'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const user = await getUserById(req.userId!)
	  if (!user) throw new AppError(404, 'User not found')
	  res.json(user)
	} catch (err) {
	  next(err)
	}
})

router.patch('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
	try {
	  const { name, avatarUrl, timezone } = req.body
	  const user = await updateUser(req.userId!, { name, avatarUrl, timezone })
	  res.json(user)
	} catch (err) {
	  next(err)
	}
})

export default router
