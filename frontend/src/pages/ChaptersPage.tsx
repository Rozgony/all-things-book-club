import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Nav } from '../components/Nav'
import { CreateChapterForm } from '../components/CreateChapterForm'
import { getChapters } from '../api/chapters'
import type { Chapter } from '../api/types'

export function ChaptersPage() {
	const user = useAuthStore((s) => s.user)
	const navigate = useNavigate()

	const [chapters, setChapters] = useState<Chapter[]>([])
	const [loadingChapters, setLoadingChapters] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showForm, setShowForm] = useState(false)

	useEffect(() => {
	  getChapters()
	    .then(setChapters)
	    .catch(() => setError('Failed to load chapters'))
	    .finally(() => setLoadingChapters(false))
	}, [])

	const handleChapterCreated = (chapter: Chapter) => {
	  setChapters(prev => [chapter, ...prev])
	  setShowForm(false)
	}

	return (
	  <div className="min-h-screen bg-cream">
	    <Nav showLogout={true} showProfile={true} />

	    <main className="max-w-2xl mx-auto px-4 py-10">
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

	      {error && <p className="text-red-600 mb-4">{error}</p>}

	      {loadingChapters ? (
	        <p className="text-stone-muted">Loading chapters…</p>
	      ) : chapters.length === 0 ? (
	        <div className="bg-white rounded border border-warm-border p-10 text-center text-stone-muted" style={{ boxShadow: 'var(--shadow)' }}>
	          <p className="mb-2 text-lg font-heading text-forest-deep">No chapters yet.</p>
	          <p className="text-sm">Create one to get started.</p>
	        </div>
	      ) : (
	        <ul className="space-y-3">
	          {chapters.map(chapter => (
	            <li key={chapter.id}>
	              <button
	                onClick={() => navigate(`/chapters/${chapter.id}`)}
	                className="w-full text-left bg-white rounded border border-warm-border p-5 hover:border-terracotta/50 hover:shadow-md transition-all"
	                style={{ boxShadow: 'var(--shadow)' }}
	              >
	                <div className="flex justify-between items-start">
	                  <div>
	                    <h3 className="font-heading text-forest-deep">{chapter.name}</h3>
	                    {chapter.description && (
	                      <p className="text-sm text-stone-muted mt-1">{chapter.description}</p>
	                    )}
	                  </div>
	                  <span className="text-xs text-stone-muted ml-4 mt-1">
	                    {chapter.members.length} member{chapter.members.length !== 1 ? 's' : ''}
	                    {chapter.creatorId === user?.id && (
	                      <span className="ml-2 bg-forest-light text-forest px-1.5 py-0.5 rounded text-xs">admin</span>
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
