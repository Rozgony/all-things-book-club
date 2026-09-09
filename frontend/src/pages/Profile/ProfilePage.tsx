import { useEffect, useState } from 'react'
import { Nav } from '../../components/Nav'
import { ChapterCard } from './ChapterCard'
import { ProfileSection } from './ProfileSection'
import { getMyProfile, updateMyProfile } from '../../api/users'
import { getChapters } from '../../api/chapters'
import { type UserProfile, type Chapter } from '../../api/types'
import { CreateChapterForm } from './CreateChapterForm'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'

export function ProfilePage() {
	const user = useAuthStore((s) => s.user)
	const setStoreTimezone = useAuthStore((s) => s.setTimezone)
	const [profile, setProfile] = useState<UserProfile | null>(null)
	const [chapters, setChapters] = useState<Chapter[]>([])
	const [editing, setEditing] = useState(false)
	const [name, setName] = useState('')
	const [timezone, setTimezone] = useState('')
	const [emailValue, setEmailValue] = useState('')
	const [passwordValue, setPasswordValue] = useState('')
	const [confirmPasswordValue, setConfirmPasswordValue] = useState('')
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

	  if (!Intl.supportedValuesOf('timeZone').includes(timezone)) {
	    setError('Invalid timezone. Please select a valid timezone from the list.')
	    setSaving(false)
	    return
	  }

	  try {
	    const updated = await updateMyProfile({ name, timezone })
	    setProfile(updated)
		setName(updated.name ?? '')
	    setTimezone(updated.timezone)
		setStoreTimezone(updated.timezone)

		const currentEmail = user?.email ?? ''
		if (emailValue && emailValue !== currentEmail) {
		  const { error: emailError } = await supabase.auth.updateUser({ email: emailValue })
		  if (emailError) {
		    setError(emailError.message)
		    setSaving(false)
		    return
		  }
		}

		if (passwordValue) {
		  if (passwordValue !== confirmPasswordValue) {
		    setError('Passwords don\'t match')
		    setSaving(false)
		    return
		  }
		  const { error: pwError } = await supabase.auth.updateUser({ password: passwordValue })
		  if (pwError) {
		    setError(pwError.message)
		    setSaving(false)
		    return
		  }
		}

	    setEditing(false)
	  } catch {
	    setError('Failed to save profile')
	  } finally {
	    setSaving(false)
	  }
	}

	const handleEditClick = () => {
		setEmailValue(user?.email ?? '')
		setPasswordValue('')
		setConfirmPasswordValue('')
		setEditing(true)
	}

	const handleCancel = () => {
		setEditing(false)
		setEmailValue('')
		setPasswordValue('')
		setConfirmPasswordValue('')
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
	    <Nav showLogout={true} username={name}/>
	    <ProfileSection
	      profile={profile}
	      email={user?.email ?? ''}
	      pendingEmail={user?.new_email}
	      editing={editing}
	      name={name}
	      timezone={timezone}
	      emailValue={emailValue}
	      passwordValue={passwordValue}
	      confirmPasswordValue={confirmPasswordValue}
	      error={error}
	      saving={saving}
	      onEditClick={handleEditClick}
	      onNameChange={setName}
	      onTimezoneChange={setTimezone}
	      onEmailChange={setEmailValue}
	      onPasswordChange={setPasswordValue}
	      onConfirmPasswordChange={setConfirmPasswordValue}
	      onSave={handleSave}
	      onCancel={handleCancel}
	    />
	    <div className="max-w-2xl mx-auto mt-8 p-8 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
	      <div className="flex justify-between items-center mb-7">
	        <h2 className="font-heading text-forest-deep">My Chapters</h2>
	        <button
	          onClick={() => setShowForm(v => !v)}
	          className={`px-4 py-2 ${showForm ? 'text-terracotta hover:text-terracotta-dark' : 'text-forest hover:text-forest-deep'} text-sm tracking-wide border rounded transition-colors`}
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
