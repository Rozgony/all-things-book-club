import { encrypt, decrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'
import { getAuthHeaders } from './auth'
import { type Theme } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

interface ThemeContent {
	name: string
	createdAt: string
}

export async function getThemesByChapterId(chapterId: string): Promise<Theme[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${chapterId}/themes`, { headers })
	if (!res.ok) throw new Error('Failed to fetch themes')
	const themes: Theme[] = await res.json()

	const chapterKey = getChapterKey(chapterId)
	if (!chapterKey) return themes

	const decrypted = await Promise.all(themes.map(async (theme) => {
		if (!theme.encryptedBlob || !theme.nonce) return theme
		const content = await decrypt<ThemeContent>(theme.encryptedBlob, theme.nonce, chapterKey)
		return { ...theme, name: content.name, createdAt: content.createdAt }
	}))

	// createdAt now lives inside the encrypted blob, so ordering (oldest
	// first, matching the old server-side ORDER BY) happens here instead of in SQL.
	return decrypted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

// Links an existing theme (pass id) or creates a new one (pass name) and links it to the topic.
// Returns the theme id (and, for newly-created themes, the createdAt used to encrypt the blob).
export async function linkThemeToTopic(
	topicId: string,
	chapterId: string,
	theme: { id?: string; name: string }
): Promise<{ themeId: string; createdAt?: string }> {
	const headers = await getAuthHeaders()

	const body: { themeId?: string; encryptedBlob?: string; nonce?: string } = {}
	let createdAt: string | undefined
	if (theme.id) {
		body.themeId = theme.id
	} else {
		const chapterKey = getChapterKey(chapterId)
		if (!chapterKey) throw new Error('Chapter key not available for encryption')
		createdAt = new Date().toISOString()
		const { encryptedBlob, nonce } = await encrypt({ name: theme.name, createdAt }, chapterKey)
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
	return { themeId: response.themeId, createdAt }
}

export async function unlinkThemeFromTopic(topicId: string, themeId: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/topics/${topicId}/themes/${themeId}`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to unlink theme')
}
