import { encrypt, decrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Theme } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

interface ThemeContent {
	name: string
}

export async function getThemesByChapterId(chapterId: string): Promise<Theme[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${chapterId}/themes`, { headers })
	if (!res.ok) throw new Error('Failed to fetch themes')
	const themes: Theme[] = await res.json()

	const chapterKey = getChapterKey(chapterId)
	if (!chapterKey) return themes

	return Promise.all(themes.map(async (theme) => {
		if (!theme.encryptedBlob || !theme.nonce) return theme
		const content = await decrypt<ThemeContent>(theme.encryptedBlob, theme.nonce, chapterKey)
		return { ...theme, name: content.name }
	}))
}

// Links an existing theme (pass id) or creates a new one (pass name) and links it to the topic.
// Returns the theme id that was linked.
export async function linkThemeToTopic(
	topicId: string,
	chapterId: string,
	theme: { id?: string; name: string }
): Promise<string> {
	const headers = await getAuthHeaders()

	const body: { themeId?: string; encryptedBlob?: string; nonce?: string } = {}
	if (theme.id) {
		body.themeId = theme.id
	} else {
		const chapterKey = getChapterKey(chapterId)
		if (!chapterKey) throw new Error('Chapter key not available for encryption')
		const { encryptedBlob, nonce } = await encrypt({ name: theme.name }, chapterKey)
		body.encryptedBlob = encryptedBlob
		body.nonce = nonce
	}

	const res = await fetch(`${API_BASE}/topics/${topicId}/themes`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	})
	if (!res.ok) throw new Error('Failed to link theme')
	const response = await res.json()
	return response.themeId
}

export async function unlinkThemeFromTopic(topicId: string, themeId: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/topics/${topicId}/themes/${themeId}`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to unlink theme')
}
