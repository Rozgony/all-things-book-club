import { getAuthHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export interface InviteInfo {
	inviterEmail: string
	encryptedChapterKey: string
	keyNonce: string
	expiresAt: string
	status: 'PENDING' | 'ACCEPTED' | 'EXPIRED'
}

export interface UserLookup {
	id: string
	publicKey: string | null
}

// Looks up an existing user's public key by email, to decide between the
// direct-ECDH invite path and the one-time-secret invite path. Returns null
// on 404 (no account with that email) rather than throwing, since 404 is an
// expected outcome here, not an error.
export async function lookupUserByEmail(email: string): Promise<UserLookup | null> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/users/by-email?email=${encodeURIComponent(email)}`, { headers })
	if (res.status === 404) return null
	if (!res.ok) throw new Error('Failed to look up user')
	return res.json()
}

// Existing-user invite path: adds the invitee directly as a chapter member
// with their own ECDH-wrapped copy of the chapter key. ADMIN only (enforced
// server-side). Their encrypted member-blob (display name) is left unset —
// the inviter doesn't know it; the invitee can set it from their profile.
export async function inviteExistingUser(params: {
	chapterId: string
	userId: string
	encryptedChapterKey: string
	keyNonce: string
	ephemeralPublicKey: string
}): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/members`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			userId: params.userId,
			chapterId: params.chapterId,
			role: 'MEMBER',
			encryptedChapterKey: params.encryptedChapterKey,
			keyNonce: params.keyNonce,
			ephemeralPublicKey: params.ephemeralPublicKey,
		}),
	})
	if (!res.ok) throw new Error('Failed to add member')
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
