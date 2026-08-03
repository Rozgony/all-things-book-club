import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Nav } from '../../components/Nav'
import { ChapterHeader } from './ChapterHeader'
import { MeetingsList } from './MeetingsList'
import { getChapterAndSetKey, updateChapter, deleteChapter } from '../../api/chapters'
import { getMeetingsByChapterId } from '../../api/meetings'
import { updateMemberName } from '../../api/members'
import { type Chapter, type Meeting } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { getMyProfile } from '../../api/users'

export function ChapterDetailPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const user = useAuthStore((s) => s.user)

	const [chapter, setChapter] = useState<Partial<Chapter> | null>(null)
	const [loading, setLoading] = useState(true)
	const [name, setName] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [meetings, setMeetings] = useState<Meeting[]>([])
	const [meetingsLoading, setMeetingsLoading] = useState(false)

	const [editing, setEditing] = useState(false)
	const [editName, setEditName] = useState('')
	const [editDescription, setEditDescription] = useState('')
	const [saving, setSaving] = useState(false)
	const [editError, setEditError] = useState<string | null>(null)

	const [deleting, setDeleting] = useState(false)

	const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
	const [editMemberName, setEditMemberName] = useState('')
	const [savingMember, setSavingMember] = useState(false)

	useEffect(() => {
		getMyProfile()
			.then(p => {
				setName(p.name ?? '')
			})
			.catch(() => setError('Failed to load profile'))
	},[])

	useEffect(() => {
	  if (!id) return
	  getChapterAndSetKey(id)
	    .then(chapter => {
	      setChapter(chapter)
	      setEditName(chapter.name)
	      setEditDescription(chapter.description ?? '')
	      // Fetch meetings for this chapter
	      setMeetingsLoading(true)
	      return getMeetingsByChapterId(id)
	    })
	    .then(fetchedMeetings => {
	      setMeetings(fetchedMeetings)
	      setMeetingsLoading(false)
	    })
	    .catch(err => {
	      console.error(err)
	      setError('Failed to load chapter')
	      setMeetingsLoading(false)
	    })
	    .finally(() => setLoading(false))
	}, [id])

	const isAdmin = chapter?.chapterMembers?.some(m => m.userId === user?.id && m.role === 'ADMIN') ?? false
	const isCreator = chapter?.creatorId === user?.id

	const handleSave = async (e: React.FormEvent) => {
	  e.preventDefault()
	  if (!id) return
	  setSaving(true)
	  setEditError(null)
	  try {
	    const {name, description} = await updateChapter(id, { name: editName, description: editDescription || undefined})
		const newChap = {...chapter,name,description};
	    setChapter(newChap)
	    setEditing(false)
	  } catch {
	    setEditError('Failed to update chapter')
	  } finally {
	    setSaving(false)
	  }
	}

	const handleDelete = async () => {
	  setDeleting(true)
	  try {
	    await deleteChapter(id!)
	    navigate('/profile')
	  } catch {
	    setError('Failed to delete chapter')
	    setDeleting(false)
	  }
	}

	const handleMemberNameSave = async (memberId: string) => {
		if (!id || !editMemberName.trim()) return
		setSavingMember(true)
		try {
			await updateMemberName(memberId, id, editMemberName.trim())
			setChapter(prev => ({
				...prev,
				chapterMembers: prev?.chapterMembers?.map(m =>
					m.id === memberId ? { ...m, name: editMemberName.trim() } : m
				)
			}))
			setEditingMemberId(null)
		} catch {
			// silently ignore — name stays as-is
		} finally {
			setSavingMember(false)
		}
	}

	if (loading) {
		return <div className="flex flex-col items-center justify-center min-h-screen">
				<div>Loading chapter…</div>
				<LoadingSpinner />
			</div>	
	}

	if (error || !chapter) {
	  return (
	    <div className="flex flex-col items-center justify-center min-h-screen text-stone-muted gap-4">
	      <p>{error ?? 'Chapter not found'}</p>
	      <button onClick={() => navigate('/profile')} className="text-terracotta hover:underline text-sm">Back to my profile</button>
	    </div>
	  )
	}
console.log({chapter})
	return (
	  	<div className="min-h-screen bg-cream">
			<Nav showLogout={true} showProfile={true} username={name}/>

			<main className="max-w-2xl mx-auto px-4 py-10">
				<ChapterHeader
					chapter={chapter}
					editing={editing}
					editName={editName}
					editDescription={editDescription}
					editError={editError}
					saving={saving}
					deleting={deleting}
					isAdmin={isAdmin}
					isCreator={isCreator}
					onEdit={() => setEditing(true)}
					onEditNameChange={setEditName}
					onEditDescriptionChange={setEditDescription}
					onSave={handleSave}
					onCancel={() => setEditing(false)}
					onDelete={handleDelete}
				/>

				<MeetingsList
					chapterId={id!}
					meetings={meetings}
					loading={meetingsLoading}
					isAdmin={isAdmin}
					onMeetingCreated={meeting => setMeetings(prev => [...prev, meeting])}
					onMeetingDeleted={id => setMeetings(prev => prev.filter(m => m.id !== id))}
				/>

				<div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
					<h3 className="font-heading text-forest-deep mb-4">Members</h3>
					<ul className="divide-y divide-warm-border max-h-96 overflow-y-auto overflow-x-hidden border border-warm-border rounded bg-white p-4 -m-4">
					{chapter?.chapterMembers?.map(member => (
						<li key={member.id} className="py-3 flex justify-between items-center gap-3">
							{editingMemberId === member.id ? (
								<form className="flex items-center gap-2 flex-1" onSubmit={e => { e.preventDefault(); handleMemberNameSave(member.id) }}>
									<input
										autoFocus
										value={editMemberName}
										onChange={e => setEditMemberName(e.target.value)}
										className="flex-1 px-2 py-1 text-sm border border-warm-border rounded bg-cream/40 focus:outline-none focus:ring-2 focus:ring-terracotta"
									/>
									<button type="submit" disabled={savingMember} className="bg-forest rounded py-1 px-1 text-xs text-white hover:underline disabled:opacity-50">Save</button>
									<button type="button" onClick={() => setEditingMemberId(null)} className="text-xs text-terracotta hover:underline">Cancel</button>
								</form>
							) : (
								<span className="text-sm text-stone flex-1">{member.name ?? ''}</span>
							)}
							<div className="flex items-center gap-2 shrink-0">
								{member.userId === user?.id && editingMemberId !== member.id && (
									<button
										onClick={() => { setEditingMemberId(member.id); setEditMemberName(member.name ?? '') }}
										className="text-xs text-stone-muted hover:text-stone"
										aria-label="Edit your display name"
									>Edit</button>
								)}
								<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
									member.role === 'ADMIN'
									? 'bg-forest-light text-forest'
									: 'bg-cream text-stone-muted'
								}`}>
									{member.role.toLowerCase()}
								</span>
							</div>
						</li>
					))}
					</ul>
				</div>
			</main>
	  	</div>
	)
}
