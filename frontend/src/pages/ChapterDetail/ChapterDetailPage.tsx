import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Nav } from '../../components/Nav'
import { ChapterHeader } from './ChapterHeader'
import { MeetingsList } from './MeetingsList'
import { MemberNameModal } from '../../components/MemberNameModal'
import { getChapterAndSetKey, updateChapter, deleteChapter } from '../../api/chapters'
import { getMeetingsByChapterId } from '../../api/meetings'
import { updateMemberName } from '../../api/members'
import { type Chapter, type Meeting } from '../../api/types'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { getMyProfile } from '../../api/users'
import { ConfirmModal } from '../../components/ConfirmModal'

export function ChapterDetailPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const user = useAuthStore((s) => s.user)

	const [chapter, setChapter] = useState<Partial<Chapter> | null>(null)
	const [loading, setLoading] = useState(true)
	const [name, setName] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [meetings, setMeetings] = useState<Meeting[]>([])
	const [meetingsLoading, setMeetingsLoading] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [showEditMemberModal, setShowEditMemberModal] = useState(false)
	const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
	const [editingMemberName, setEditingMemberName] = useState('')
	const [editingMemberEncryptedBlob, setEditingMemberEncryptedBlob] = useState<string | null>(null)
	const [editingMemberNonce, setEditingMemberNonce] = useState<string | null>(null)

	const [editing, setEditing] = useState(false)
	const [editName, setEditName] = useState('')
	const [editDescription, setEditDescription] = useState('')
	const [saving, setSaving] = useState(false)
	const [editError, setEditError] = useState<string | null>(null)

	const [deleting, setDeleting] = useState(false)

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

	// Auto-open the name modal when navigating from invite acceptance with ?setName=true
	useEffect(() => {
		if (searchParams.has('setName') && user && chapter) {
			const currentUserMember = chapter.chapterMembers?.find(m => m.userId === user.id)
			if (currentUserMember) {
				setEditingMemberId(currentUserMember.id)
				setEditingMemberName(user.user_metadata?.name || user.email || '')
				setEditingMemberEncryptedBlob(currentUserMember.encryptedBlob || null)
				setEditingMemberNonce(currentUserMember.nonce || null)
				setShowEditMemberModal(true)
				setSearchParams({})
			}
		}
	}, [searchParams, user, chapter, setSearchParams])

	const isAdmin = chapter?.chapterMembers?.some(m => m.userId === user?.id && m.role === 'ADMIN') ?? false
	const isCreator = chapter?.creatorId === user?.id

	const handleSave = async (e: React.FormEvent) => {
	  e.preventDefault()
	  if (!id) return
	  setSaving(true)
	  setEditError(null)
	  try {
	    const {name, description} = await updateChapter(id, { name: editName, description: editDescription || undefined, createdAt: chapter!.createdAt! })
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

	const handleEditMemberName = (memberId: string, currentName: string, encryptedBlob?: string | null, nonce?: string | null) => {
		setEditingMemberId(memberId)
		setEditingMemberName(currentName)
		setEditingMemberEncryptedBlob(encryptedBlob || null)
		setEditingMemberNonce(nonce || null)
		setShowEditMemberModal(true)
	}

	const handleSaveMemberName = async (name: string) => {
		if (!editingMemberId || !id) throw new Error('Member or chapter ID not found')
		await updateMemberName(editingMemberId, id, name, editingMemberEncryptedBlob, editingMemberNonce)
		setShowEditMemberModal(false)
		// Reload the chapter to show updated member names
		try {
			const updated = await getChapterAndSetKey(id)
			setChapter(updated)
		} catch (err) {
			console.error('Failed to reload chapter:', err)
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
					onEdit={() => setEditing(true)}
					onEditNameChange={setEditName}
					onEditDescriptionChange={setEditDescription}
					onSave={handleSave}
					onCancel={() => setEditing(false)}
				/>

				<MeetingsList
					chapterId={id!}
					meetings={meetings}
					loading={meetingsLoading}
					onMeetingCreated={meeting => setMeetings(prev => [...prev, meeting])}
					onMeetingDeleted={id => setMeetings(prev => prev.filter(m => m.id !== id))}
				/>

				<div className="bg-white rounded border border-warm-border p-6 mb-7" style={{ boxShadow: 'var(--shadow)' }}>
					<h3 className="font-heading text-forest-deep mb-2">Members</h3>
					<ul className="divide-y divide-warm-border">
					{chapter?.chapterMembers?.map(member => {
						const isCurrentUser = member.userId === user?.id
						// Display member's name from encrypted blob (if available) or fall back to user's profile name or unknown
						const displayName = member.name || 'Unknown'
						return (
							<li key={member.id} className="py-3 flex justify-between items-center">
								<div className="flex-1">
									<span className="text-sm text-stone">{displayName}</span>
								</div>
								<div className="flex items-center gap-2">
									{isCurrentUser && (
										<button
											onClick={() => handleEditMemberName(member.id, displayName, member.encryptedBlob, member.nonce)}
											className="text-xs px-2 py-1 text-forest border border-forest rounded hover:bg-forest-light transition-colors"
										>
											Edit
										</button>
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
						)
					})}
					</ul>
				</div>
				{isCreator && (<div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
				<h3 className="font-heading text-alert mb-4 transition-colors">Danger Zone</h3>
					<div>			
						<button
							onClick={() => setShowConfirm(true)}
							disabled={deleting}
							className="px-3 py-1 text-sm border border-alert text-alert rounded hover:bg-alert-light transition-colors disabled:opacity-50"
						>
							{deleting ? 'Deleting…' : 'Delete'}
						</button>
						{showConfirm && (
							<ConfirmModal
								header="Delete Chapter?"
								bodyText={<>This will permanently delete the the <span className="text-stone font-medium">{chapter.name}</span> chapter.</>}
								confirmText="Delete"
								onConfirm={handleDelete}
								onCancel={() => setShowConfirm(false)}
								confirming={deleting}
							/>
						)}
					</div>	
				</div>)}
				<MemberNameModal
					isOpen={showEditMemberModal}
					initialName={editingMemberName}
					memberEncryptedBlob={editingMemberEncryptedBlob}
					memberNonce={editingMemberNonce}
					chapter={chapter}
					onSave={handleSaveMemberName}
					onCancel={() => setShowEditMemberModal(false)}
					showCancel={true}
				/>
			</main>
	  	</div>
	)
}
