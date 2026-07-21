import { useEffect, useState } from 'react'
import { Nav } from '../components/Nav'
import { ChapterCard } from '../components/ChapterCard'
import { ProfileSection } from '../components/ProfileSection'
import { getMyProfile, updateMyProfile } from '../api/users'
import { getChapters } from '../api/chapters'
import { type UserProfile, type Chapter } from '../api/types'
import { CreateChapterForm } from '../components/CreateChapterForm'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function ProfilePage() {
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
	  return <div className="flex flex-col items-center justify-center min-h-screen">
				<div>Loading profile…</div>
				<LoadingSpinner />
			</div>
	}

	return (
	  <div className="min-h-screen bg-cream">
	    <Nav showLogout={true} showChapters={true} />
	    <ProfileSection
	      profile={profile}
	      editing={editing}
	      name={name}
	      timezone={timezone}
	      error={error}
	      saving={saving}
	      onEditClick={() => setEditing(true)}
	      onNameChange={setName}
	      onTimezoneChange={setTimezone}
	      onSave={handleSave}
	      onCancel={() => setEditing(false)}
	    />
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
					<ChapterCard chapter={chapter} bgColor={'cream'} />
	            </li>
	          ))}
	        </ul>
	      )}
	    </div>
	  </div>
	)
}
