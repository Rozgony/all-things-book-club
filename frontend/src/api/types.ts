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
	visibility: 'ACCEPTING_MEMBERS' | 'INVITE_ONLY' | 'MEMBERS_ONLY'
}

export const visibilityReadable = {
	ACCEPTING_MEMBERS: 'Accepting Members (Public)',
	INVITE_ONLY: 'Invite Only (Public)',
	MEMBERS_ONLY: 'Members Only (Private)'
}