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

export enum MeetingFrequency {
	MINUTES = 'MINUTES',
	DAILY = 'DAILY',
	WEEKLY = 'WEEKLY',
	MONTHLY = 'MONTHLY',
	MONTHLY_WEEKDAY = 'MONTHLY_WEEKDAY'
}

export const meetingFrequencyReadable = {
	MINUTES: 'Minutes',
	DAILY: 'Days',
	WEEKLY: 'Weeks',
	MONTHLY: 'Months (same date)',
	MONTHLY_WEEKDAY: 'Months (same weekday, e.g. 1st Thursday)'
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
	locationEncryptedBlob?: string | null
	locationNonce?: string | null
	chapter?: Chapter
	topics?: Topic[]
	// Decrypted fields — populated client-side after decryption
	videoCallLink?: string | null
	physicalAddress?: string | null
	discussionNotes?: string | null
}

export const meetingStatusReadable = {
	SCHEDULED: 'Scheduled',
	ACTIVE: 'Active Now',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled'
}

export interface RecurringRule {
	id: string
	chapterId: string
	frequency: MeetingFrequency
	interval: number
	startDate: string
	endDate: string | null
	duration: number
}

export type TopicStatus = 'PENDING' | 'SELECTED' | 'DISCUSSED'

export interface Theme {
	id: string
	chapterId: string
	encryptedBlob?: string | null
	nonce?: string | null
	// Decrypted fields — populated client-side after decryption
	name: string
	createdAt: string
}

export interface Topic {
	id: string
	chapterId: string
	url?: string
	createdById: string | null
	status: TopicStatus
	encryptedBlob?: string
	nonce?: string
	themeIds?: string[] | null
	// Decrypted fields — populated client-side after decryption
	title: string
	description: string | null
	createdAt: string
}