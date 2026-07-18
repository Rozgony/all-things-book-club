import { supabase } from '../lib/supabase'

export async function getAuthHeaders(): Promise<HeadersInit> {
	const { data: { session } } = await supabase.auth.getSession()
	if (!session) throw new Error('Not authenticated')
	return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}