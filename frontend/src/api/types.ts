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

export enum VisibilityLevel {
	ACCEPTING_MEMBERS = 'ACCEPTING_MEMBERS',
	INVITE_ONLY = 'INVITE_ONLY',
	MEMBERS_ONLY = 'MEMBERS_ONLY'
}

export interface Chapter {
	id: string
	name: string
	description: string | null
	creatorId: string
	createdAt: string
	updatedAt: string
	members: ChapterMember[]
	visibility: VisibilityLevel
}

export const visibilityReadable = {
	ACCEPTING_MEMBERS: 'Accepting Members (Public)',
	INVITE_ONLY: 'Invite Only (Public)',
	MEMBERS_ONLY: 'Members Only (Private)'
}

export enum MeetingStatus {
	SCHEDULED = 'SCHEDULED',
	ACTIVE = 'ACTIVE',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED'
}

export interface Meeting {
	id: string
	chapterId: string
	scheduledAt: string
	duration: number
	status: MeetingStatus
	recurringGroupId: string | null
	createdAt: string
	updatedAt: string
}

export const meetingStatusReadable = {
	SCHEDULED: 'Scheduled',
	ACTIVE: 'Active Now',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled'
}