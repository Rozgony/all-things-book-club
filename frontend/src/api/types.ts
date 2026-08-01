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
  creatorId: string
  isPublic: boolean
  encryptedBlob: string | null
  nonce: string | null
  encryptedChapterKey: string | null
  keyNonce: string | null
  createdAt: string
  updatedAt: string
  chapterMembers?: ChapterMember[]
  // Decrypted fields — populated client-side after decryption
  name: string
  description: string | null
}

export enum MeetingStatus {
	SCHEDULED = 'SCHEDULED',
	ACTIVE = 'ACTIVE',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED'
}

export enum SpinnerSize { 
	LG = 'LG',
	SM = 'SM' 
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
	chapter?: Chapter
	topics?: Topic[]
}

export const meetingStatusReadable = {
	SCHEDULED: 'Scheduled',
	ACTIVE: 'Active Now',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled'
}

export type TopicStatus = 'PENDING' | 'SELECTED' | 'DISCUSSED'

export interface Topic {
	id: string
	chapterId: string
	createdById: string | null
	status: TopicStatus
	createdAt: string
	updatedAt: string
	encryptedBlob?: string
	nonce?: string
	// Decrypted fields — populated client-side after decryption
	title: string
	description: string | null
}