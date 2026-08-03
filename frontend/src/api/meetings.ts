import { getAndSetChapterKey, getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Meeting, type Topic, type MeetingFrequency, type RecurringRule } from './types'
import { decrypt, encrypt } from '../lib/crypto'

interface MeetingLocationContent {
	videoCallLink?: string
	physicalAddress?: string
}
interface MeetingContent {
	discussionNotes?: string
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
		const [content, locationContent] = await Promise.all([
			(meeting.encryptedBlob && meeting.nonce)
				? decrypt<MeetingContent>(meeting.encryptedBlob, meeting.nonce, chapterKey)
				: Promise.resolve({}),
			(meeting.locationEncryptedBlob && meeting.locationNonce)
				? decrypt<MeetingLocationContent>(meeting.locationEncryptedBlob, meeting.locationNonce, chapterKey)
				: Promise.resolve({}),
		]) as [content: MeetingContent, locationContent: MeetingLocationContent]
		return { ...meeting, videoCallLink: locationContent.videoCallLink ?? null, physicalAddress: locationContent.physicalAddress ?? null, discussionNotes: content.discussionNotes ?? null }
	}))
}

export async function getMeetingById(id: string): Promise<Meeting> {
	const headers = await getAuthHeaders()

	const res = await fetch(`${API_BASE}/meetings/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch meeting')
	const meeting = await res.json()

	const { encryptedChapterKey, keyNonce  } = meeting.chapterMember[0]

	const chapterKey = await getAndSetChapterKey(meeting.chapterId, encryptedChapterKey, keyNonce)

	if (chapterKey && ((meeting.encryptedBlob && meeting.nonce) || (meeting.locationEncryptedBlob && meeting.locationNonce))) {
		const [content, locationContent] = await Promise.all([
			(meeting.encryptedBlob && meeting.nonce)
				? decrypt<MeetingContent>(meeting.encryptedBlob, meeting.nonce, chapterKey)
				: Promise.resolve({}),
			(meeting.locationEncryptedBlob && meeting.locationNonce)
				? decrypt<MeetingLocationContent>(meeting.locationEncryptedBlob, meeting.locationNonce, chapterKey)
				: Promise.resolve({}),
		]) as [content: MeetingContent, locationContent: MeetingLocationContent]
		meeting.videoCallLink = locationContent.videoCallLink || ''
		meeting.physicalAddress = locationContent.physicalAddress || ''
		meeting.discussionNotes = content.discussionNotes || ''
	}

	if (chapterKey && meeting.chapter?.encryptedBlob && meeting.chapter?.nonce) {
		const decrypted = await decrypt<{ name?: string; description?: string }>(meeting.chapter?.encryptedBlob, meeting.chapter?.nonce, chapterKey)
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

	const locationContent: MeetingLocationContent = {}
	if (videoCallLink) locationContent.videoCallLink = videoCallLink
	if (physicalAddress) locationContent.physicalAddress = physicalAddress

	let locationEncryptedBlob: string | undefined
	let locationNonce: string | undefined
	if (Object.keys(locationContent).length > 0) {
		const chapterKey = getChapterKey(chapterId)
		if (chapterKey) {
			const encrypted = await encrypt(locationContent, chapterKey)
			locationEncryptedBlob = encrypted.encryptedBlob
			locationNonce = encrypted.nonce
		}
	}

	const response = await fetch(`${API_BASE}/meetings`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ 
			chapterId, 
			scheduledAt: 
			new 
			Date(scheduledAt).toISOString(), 
			duration, 
			locationEncryptedBlob, 
			locationNonce, 
			encryptedBlob: undefined,
    		nonce: undefined
		})
	})
	if (!response.ok) throw new Error(`Failed to create meeting: ${response.statusText}`)
	const meeting: Meeting = await response.json()
	return { ...meeting, videoCallLink: videoCallLink ?? null, physicalAddress: physicalAddress ?? null }
}

export async function createRecurringRule(
	chapterId: string,
	frequency: MeetingFrequency,
	interval: number,
	startDate: string,
	endDate: string | undefined,
	duration: number,
	videoCallLink?: string,
	physicalAddress?: string
): Promise<Meeting> {
	const headers = await getAuthHeaders()

	const locationContent: MeetingLocationContent = {}
	if (videoCallLink) locationContent.videoCallLink = videoCallLink
	if (physicalAddress) locationContent.physicalAddress = physicalAddress

	let locationEncryptedBlob: string | undefined
	let locationNonce: string | undefined
	if (Object.keys(locationContent).length > 0) {
		const chapterKey = getChapterKey(chapterId)
		if (chapterKey) {
			const encrypted = await encrypt(locationContent, chapterKey)
			locationEncryptedBlob = encrypted.encryptedBlob
			locationNonce = encrypted.nonce
		}
	}

	const response = await fetch(`${API_BASE}/recurring-rules`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			chapterId,
			frequency,
			interval,
			startDate: new Date(startDate).toISOString(),
			endDate: endDate ? new Date(endDate).toISOString() : undefined,
			duration,
			locationEncryptedBlob,
			locationNonce
		})
	})
	if (!response.ok) {
		if (response.status === 409) throw new Error('This chapter already has an active recurring meeting schedule.')
		throw new Error(`Failed to create recurring meeting: ${response.statusText}`)
	}
	const meeting: Meeting = await response.json()
	return { ...meeting, videoCallLink: videoCallLink ?? null, physicalAddress: physicalAddress ?? null }
}

export async function getRecurringRule(ruleId: string): Promise<RecurringRule> {
	const headers = await getAuthHeaders()
	const response = await fetch(`${API_BASE}/recurring-rules/${ruleId}`, {
		method: 'GET',
		headers,
	})
	if (!response.ok) throw new Error(`Failed to fetch recurring rule: ${response.statusText}`)
	return response.json()
}

export async function updateRecurringRule(
	ruleId: string,
	updates: { frequency?: MeetingFrequency; interval?: number; duration?: number; endDate?: string | null }
): Promise<RecurringRule> {
	const headers = await getAuthHeaders()

	const data: { frequency?: MeetingFrequency; interval?: number; duration?: number; endDate?: string; clearEndDate?: boolean } = {}
	if (updates.frequency) data.frequency = updates.frequency
	if (updates.interval !== undefined) data.interval = updates.interval
	if (updates.duration !== undefined) data.duration = updates.duration
	if (updates.endDate === null) {
		data.clearEndDate = true
	} else if (updates.endDate) {
		data.endDate = new Date(updates.endDate).toISOString()
	}

	const response = await fetch(`${API_BASE}/recurring-rules/${ruleId}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(data)
	})
	if (!response.ok) throw new Error(`Failed to update recurring rule: ${response.statusText}`)
	return response.json()
}

