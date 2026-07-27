import { getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Meeting, type Topic } from './types'
import { decrypt } from '../lib/crypto'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export async function getMeetingsByChapterId(chapterId: string): Promise<Meeting[]> {
	const headers = await getAuthHeaders()
	const response = await fetch(`${API_BASE}/meetings/chapter/${chapterId}`, {
		method: 'GET',
		headers,
	})
	if (!response.ok) throw new Error(`Failed to fetch meetings: ${response.statusText}`)
	return response.json()
}

export async function getMeetingById(id: string): Promise<Meeting> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/meetings/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch meeting')
	const meeting = await res.json()

	if (!meeting.topics?.length) return meeting

	const key = getChapterKey(meeting.chapterId)
	meeting.topics = await Promise.all(
		meeting.topics.map(async (topic: Topic) => {
			if (!topic.encryptedBlob || !topic.nonce) return topic
			const decrypted = await decrypt<{ title: string; description?: string }>(topic.encryptedBlob, topic.nonce, key)
			return { ...topic, title: decrypted.title, description: decrypted.description ?? null, encryptedBlob: null, nonce: null }
		})
	)
	return meeting
}

export async function createMeeting(
	chapterId: string,
	scheduledAt: string,
	duration?: number
): Promise<Meeting> {
	const headers = await getAuthHeaders()
	const response = await fetch(`${API_BASE}/meetings`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ chapterId, scheduledAt: new Date(scheduledAt).toISOString(), duration })
	})
	if (!response.ok) throw new Error(`Failed to create meeting: ${response.statusText}`)
	return response.json()
}

export async function updateMeeting(
	id: string,
	updates: Partial<Meeting>
): Promise<Meeting> {
	const headers = await getAuthHeaders()
	const response = await fetch(`${API_BASE}/meetings/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(updates)
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
