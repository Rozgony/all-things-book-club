import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { getMyProfile, updateMyProfile } from '../api/users'
import type { UserProfile } from '../api/users'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMyProfile()
      .then(p => {
        setProfile(p)
        setName(p.name ?? '')
        setTimezone(p.timezone)
      })
      .catch(() => setError('Failed to load profile'))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateMyProfile({ name, timezone })
      setProfile(updated)
      setEditing(false)
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading profile...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800">All Things Book Club</h1>
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
      </nav>

      <main className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Your Profile</h2>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-gray-800">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
              <p className="text-gray-800">{profile.name ?? <span className="text-gray-400 italic">Not set</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Timezone</p>
              <p className="text-gray-800">{profile.timezone}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
            >
              Edit profile
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                placeholder="e.g. America/Los_Angeles"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="py-2 px-4 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
