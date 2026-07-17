import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Nav } from '../components/Nav'
import { getChapter, updateChapter, deleteChapter } from '../api/chapters'
import { visibilityReadable, type Chapter, type ChapterVisibility } from '../api/types'

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
	const [editVisibility, setEditVisibility] = useState<ChapterVisibility>('MEMBERS_ONLY')
	const [saving, setSaving] = useState(false)
	const [editError, setEditError] = useState<string | null>(null)

	const [deleting, setDeleting] = useState(false)

	useEffect(() => {
	  if (!id) return
	  getChapter(id)
	    .then(chapter => {
	      setChapter(chapter)
	      console.log(chapter)
	      setEditName(chapter.name)
	      setEditDescription(chapter.description ?? '')
	      setEditVisibility(chapter.visibility ?? '')
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
	    const updated = await updateChapter(id, { name: editName, description: editDescription || undefined, visibility: editVisibility })
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
	  return <div className="flex items-center justify-center min-h-screen text-stone-muted">Loading chapter…</div>
	}

	if (error || !chapter) {
	  return (
	    <div className="flex flex-col items-center justify-center min-h-screen text-stone-muted gap-4">
	      <p>{error ?? 'Chapter not found'}</p>
	      <button onClick={() => navigate('/chapters')} className="text-terracotta hover:underline text-sm">Back to chapters</button>
	    </div>
	  )
	}

	return (
	  <div className="min-h-screen bg-cream">
	    <Nav showLogout={true} showProfile={true} showChapters={true} />

	    <main className="max-w-2xl mx-auto px-4 py-10">
	      {editing ? (
	        <form onSubmit={handleSave} className="bg-white rounded border border-warm-border p-6 space-y-4 mb-7" style={{ boxShadow: 'var(--shadow)' }}>
	          <h2 className="font-heading text-forest-deep">Edit Chapter</h2>
	          <div>
	            <label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Name <span className="text-red-500">*</span></label>
	            <input
	              type="text"
	              value={editName}
	              onChange={e => setEditName(e.target.value)}
	              required
	              className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
	            />
	          </div>
	          <div>
	            <label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Description</label>
	            <textarea
	              value={editDescription}
	              onChange={e => setEditDescription(e.target.value)}
	              rows={3}
	              className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
	            />
	          </div>
				<div>
					<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Description</label>
					<select
						value={editVisibility}
						onChange={e => setEditVisibility(e.target.value)}
						className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
					>
						{['ACCEPTING_MEMBERS','INVITE_ONLY','MEMBERS_ONLY'].map(value => (<option value={value}>{visibilityReadable[value]}</option>))}
					</select>
				</div>
	          {editError && <p className="text-sm text-red-600">{editError}</p>}
	          <div className="flex gap-3">
	            <button
	              type="submit"
	              disabled={saving}
	              className="px-4 py-2 bg-terracotta text-white text-sm tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
	            >
	              {saving ? 'Saving…' : 'Save'}
	            </button>
	            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-stone-muted hover:text-stone transition-colors">
	              Cancel
	            </button>
	          </div>
	        </form>
	      ) : (
	        <div className="bg-white rounded border border-warm-border p-6 mb-7" style={{ boxShadow: 'var(--shadow)' }}>
	          <div className="flex justify-between items-start">
	            <div>
	              <h2 className="font-heading text-forest-deep">{chapter.name}</h2>
	              <h4 className="font-heading text-forest-deep">{visibilityReadable[chapter.visibility]}</h4>
	              {chapter.description && (
	                <p className="text-stone-muted mt-2">{chapter.description}</p>
	              )}
	            </div>
	            {isAdmin && (
	              <div className="flex gap-2 ml-4">
	                <button
	                  onClick={() => setEditing(true)}
	                  className="px-3 py-1 text-sm border border-warm-border rounded hover:bg-cream transition-colors"
	                >
	                  Edit
	                </button>
	                {isCreator && (
	                  <button
	                    onClick={handleDelete}
	                    disabled={deleting}
	                    className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
	                  >
	                    {deleting ? 'Deleting…' : 'Delete'}
	                  </button>
	                )}
	              </div>
	            )}
	          </div>
	        </div>
	      )}

	      <div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
	        <h3 className="font-heading text-forest-deep mb-4">Members</h3>
	        <ul className="divide-y divide-warm-border">
	          {chapter.members.map(member => (
	            <li key={member.id} className="py-3 flex justify-between items-center">
	              <span className="text-sm text-stone">{member.user?.name}</span>
	              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
	                member.role === 'ADMIN'
	                  ? 'bg-forest-light text-forest'
	                  : 'bg-cream text-stone-muted'
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
