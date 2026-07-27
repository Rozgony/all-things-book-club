import { decrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Topic, type TopicStatus, type Meeting } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// export async function getMeeting(id: string): Promise<MeetingWithTopics> {
export async function getMeeting(id: string): Promise<Meeting> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/meetings/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch meeting')
	const meeting = await res.json()

	if (!meeting.topics.length) {
		return meeting; // noting to decrypt so return as is.
	}
	
	const key = getChapterKey(meeting.chapterId)
	meeting.topics.forEach(async (topic: Topic) => {
		if (!topic.encryptedBlob && !topic.nonce) return
		const decrypted: Partial<Topic> = await decrypt<Meeting>(topic.encryptedBlob!, topic.nonce!, key)
		topic.title = decrypted.title || ''
		topic.description = decrypted.description || ''
		delete topic.encryptedBlob
		delete topic.nonce
	})
	return meeting;
}

export async function createTopic(meetingId: string, title: string, description?: string): Promise<Topic> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/topics`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ meetingId, title, description })
	})
	if (!res.ok) throw new Error('Failed to create topic')
	return res.json()
}

export async function updateTopicStatus(id: string, wheelStatus: TopicStatus): Promise<Topic> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/topics/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ wheelStatus })
	})
	if (!res.ok) throw new Error('Failed to update topic')
	return res.json()
}

export async function deleteTopic(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/topics/${id}`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to delete topic')
}
