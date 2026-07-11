import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getChapter, updateChapter, deleteChapter } from '../api/chapters'
import type { Chapter } from '../api/chapters'

export function ChapterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getChapter(id)
      .then(c => {
        setChapter(c)
        setEditName(c.name)
        setEditDescription(c.description ?? '')
      })
      .catch(() => setError('Failed to load chapter'))
      .finally(() => setLoading(false))
  }, [id])

  const isAdmin = chapter?.members.some(m => m.userId === user?.id && m.role === 'ADMIN') ?? false
  const isCreator = chapter?.creatorId === user?.id

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setEditError(null)
    try {
      const updated = await updateChapter(id, { name: editName, description: editDescription || undefined })
      setChapter(updated)
      setEditing(false)
    } catch {
      setEditError('Failed to update chapter')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !window.confirm(`Delete "${chapter?.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteChapter(id)
      navigate('/chapters')
    } catch {
      setError('Failed to delete chapter')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading chapter...</div>
  }

  if (error || !chapter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-500 gap-4">
        <p>{error ?? 'Chapter not found'}</p>
        <button onClick={() => navigate('/chapters')} className="text-indigo-600 hover:underline text-sm">Back to chapters</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate('/chapters')} className="text-sm text-indigo-600 hover:underline">← Chapters</button>
        <h1 className="text-lg font-semibold text-gray-800">All Things Book Club</h1>
        <div className="w-24" />
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {editing ? (
          <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800">Edit Chapter</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{chapter.name}</h2>
                {chapter.description && (
                  <p className="text-gray-600 mt-2">{chapter.description}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  {isCreator && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Members</h3>
          <ul className="divide-y divide-gray-100">
            {chapter.members.map(member => (
              <li key={member.id} className="py-3 flex justify-between items-center">
                <span className="text-sm text-gray-700">{member.userId}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  member.role === 'ADMIN'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {member.role.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
