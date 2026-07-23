import { getAuthHeaders } from './auth'
import type { Chapter } from './types'
import { VisibilityLevel } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export async function getChapters(): Promise<Chapter[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters`, { headers })
	if (!res.ok) throw new Error('Failed to fetch chapters')
	return res.json()
}

export async function getChapter(id: string): Promise<Chapter> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch chapter')
	return res.json()
}

export async function createChapter(data: { name: string; description?: string, visibility: VisibilityLevel }): Promise<Chapter> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters`, {
	  method: 'POST',
	  headers,
	  body: JSON.stringify(data),
	})
	if (!res.ok) throw new Error('Failed to create chapter')
	return res.json()
}

export async function updateChapter(id: string, data: { name?: string; description?: string,  visibility?: string }): Promise<Chapter> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${id}`, {
	  method: 'PATCH',
	  headers,
	  body: JSON.stringify(data),
	})
	if (!res.ok) throw new Error('Failed to update chapter')
	return res.json()
}

export async function deleteChapter(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${id}`, {
	  method: 'DELETE',
	  headers,
	})
	if (!res.ok) throw new Error('Failed to delete chapter')
}
