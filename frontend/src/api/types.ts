export interface UserProfile {
	id: string
	email: string
	name: string | null
	avatarUrl: string | null
	timezone: string
}

export interface ChapterMember {
	id: string
	userId: string
	chapterId: string
	role: 'ADMIN' | 'MEMBER'
	joinedAt: string
	users?: UserProfile[]
}

export interface Chapter {
	id: string
	name: string
	description: string | null
	creatorId: string
	createdAt: string
	updatedAt: string
	members: ChapterMember[]
}