import { decrypt, encrypt } from '../lib/crypto'
import { getUserKey } from '../lib/keyStore'
import { supabase } from '../lib/supabase'
import type { UserProfile } from './types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

async function getAuthHeaders(): Promise<HeadersInit> {
	const { data: { session } } = await supabase.auth.getSession()
	if (!session) throw new Error('Not authenticated')
	return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export async function getMyProfile(): Promise<UserProfile> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/users/me`, { headers })
	if (!res.ok) throw new Error('Failed to fetch profile')

	const user = await res.json()
	if (!user.encryptedBlob || !user.nonce) return user
	
	const userKey = getUserKey()
	const decrypted = await decrypt<{ name: string; avatarUrl?: string, timezone: string }>(user.encryptedBlob, user.nonce, userKey)
	return { ...user, name: decrypted.name, avatarUrl: decrypted.avatarUrl ?? null, timezone: decrypted.timezone ?? null}
}

// Uploads the derived X25519 public key on first login from a new device/browser.
// Separate from updateMyProfile so it never touches the encrypted profile blob.
export async function setMyPublicKey(publicKeyBase64: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/users/me`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ publicKey: publicKeyBase64 }),
	})
	if (!res.ok) throw new Error('Failed to store public key')
}

export async function updateMyProfile(data: Partial<Pick<UserProfile, 'name' | 'avatarUrl' | 'timezone'>>): Promise<UserProfile> {
	const headers = await getAuthHeaders()
	const userKey = getUserKey()

	let dataToEncrypt: Partial<Pick<UserProfile, 'name' | 'avatarUrl' | 'timezone'>> = {};
	if (data.name) {
		dataToEncrypt.name = data.name;
	}
	if (data.avatarUrl) {
		dataToEncrypt.avatarUrl = data.avatarUrl;
	}
	if (data.timezone) {
		dataToEncrypt.timezone = data.timezone;
	}
	
	const encryptedBlobAndNonce = await encrypt(
		dataToEncrypt,
		userKey
	)
	const res = await fetch(`${API_BASE}/users/me`, {
	  method: 'PATCH',
	  headers,
	  body: JSON.stringify(encryptedBlobAndNonce),
	})
	if (!res.ok) throw new Error('Failed to update profile')
		
	const user = await res.json()
	if (!user.encryptedBlob || !user.nonce) return user
	
	const decrypted = await decrypt<{ name: string; avatarUrl?: string, timezone: string }>(user.encryptedBlob, user.nonce, userKey)
	return { ...user, name: decrypted.name, avatarUrl: decrypted.avatarUrl ?? null, timezone: decrypted.timezone ?? null}
}
