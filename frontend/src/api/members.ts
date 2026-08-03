import { getAuthHeaders } from './auth'
import { encrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export async function updateMemberName(memberId: string, chapterId: string, name: string): Promise<void> {
	const headers = await getAuthHeaders()
	const chapterKey = getChapterKey(chapterId)
	const { encryptedBlob, nonce } = await encrypt({ name }, chapterKey)

	const res = await fetch(`${API_BASE}/members/${memberId}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ encryptedBlob, nonce }),
	})
	if (!res.ok) throw new Error('Failed to update member name')
}
