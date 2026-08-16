import { getAuthHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export interface InviteInfo {
	inviterEmail: string
	encryptedChapterKey: string
	keyNonce: string
	expiresAt: string
	status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
}

// New-user invite path: creates a pending invite emailed to invitedEmail.
// inviteSecretBase64url only lives in this request — the backend uses it to
// build the emailed URL and does not persist it (see documentation/Invite-Plan.md).
export async function createInvite(params: {
	chapterId: string
	invitedEmail: string
	encryptedChapterKey: string
	keyNonce: string
	inviteSecretBase64url: string
}): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${params.chapterId}/invites`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			invitedEmail: params.invitedEmail,
			encryptedChapterKey: params.encryptedChapterKey,
			keyNonce: params.keyNonce,
			inviteSecretBase64url: params.inviteSecretBase64url,
		}),
	})
	if (!res.ok) throw new Error('Failed to create invite')
}

// GET /api/invites/{token} is unauthenticated — no getAuthHeaders() call.
export async function getInvite(token: string): Promise<InviteInfo> {
	const res = await fetch(`${API_BASE}/invites/${token}`)
	if (!res.ok) throw new Error('Invite not found or expired')
	return res.json()
}

export async function acceptInvite(token: string, params: {
	encryptedChapterKey: string
	keyNonce: string
	ephemeralPublicKey: string
}): Promise<{ chapterId: string }> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/invites/${token}/accept`, {
		method: 'POST',
		headers,
		body: JSON.stringify(params),
	})
	if (!res.ok) throw new Error('Failed to accept invite')
	return res.json()
}
