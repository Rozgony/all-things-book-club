import { useEffect, useState } from 'react'
import { Nav } from '../components/Nav'
import { CreateChapterForm } from '../components/CreateChapterForm'
import { getChapters } from '../api/chapters'
import { type Chapter } from '../api/types'
import { ChapterCard } from '../components/ChapterCard'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function ChaptersPage() {
	const [chapters, setChapters] = useState<Chapter[]>([])
	const [loadingChapters, setLoadingChapters] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showForm, setShowForm] = useState(false)

	useEffect(() => {
	  getChapters()
	    .then((chapters) => {
			setChapters(chapters)
		})
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
	        <h2 className="font-heading text-forest-deep">All Chapters</h2>
	        <button
	          onClick={() => setShowForm(v => !v)}
	          className="px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-dark transition-colors"
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
			<div className="flex flex-col items-center justify-center min-h-screen">
				<div>Loading chapters…</div>
				<LoadingSpinner />
			</div>
	      ) : chapters.length === 0 ? (
	        <div className="bg-white rounded border border-warm-border p-10 text-center text-stone-muted" style={{ boxShadow: 'var(--shadow)' }}>
	          <p className="mb-2 text-lg font-heading text-forest-deep">No chapters yet.</p>
	          <p className="text-sm">Create one to get started.</p>
	        </div>
	      ) : (
	        <ul className="space-y-3">
	          {chapters.map(chapter => (
	            <li key={chapter.id}>
					<ChapterCard chapter={chapter} bgColor={'white'} />
	            </li>
	          ))}
	        </ul>
	      )}
	    </main>
	  </div>
	)
}
