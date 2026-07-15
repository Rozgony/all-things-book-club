import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
	userId?: string
	userEmail?: string
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
	const token = req.headers.authorization?.replace('Bearer ', '')

	if (!token) {
	  res.status(401).json({ error: 'Missing authorization token' })
	  return
	}

	const { data: { user }, error } = await supabase.auth.getUser(token)

	if (error || !user) {
	  res.status(401).json({ error: 'Invalid or expired token' })
	  return
	}

	// Create user record on first authenticated request if it doesn't exist yet
	await prisma.user.upsert({
	  where: { id: user.id },
	  create: { id: user.id, email: user.email! },
	  update: {},
	})

	req.userId = user.id
	req.userEmail = user.email
	next()
}
