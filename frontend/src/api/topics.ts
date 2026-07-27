import { decrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Topic, type TopicStatus } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
