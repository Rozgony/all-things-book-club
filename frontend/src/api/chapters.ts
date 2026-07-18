import { getAuthHeaders } from './auth'
import type { Chapter } from './types'

export async function getChapters(): Promise<Chapter[]> {
	const headers = await getAuthHeaders()
	const res = await fetch('/api/chapters', { headers })
	if (!res.ok) throw new Error('Failed to fetch chapters')
	return res.json()
}

export async function getChapter(id: string): Promise<Chapter> {
	const headers = await getAuthHeaders()
	const res = await fetch(`/api/chapters/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch chapter')
	return res.json()
}

export async function createChapter(data: { name: string; description?: string }): Promise<Chapter> {
	const headers = await getAuthHeaders()
	const res = await fetch('/api/chapters', {
	  method: 'POST',
	  headers,
	  body: JSON.stringify(data),
	})
	if (!res.ok) throw new Error('Failed to create chapter')
	return res.json()
}

export async function updateChapter(id: string, data: { name?: string; description?: string,  visibility?: string }): Promise<Chapter> {
	const headers = await getAuthHeaders()
	const res = await fetch(`/api/chapters/${id}`, {
	  method: 'PATCH',
	  headers,
	  body: JSON.stringify(data),
	})
	if (!res.ok) throw new Error('Failed to update chapter')
	return res.json()
}

export async function deleteChapter(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`/api/chapters/${id}`, {
	  method: 'DELETE',
	  headers,
	})
	if (!res.ok) throw new Error('Failed to delete chapter')
}
