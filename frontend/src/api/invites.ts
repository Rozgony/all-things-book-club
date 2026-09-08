import { getAuthHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export interface InviteInfo {
	inviterName: string
	encryptedChapterKey: string
	keyNonce: string
	expiresAt: string
}

// Creates a link-only invite: anyone holding the returned URL can accept it.
// inviteSecretBase64url only lives in this request — the backend uses it to
// build the returned URL and does not persist it (see documentation/Invite-Plan.md).
export async function createInvite(params: {
	chapterId: string
	encryptedChapterKey: string
	keyNonce: string
	inviteSecretBase64url: string
	inviterName: string
}): Promise<{ inviteURL: string }> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${params.chapterId}/invites`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			encryptedChapterKey: params.encryptedChapterKey,
			keyNonce: params.keyNonce,
			inviteSecretBase64url: params.inviteSecretBase64url,
			inviterName: params.inviterName,
		}),
	})
	if (!res.ok) {
		const response = await res.json()
		throw new Error(response.error)
	}
	return res.json()
}

// Creates the invite and emails the link via Resend in one request. This is
// the only path where the invite secret is handed to our email provider.
export async function createInviteAndEmail(params: {
	chapterId: string
	invitedEmail: string
	encryptedChapterKey: string
	keyNonce: string
	inviteSecretBase64url: string
	inviterName: string
}): Promise<{ inviteURL: string }> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/chapters/${params.chapterId}/invites/email`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			invitedEmail: params.invitedEmail,
			encryptedChapterKey: params.encryptedChapterKey,
			keyNonce: params.keyNonce,
			inviteSecretBase64url: params.inviteSecretBase64url,
			inviterName: params.inviterName,
		}),
	})
	if (!res.ok) {
		const response = await res.json()
		throw new Error(response.error)
	}
	return res.json()
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
}): Promise<{ chapterId: string; id: string }> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/invites/${token}/accept`, {
		method: 'POST',
		headers,
		body: JSON.stringify(params),
	})
	if (!res.ok) throw new Error('Failed to accept invite')
	const member = await res.json()
	return { chapterId: member.chapterId, id: member.id }
}
