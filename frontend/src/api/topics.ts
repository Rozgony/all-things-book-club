import { encrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Topic, type TopicStatus } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export async function createTopic(chapterID: string, meetingId: string, title: string, description?: string): Promise<Topic> {
	const headers = await getAuthHeaders()
	const chapterKey = getChapterKey(chapterID)

	const { encryptedBlob, nonce } = await encrypt(
		{ title, description },
		chapterKey
	)
	const res = await fetch(`${API_BASE}/topics`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ chapterID, meetingId, encryptedBlob, nonce })
	})

	if (!res.ok) throw new Error('Failed to create topic')
	const response = await res.json()
	return {
		id: response.id,
		title,
		description: description || '',
		createdAt: response.createdAt, 
		updatedAt: response.updatedAt,
		status: response.status,
		chapterId: response.chapterId, 
		meetingId: response.meetingId,
		createdById: response.createdById,
	} as Topic
}

export async function updateTopicStatus(id: string, topic: Topic, status: TopicStatus): Promise<Topic> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/topics/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ status })
	})
	if (!res.ok) throw new Error('Failed to update topic')

	return {
		...topic,
		id,
		status,
	} as Topic
}

export async function deleteTopic(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/topics/${id}`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to delete topic')
}