// TODO: Test scenario where it doesn't send all the encrypted fields and throws an error. 
export async function updateMeeting(
	id: string,
	updates: Partial<Meeting> & { chapterId?: string }
): Promise<Meeting> {
	const headers = await getAuthHeaders()

	const data: Partial<Meeting> & { encryptedBlob?: string; nonce?: string; locationEncryptedBlob?: string; locationNonce?: string } = {}

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

	// Handle location fields (videoCallLink, physicalAddress) — these share their own
	// blob, independent of discussionNotes. Callers must pass the full current set of
	// these fields — whichever aren't being changed should still be included to avoid
	// overwriting them.
	if (updates.videoCallLink !== undefined || updates.physicalAddress !== undefined) {
		if (!updates.chapterId) throw new Error('chapterId required when updating videoCallLink or physicalAddress')

		const chapterKey = getChapterKey(updates.chapterId)
		if (!chapterKey) throw new Error('Chapter key not available for encryption')

		const locationContent: MeetingLocationContent = {}
		if (updates.videoCallLink !== undefined) locationContent.videoCallLink = updates.videoCallLink || undefined
		if (updates.physicalAddress !== undefined) locationContent.physicalAddress = updates.physicalAddress || undefined

		const encrypted = await encrypt(locationContent, chapterKey)
		data.locationEncryptedBlob = encrypted.encryptedBlob
		data.locationNonce = encrypted.nonce
	}

	// Handle discussionNotes — its own independent blob, never carried forward on
	// recurring meetings.
	if (updates.discussionNotes !== undefined) {
		if (!updates.chapterId) throw new Error('chapterId required when updating discussionNotes')

		const chapterKey = getChapterKey(updates.chapterId)
		if (!chapterKey) throw new Error('Chapter key not available for encryption')

		const content: MeetingContent = { discussionNotes: updates.discussionNotes || undefined }

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
