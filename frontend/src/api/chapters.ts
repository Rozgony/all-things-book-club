import { getAuthHeaders } from './auth'
import type { Chapter, ChapterMember } from './types'
import { generateChapterKey, encrypt, decrypt, encryptChapterKey } from '../lib/crypto'
import { setChapterKey, getChapterKey, getAndSetChapterKey, getUserKey } from '../lib/keyStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// The plaintext shape of a chapter's encrypted content.
// This is what gets JSON-stringified and encrypted before sending to the server.
interface ChapterContent {
	name: string
	description?: string
	createdAt: string
}

// The plaintext shape of a chapter_members encrypted_blob.
interface MemberContent {
	name?: string
	email?: string
	joinedAt?: string
}

export async function getChapters(): Promise<Chapter[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters`, { headers })
	if (!res.ok) throw new Error('Failed to fetch chapters')
	const chapters: Chapter[] = await res.json()

	// Decrypt each chapter's content using the stored chapter key
	const decrypted = await Promise.all(chapters.map(async (chapter) => {
		if (!chapter.encryptedBlob || !chapter.nonce) return chapter
		const key = await getAndSetChapterKey(chapter.id, chapter.encryptedChapterKey!, chapter.keyNonce!)
		const content = await decrypt<ChapterContent>(chapter.encryptedBlob, chapter.nonce, key!)
		return { ...chapter, name: content.name, description: content.description ?? null, createdAt: content.createdAt }
	}))

	// createdAt now lives inside the encrypted blob, so ordering (most recent
	// first, matching the old server-side ORDER BY) happens here instead of in SQL.
	return decrypted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

type CreateResponse = {
	chapter: Chapter
	chapterMember: ChapterMember
}

export async function createChapter(data: { name: string; description?: string; creatorName: string }): Promise<Chapter> {
	const headers = await getAuthHeaders()

	// 1. Generate a fresh symmetric key for this chapter
	const chapterKey = await generateChapterKey()

	// 2. Wrap the chapter key with argon2id using the userKey
	const { encryptedChapterKey, keyNonce } = await encryptChapterKey(chapterKey, getUserKey())

	// 3. Encrypt the chapter content (name, description, createdAt) with the chapter key.
	// The creator's membership joinedAt uses the same instant.
	const createdAt = new Date().toISOString()
	const { encryptedBlob: encryptedChapterBlob, nonce: chapterNonce } = await encrypt(
		{ name: data.name, description: data.description, createdAt },
		chapterKey
	)
	const { encryptedBlob: encryptedMemberBlob, nonce: memberNonce } = await encrypt(
		{ name: data.creatorName, joinedAt: createdAt },
		chapterKey
	)

	// 4. Send only encrypted data — server never sees name or description
	const res = await fetch(`${API_BASE}/chapters`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ 
			encryptedChapterBlob, 
			chapterNonce, 
			encryptedMemberBlob, 
			memberNonce, 
			isPublic: false, 
			encryptedChapterKey, 
			keyNonce,
		}),
	})
	if (!res.ok) throw new Error('Failed to create chapter')

	const createResponse: CreateResponse = await res.json()
	const { chapter, chapterMember} = createResponse;


	// 5. Store the chapter key in memory so we can decrypt content immediately
	setChapterKey(chapter.id, chapterKey)

	// 6. Return the chapter with decrypted fields for the UI
	return { ...chapter, name: data.name, description: data.description ?? null, createdAt, chapterMembers: [{ ...chapterMember, name: data.creatorName, joinedAt: createdAt }] }
}

export async function getChapterAndSetKey(id: string): Promise<Chapter> {
	const headers = await getAuthHeaders()

	const res = await fetch(`${API_BASE}/chapters/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch chapter')
	const chapter: Chapter = await res.json()

	if (!chapter.encryptedChapterKey && !chapter.keyNonce) throw 'Could not decrypt chapter'
	if (!chapter.encryptedBlob || !chapter.nonce) return chapter

	const chapterKey = await getAndSetChapterKey(chapter.id, chapter.encryptedChapterKey!, chapter.keyNonce!)
	const content = await decrypt<ChapterContent>(chapter.encryptedBlob, chapter.nonce, chapterKey!)
	if (chapter.chapterMembers?.length) {
		for (let index = 0; index < chapter.chapterMembers.length; index++) {
			const chapterMember = chapter.chapterMembers[index];
			if (chapterMember.encryptedBlob && chapterMember.nonce) {
				const memberContent = await decrypt<MemberContent>(chapterMember.encryptedBlob, chapterMember.nonce, chapterKey!)
				chapterMember.name = memberContent.name;
				chapterMember.joinedAt = memberContent.joinedAt ?? '';
			}
		}
		// joinedAt now lives inside each member's encrypted_blob, so ordering
		// (earliest member first, matching the old server-side ORDER BY) happens here.
		chapter.chapterMembers.sort((a, b) => new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime())
	}
	return { ...chapter, name: content.name, description: content.description ?? null, createdAt: content.createdAt }
}

export async function updateChapter(id: string, data: { name?: string; description?: string; createdAt: string }): Promise<Chapter> {
	const headers = await getAuthHeaders()

	const chapterKey = getChapterKey(id)

	const { encryptedBlob, nonce } = await encrypt(
		{ name: data.name, description: data.description, createdAt: data.createdAt },
		chapterKey
	)

	const res = await fetch(`${API_BASE}/chapters/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ encryptedBlob, nonce }),
	})

	if (!res.ok) throw new Error('Failed to update chapter')

	const returnedChapter: Chapter = await res.json()
	if (!returnedChapter.encryptedBlob || !returnedChapter.nonce) return returnedChapter

	const key = getChapterKey(returnedChapter.id)
	const content = await decrypt<ChapterContent>(returnedChapter.encryptedBlob, returnedChapter.nonce, key)

	return { ...returnedChapter, name: content.name, description: content.description ?? null, createdAt: content.createdAt }
}

export async function deleteChapter(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${id}`, {
		method: 'DELETE',
		headers,
	})
	if (!res.ok) throw new Error('Failed to delete chapter')
}
