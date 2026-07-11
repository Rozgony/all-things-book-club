import { supabase } from '../lib/supabase'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export interface ChapterMember {
  id: string
  userId: string
  chapterId: string
  role: 'ADMIN' | 'MEMBER'
  joinedAt: string
}

export interface Chapter {
  id: string
  name: string
  description: string | null
  creatorId: string
  createdAt: string
  updatedAt: string
  members: ChapterMember[]
}

export async function getChapters(): Promise<Chapter[]> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/chapters', { headers })
  if (!res.ok) throw new Error('Failed to fetch chapters')
  return res.json()
}

export async function getChapter(id: string): Promise<Chapter> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/chapters/${id}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch chapter')
  return res.json()
}

export async function createChapter(data: { name: string; description?: string }): Promise<Chapter> {
  const headers = await getAuthHeaders()
  const res = await fetch('/api/chapters', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create chapter')
  return res.json()
}

export async function updateChapter(id: string, data: { name?: string; description?: string }): Promise<Chapter> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/chapters/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update chapter')
  return res.json()
}

export async function deleteChapter(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/chapters/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error('Failed to delete chapter')
}
