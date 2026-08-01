import { getAndSetChapterKey, getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Meeting, type Topic } from './types'
import { decrypt, encrypt } from '../lib/crypto'

interface MeetingContent {
	videoCallLink?: string
	physicalAddress?: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export async function getMeetingsByChapterId(chapterId: string): Promise<Meeting[]> {
	const headers = await getAuthHeaders()
	const response = await fetch(`${API_BASE}/meetings/chapter/${chapterId}`, {
		method: 'GET',
		headers,
	})
	if (!response.ok) throw new Error(`Failed to fetch meetings: ${response.statusText}`)
	const meetings: Meeting[] = await response.json()

	const chapterKey = getChapterKey(chapterId)
	if (!chapterKey) return meetings

	return Promise.all(meetings.map(async (meeting) => {
		if (!meeting.encryptedBlob || !meeting.nonce) return meeting
		const content = await decrypt<MeetingContent>(meeting.encryptedBlob, meeting.nonce, chapterKey)
		return { ...meeting, videoCallLink: content.videoCallLink ?? null, physicalAddress: content.physicalAddress ?? null }
	}))
}

export async function getMeetingById(id: string): Promise<Meeting> {
	const headers = await getAuthHeaders()

	const res = await fetch(`${API_BASE}/meetings/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch meeting')
	const meeting = await res.json()

	const { encryptedChapterKey, keyNonce  } = meeting.chapterMember[0]

	const chapterKey = await getAndSetChapterKey(meeting.chapterId, encryptedChapterKey, keyNonce)

	if (meeting.encryptedBlob && meeting.nonce) {
		const decrypted = await decrypt<{ videoCallLink?: string; physicalAddress?: string }>(meeting.encryptedBlob, meeting.nonce, chapterKey!)
		meeting.videoCallLink = decrypted.videoCallLink || ''
		meeting.physicalAddress = decrypted.physicalAddress || ''
	}

	if (meeting.chapter?.encryptedBlob && meeting.chapter?.nonce) {
		const decrypted = await decrypt<{ name?: string; description?: string }>(meeting.chapter?.encryptedBlob, meeting.chapter?.nonce, chapterKey!)
		meeting.chapter.name = decrypted.name || ''
		meeting.chapter.description = decrypted.description || ''
	}

	if (!meeting.topics?.length) return meeting

	meeting.topics = await Promise.all(
		meeting.topics.map(async (topic: Topic) => {
			if (!topic.encryptedBlob || !topic.nonce) return topic
			const decrypted = await decrypt<{ title: string; description?: string }>(topic.encryptedBlob, topic.nonce, chapterKey!)
			return { ...topic, title: decrypted.title, description: decrypted.description ?? null, encryptedBlob: null, nonce: null }
		})
	)
	return meeting
}

export async function createMeeting(
	chapterId: string,
	scheduledAt: string,
	duration?: number,
	videoCallLink?: string,
	physicalAddress?: string
): Promise<Meeting> {
	const headers = await getAuthHeaders()

	const content: MeetingContent = {}
	if (videoCallLink) content.videoCallLink = videoCallLink
	if (physicalAddress) content.physicalAddress = physicalAddress

	let encryptedBlob: string | undefined
	let nonce: string | undefined
	if (Object.keys(content).length > 0) {
		const chapterKey = getChapterKey(chapterId)
		if (chapterKey) {
			const encrypted = await encrypt(content, chapterKey)
			encryptedBlob = encrypted.encryptedBlob
			nonce = encrypted.nonce
		}
	}

	const response = await fetch(`${API_BASE}/meetings`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ chapterId, scheduledAt: new Date(scheduledAt).toISOString(), duration, encryptedBlob, nonce })
	})
	if (!response.ok) throw new Error(`Failed to create meeting: ${response.statusText}`)
	const meeting: Meeting = await response.json()
	return { ...meeting, videoCallLink: videoCallLink ?? null, physicalAddress: physicalAddress ?? null }
}

export async function updateMeeting(
	id: string,
	updates: Partial<Meeting> & { chapterId?: string }
): Promise<Meeting> {
	const headers = await getAuthHeaders()

	const data: Partial<Meeting> & { encryptedBlob?: string; nonce?: string } = {}

	if (updates.scheduledAt) {
		data.scheduledAt = updates.scheduledAt
	}
	if (updates.status) {
		data.status = updates.status
	}
	if (updates.duration) {
		data.duration = updates.duration
	}
	if (updates.recurringGroupId) {
		data.recurringGroupId = updates.recurringGroupId
	}

	// Handle encrypted fields (videoCallLink, physicalAddress)
	if (updates.videoCallLink !== undefined || updates.physicalAddress !== undefined) {
		if (!updates.chapterId) throw new Error('chapterId required when updating videoCallLink or physicalAddress')

		const chapterKey = getChapterKey(updates.chapterId)
		if (!chapterKey) throw new Error('Chapter key not available for encryption')

		const content: MeetingContent = {}
		if (updates.videoCallLink !== undefined) content.videoCallLink = updates.videoCallLink || undefined
		if (updates.physicalAddress !== undefined) content.physicalAddress = updates.physicalAddress || undefined

		const encrypted = await encrypt(content, chapterKey)
		data.encryptedBlob = encrypted.encryptedBlob
		data.nonce = encrypted.nonce
	}

	const response = await fetch(`${API_BASE}/meetings/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(data)
	})
	if (!response.ok) throw new Error(`Failed to update meeting: ${response.statusText}`)
	return response.json()
}

export async function deleteMeeting(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const response = await fetch(`${API_BASE}/meetings/${id}`, {
		method: 'DELETE',
		headers
	})
	if (!response.ok) throw new Error(`Failed to delete meeting: ${response.statusText}`)
}
