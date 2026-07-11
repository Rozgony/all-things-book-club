import { supabase } from '../lib/supabase'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  timezone: string
}

export async function getMyProfile(): Promise<UserProfile> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/users/me', { headers })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export async function updateMyProfile(data: Partial<Pick<UserProfile, 'name' | 'avatarUrl' | 'timezone'>>): Promise<UserProfile> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/users/me', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json()
}
