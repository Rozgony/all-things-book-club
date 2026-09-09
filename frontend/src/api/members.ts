import { encrypt, decrypt } from '../lib/crypto'
import { getChapterKey } from '../lib/keyStore'
import { supabase } from '../lib/supabase'
import type { ChapterMember } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

async function getAuthHeaders(): Promise<HeadersInit> {
	const { data: { session } } = await supabase.auth.getSession()
	if (!session) throw new Error('Not authenticated')
	return {
		Authorization: `Bearer ${session.access_token}`,
		'Content-Type': 'application/json',
	}
}

// Called once, immediately after invite acceptance, to record joinedAt before
// the member has a name set (and thus before any other encrypted_blob exists).
export async function initializeMemberJoinedAt(memberId: string, chapterKey: CryptoKey, joinedAt: string): Promise<ChapterMember> {
	const headers = await getAuthHeaders()
	const { encryptedBlob, nonce } = await encrypt({ joinedAt }, chapterKey)

	const res = await fetch(`${API_BASE}/members/${memberId}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ encryptedBlob, nonce })
	})
	if (!res.ok) throw new Error('Failed to record join date')

	return res.json()
}

// Setting a name replaces the whole encrypted_blob, so the member's existing
// joinedAt (if any) must be decrypted and carried forward or it's lost.
export async function updateMemberName(
	memberId: string,
	chapterId: string,
	name: string,
	existingEncryptedBlob?: string | null,
	existingNonce?: string | null
): Promise<ChapterMember> {
	const headers = await getAuthHeaders()
	const chapterKey = getChapterKey(chapterId)
	if (!chapterKey) throw new Error('Chapter key not available for encryption')

	let joinedAt: string | undefined
	if (existingEncryptedBlob && existingNonce) {
		const existing = await decrypt<{ name?: string; joinedAt?: string }>(existingEncryptedBlob, existingNonce, chapterKey)
		joinedAt = existing.joinedAt
	}

	const { encryptedBlob, nonce } = await encrypt({ name, joinedAt }, chapterKey)

	const res = await fetch(`${API_BASE}/members/${memberId}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ encryptedBlob, nonce })
	})
	if (!res.ok) throw new Error('Failed to update member name')

	return res.json()
}
