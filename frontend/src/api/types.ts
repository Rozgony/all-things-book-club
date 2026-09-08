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
	users?: UserProfile[]
	encryptedChapterKey?: string | null
	keyNonce?: string | null
	encryptedBlob?: string | null
	nonce?: string | null
	// Decrypted fields — populated client-side after decryption
	name?: string
	joinedAt?: string
}

export interface Chapter {
  id: string
  creatorId: string
  isPublic: boolean
  encryptedBlob: string | null
  nonce: string | null
  encryptedChapterKey: string | null
  keyNonce: string | null
  chapterMembers?: ChapterMember[]
  // Decrypted fields — populated client-side after decryption
  name: string
  description: string | null
  createdAt: string
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
	encryptedBlob?: string | null
	nonce?: string | null
	chapter?: Chapter
	topics?: Topic[]
	// Decrypted fields — populated client-side after decryption
	videoCallLink?: string | null
	physicalAddress?: string | null
}

export const meetingStatusReadable = {
	SCHEDULED: 'Scheduled',
	ACTIVE: 'Active Now',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled'
}

export type TopicStatus = 'PENDING' | 'SELECTED' | 'DISCUSSED'

export interface Theme {
	id: string
	chapterId: string
	encryptedBlob?: string | null
	nonce?: string | null
	createdAt: string
	// Decrypted field — populated client-side after decryption
	name: string
}

export interface Topic {
	id: string
	chapterId: string
	url?: string
	createdById: string | null
	status: TopicStatus
	createdAt: string
	encryptedBlob?: string
	nonce?: string
	themeIds?: string[] | null
	// Decrypted fields — populated client-side after decryption
	title: string
	description: string | null
}