import { deriveUserKey } from './crypto'
import { setUserKey } from './keyStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Fetches the user's key derivation salt, derives their encryption key from
// their password, and stores it — shared by every login/signup flow.
export async function deriveAndStoreUserKey(accessToken: string, password: string) {
	const saltRes = await fetch(`${API_BASE}/users/me/salt`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	})

	if (!saltRes.ok) {
		throw new Error('Failed to initialize encryption. Please try again.')
	}

	const { salt } = await saltRes.json()
	const key = await deriveUserKey(password, salt)
	await setUserKey(key)
}
