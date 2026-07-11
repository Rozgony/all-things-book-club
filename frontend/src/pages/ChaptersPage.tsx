import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getChapters, createChapter } from '../api/chapters'
import type { Chapter } from '../api/chapters'

export function ChaptersPage() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loadingChapters, setLoadingChapters] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    getChapters()
      .then(setChapters)
      .catch(() => setError('Failed to load chapters'))
      .finally(() => setLoadingChapters(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError(null)
    try {
      const chapter = await createChapter({ name: newName, description: newDescription || undefined })
      setChapters(prev => [chapter, ...prev])
      setNewName('')
      setNewDescription('')
      setShowForm(false)
    } catch {
      setFormError('Failed to create chapter')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-800">All Things Book Club</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/profile')} className="text-sm text-gray-500 hover:text-gray-700">Profile</button>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Chapters</h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            {showForm ? 'Cancel' : '+ New Chapter'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Create a Chapter</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Chapter'}
            </button>
          </form>
        )}

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {loadingChapters ? (
          <p className="text-gray-500">Loading chapters...</p>
        ) : chapters.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-2 text-lg">No chapters yet.</p>
            <p className="text-sm">Create one to get started.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {chapters.map(chapter => (
              <li key={chapter.id}>
                <button
                  onClick={() => navigate(`/chapters/${chapter.id}`)}
                  className="w-full text-left bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{chapter.name}</h3>
                      {chapter.description && (
                        <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 ml-4 mt-1">
                      {chapter.members.length} member{chapter.members.length !== 1 ? 's' : ''}
                      {chapter.creatorId === user?.id && (
                        <span className="ml-2 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs">admin</span>
                      )}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
