import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { getMyProfile, updateMyProfile } from '../api/users'
import { getChapters } from '../api/chapters'
import type { UserProfile, Chapter } from '../api/types'
import { CreateChapterForm } from '../components/CreateChapterForm'

export function ProfilePage() {
	const navigate = useNavigate()
	const [profile, setProfile] = useState<UserProfile | null>(null)
	const [chapters, setChapters] = useState<Chapter[]>([])
	const [editing, setEditing] = useState(false)
	const [name, setName] = useState('')
	const [timezone, setTimezone] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [chaptersError, setChaptersError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [loadingChapters, setLoadingChapters] = useState(true)
	const [showForm, setShowForm] = useState(false)

	useEffect(() => {
	  getMyProfile()
	    .then(p => {
	      setProfile(p)
	      setName(p.name ?? '')
	      setTimezone(p.timezone)
	    })
	    .catch(() => setError('Failed to load profile'))
	  
	  getChapters()
	    .then(setChapters)
	    .catch(() => setChaptersError('Failed to load chapters'))
	    .finally(() => setLoadingChapters(false))
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

	const handleChapterCreated = (chapter: Chapter) => {
	  setChapters(prev => [chapter, ...prev])
	  setShowForm(false)
	}

	if (!profile) {
	  return <div className="flex items-center justify-center min-h-screen text-stone-muted">Loading profile…</div>
	}

	return (
	  <div className="min-h-screen bg-cream">
	    <Nav showLogout={true} />
	  {/* <button onClick={() => navigate('/chapters')} className="text-sm text-white/75 hover:text-white transition-colors">← Chapters</button> */}


	    <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
	      <h2 className="font-heading text-forest-deep mb-7">Your Profile</h2>

	      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

	      {!editing ? (
	        <div className="space-y-5">
	          <div>
	            <p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Email</p>
	            <p className="text-stone">{profile.email}</p>
	          </div>
	          <div>
	            <p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Name</p>
	            <p className="text-stone">{profile.name ?? <span className="text-stone-muted italic">Not set</span>}</p>
	          </div>
	          <div>
	            <p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Timezone</p>
	            <p className="text-stone">{profile.timezone}</p>
	          </div>
	          <button
	            onClick={() => setEditing(true)}
	            className="mt-2 py-2 px-5 bg-terracotta text-white text-sm tracking-wide rounded hover:bg-terracotta-dark transition-colors"
	          >
	            Edit profile
	          </button>
	        </div>
	      ) : (
	        <form onSubmit={handleSave} className="space-y-4">
	          <div>
	            <label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Name</label>
	            <input
	              type="text"
	              value={name}
	              onChange={e => setName(e.target.value)}
	              className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
	            />
	          </div>
	          <div>
	            <label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Timezone</label>
	            <input
	              type="text"
	              value={timezone}
	              onChange={e => setTimezone(e.target.value)}
	              placeholder="e.g. America/Los_Angeles"
	              className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
	            />
	          </div>
	          <div className="flex gap-3">
	            <button
	              type="submit"
	              disabled={saving}
	              className="py-2 px-5 bg-terracotta text-white text-sm tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
	            >
	              {saving ? 'Saving…' : 'Save'}
	            </button>
	            <button
	              type="button"
	              onClick={() => setEditing(false)}
	              className="py-2 px-4 bg-white text-stone-muted text-sm border border-warm-border rounded hover:bg-cream transition-colors"
	            >
	              Cancel
	            </button>
	          </div>
	        </form>
	      )}
	    </div>

	    <div className="max-w-lg mx-auto mt-8 p-8 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
	      <div className="flex justify-between items-center mb-7">
	        <h2 className="font-heading text-forest-deep">My Chapters</h2>
	        <button
	          onClick={() => setShowForm(v => !v)}
	          className="px-4 py-2 bg-terracotta text-white text-sm tracking-wide rounded hover:bg-terracotta-dark transition-colors"
	        >
	          {showForm ? 'Cancel' : '+ New Chapter'}
	        </button>
	      </div>

	      {showForm && (
	        <CreateChapterForm
	          onChapterCreated={handleChapterCreated}
	          onCancel={() => setShowForm(false)}
	        />
	      )}

	      {chaptersError && <p className="mb-4 text-sm text-red-600">{chaptersError}</p>}

	      {loadingChapters ? (
	        <p className="text-stone-muted">Loading chapters…</p>
	      ) : chapters.length === 0 ? (
	        <p className="text-stone-muted">You haven't joined any chapters yet.</p>
	      ) : (
	        <ul className="space-y-3">
	          {chapters.map(chapter => (
	            <li key={chapter.id}>
	              <button
	                onClick={() => navigate(`/chapters/${chapter.id}`)}
	                className="w-full text-left p-4 bg-cream/30 rounded border border-warm-border hover:border-terracotta/50 hover:bg-cream/50 transition-all"
	              >
	                <h3 className="font-heading text-forest-deep">{chapter.name}</h3>
	                {chapter.description && (
	                  <p className="text-sm text-stone-muted mt-1">{chapter.description}</p>
	                )}
	              </button>
	            </li>
	          ))}
	        </ul>
	      )}
	    </div>
	  </div>
	)
}
