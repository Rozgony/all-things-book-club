import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SpinWheel } from './SpinWheel'
import { TopicModal } from './TopicModal'
import { MeetingInfo } from './MeetingInfo'
import { TopicForm, type TopicFormData } from './TopicForm'
import { TopicCard } from './TopicCard'
import { type SelectedTheme } from './ThemeTagInput'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { createTopic, updateTopicStatus, updateTopicContent, deleteTopic } from '../../api/topics'
import { getThemesByChapterId, linkThemeToTopic, unlinkThemeFromTopic } from '../../api/themes'
import { updateMeeting, getMeetingById } from '../../api/meetings'
import { MeetingStatus, type Meeting, type Topic, type Theme } from '../../api/types'
import { getMyProfile } from '../../api/users'
import { useAuthStore } from '../../store/authStore'

export function MeetingPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const timezone = useAuthStore((s) => s.timezone)

	const [meeting, setMeeting] = useState<Meeting | null>(null)
	const [loading, setLoading] = useState(true)
	const [name, setName] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [spinning, setSpinning] = useState(false)
	const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)

	const [addingTopic, setAddingTopic] = useState(false)
	const [addError, setAddError] = useState<string | null>(null)

	const [chapterThemes, setChapterThemes] = useState<Theme[]>([])

	const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
	const [savingTopic, setSavingTopic] = useState(false)

	const [editingDate, setEditingDate] = useState(false)
	const [editDateValue, setEditDateValue] = useState('')
	const [videoCallLinkValue, setVideoCallLinkValue] = useState('')
	const [physicalAddressValue, setPhysicalAddressValue] = useState('')
	const [savingDate, setSavingDate] = useState(false)

	const [savingStatus, setSavingStatus] = useState(false)

	const [discussionNotesValue, setDiscussionNotesValue] = useState('')
	const [savingNotes, setSavingNotes] = useState(false)

	const toDatetimeLocal = (iso: string) => {
		const d = new Date(iso)
		const pad = (n: number) => String(n).padStart(2, '0')
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
	}

	const handleEditDateStart = () => {
		if (!meeting) return
		setEditDateValue(toDatetimeLocal(meeting.scheduledAt))
		setVideoCallLinkValue(meeting.videoCallLink || '')
		setPhysicalAddressValue(meeting.physicalAddress || '')
		setEditingDate(true)
	}

	const handleSaveDate = async () => {
		if (!meeting || !editDateValue) return
		setSavingDate(true)
		try {
			const updated = await updateMeeting(meeting.id, {
				scheduledAt: new Date(editDateValue).toISOString(),
				videoCallLink: videoCallLinkValue,
				physicalAddress: physicalAddressValue,

				chapterId: meeting.chapterId
			})
			setMeeting(prev => prev ? { ...prev, scheduledAt: updated.scheduledAt, videoCallLink: videoCallLinkValue || null, physicalAddress: physicalAddressValue || null } : prev)
			setEditingDate(false)
		} catch {
			// silent — keep modal open
		} finally {
			setSavingDate(false)
		}
	}

	const handleStatusUpdate = async (status?: MeetingStatus) => {
		if (!meeting) return
		setSavingStatus(true)
		let newStatus;
		if(status) {
			newStatus = status; 
		} else if (meeting.status === MeetingStatus.ACTIVE) {
			newStatus = MeetingStatus.COMPLETED
		} else  {
			newStatus = MeetingStatus.ACTIVE
		}
		try {
			const updated = await updateMeeting(meeting.id, { status: newStatus })
			setMeeting(prev => prev ? { ...prev, status: updated.status } : prev)
		} catch (e) {
			// silent — keep modal open
			console.error(e)
		} finally {
			setSavingStatus(false)
		}
	}

	useEffect(() => {
		getMyProfile()
			.then(p => {
				setName(p.name ?? '')
			})
			.catch(() => setError('Failed to load profile'))

		if (!id) return
		getMeetingById(id)
			.then((meeting) => {
				setMeeting(meeting)
				setDiscussionNotesValue(meeting.discussionNotes || '')
			})
			.catch(() => setError('Failed to load meeting'))
			.finally(() => setLoading(false))
	}, [])

	useEffect(() => {
		if (!meeting?.chapterId) return
		getThemesByChapterId(meeting.chapterId)
			.then(setChapterThemes)
			.catch(() => {})
	}, [meeting?.chapterId])

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric',
			hour: '2-digit', minute: '2-digit',
			...(timezone ? { timeZone: timezone } : {}),
		})

	// Reconciles a topic form's theme selections against the topic's previously linked
	// theme ids: unlinks removed themes, links newly selected/created themes, and returns
	// the final set of theme ids plus any brand-new themes that were created.
	const syncTopicThemes = async (topicId: string, chapterId: string, previousThemeIds: string[], selectedThemes: SelectedTheme[]) => {
		const selectedExistingIds = new Set(selectedThemes.filter(t => t.id).map(t => t.id as string))
		const toUnlink = previousThemeIds.filter(themeId => !selectedExistingIds.has(themeId))
		await Promise.all(toUnlink.map(themeId => unlinkThemeFromTopic(topicId, themeId)))

		const finalThemeIds: string[] = []
		const newlyCreatedThemes: Theme[] = []
		const previousSet = new Set(previousThemeIds)
		for (const theme of selectedThemes) {
			if (theme.id && previousSet.has(theme.id)) {
				// Already linked — keep it
				finalThemeIds.push(theme.id)
			} else {
				// New link (existing theme added during edit, or brand-new theme)
				const { themeId, createdAt } = await linkThemeToTopic(topicId, chapterId, theme)
				finalThemeIds.push(themeId)
				if (!theme.id) {
					newlyCreatedThemes.push({ id: themeId, chapterId, createdAt: createdAt ?? new Date().toISOString(), name: theme.name })
				}
			}
		}
		return { finalThemeIds, newlyCreatedThemes }
	}

	const handleAddTopic = async (data: TopicFormData) => {
		if (!id || !meeting) return
		setAddingTopic(true)
		setAddError(null)
		try {
			const topic = await createTopic(meeting.chapterId, id, data.title, data.description || undefined, data.url)
			const { finalThemeIds, newlyCreatedThemes } = await syncTopicThemes(topic.id, meeting.chapterId, [], data.themes)
			const topicWithThemes = { ...topic, themeIds: finalThemeIds }

			setMeeting(prev => {
				if (!prev) return null
				if (prev.topics) return { ...prev, topics: [...prev.topics, topicWithThemes] }
				return { ...prev, topics: [topicWithThemes] }
			})
			if (newlyCreatedThemes.length > 0) {
				setChapterThemes(prev => [...prev, ...newlyCreatedThemes])
			}
		} catch (e) {
			console.error('Error adding topic:', e)
			setAddError('Failed to add topic')
		} finally {
			setAddingTopic(false)
		}
	}

	const handleEditTopicStart = (topic: Topic) => {
		setEditingTopicId(topic.id)
	}

	const handleSaveTopic = async (topicId: string, data: TopicFormData) => {
		if (!meeting) return
		setSavingTopic(true)
		try {
			const existingTopic = meeting.topics?.find(t => t.id === topicId)
			await updateTopicContent(topicId, meeting.chapterId, existingTopic?.createdAt ?? new Date().toISOString(), data.title, data.description || undefined, data.url || undefined)
			const previousThemeIds = existingTopic?.themeIds || []
			const { finalThemeIds, newlyCreatedThemes } = await syncTopicThemes(topicId, meeting.chapterId, previousThemeIds, data.themes)
			setMeeting(prev => prev ? {
				...prev,
				topics: prev.topics?.map(t => t.id === topicId
					? { ...t, title: data.title, description: data.description || null, url: data.url || undefined, themeIds: finalThemeIds }
					: t
				) || []
			} : prev)
			if (newlyCreatedThemes.length > 0) {
				setChapterThemes(prev => [...prev, ...newlyCreatedThemes])
			}
			setEditingTopicId(null)
		} catch {
			// silent
		} finally {
			setSavingTopic(false)
		}
	}

	const handleSpinEnd = async (topic: Topic) => {
		setSpinning(false)
		try {
			await updateTopicStatus(topic.id, topic, 'SELECTED')
			setMeeting(prev => prev ? {
				...prev,
				topics: prev.topics?.map(t => t.id === topic.id ? {...topic, status: 'SELECTED'} : t) || []
			} : prev)
			setSelectedTopic(topic)
		} catch {
			setSelectedTopic(topic)
		}
	}

	const handleMarkDiscussed = async () => {
		if (!selectedTopic) return
		try {
			await updateTopicStatus(selectedTopic.id, selectedTopic, 'DISCUSSED')
			setMeeting(prev => prev ? {
				...prev,
				topics: prev.topics?.map(t => t.id === selectedTopic.id ? {...selectedTopic, status: 'DISCUSSED'} : t) || []
			} : prev)
		} catch {
			// keep modal open, user can retry
		} finally {
			setSelectedTopic(null)
		}
	}

	const handleSkip = async () => {
		if (!selectedTopic) return
		try {
			await updateTopicStatus(selectedTopic.id, selectedTopic, 'PENDING')
			setMeeting(prev => prev ? {
				...prev,
				topics: prev.topics?.map(t => t.id === selectedTopic.id ? {...selectedTopic, status: 'PENDING'} : t) || []
			} : prev)
		} catch {
			// silent
		} finally {
			setSelectedTopic(null)
		}
	}

	const handleDeleteTopic = async (topicId: string) => {
		try {
			await deleteTopic(topicId)
			setMeeting(prev => prev ? {
				...prev,
				topics: prev.topics?.filter(t => t.id !== topicId) || []
			} : prev)
		} catch {
			// silent
		}
	}

	const handleSaveNotes = async () => {
		if (!meeting) return
		if (discussionNotesValue === (meeting.discussionNotes || '')) return
		setSavingNotes(true)
		try {
			await updateMeeting(meeting.id, {
				discussionNotes: discussionNotesValue,
				chapterId: meeting.chapterId
			})
			setMeeting(prev => prev ? { ...prev, discussionNotes: discussionNotesValue } : prev)
		} catch {
			// silent — textarea keeps the unsaved value so the user can retry (e.g. on blur again)
		} finally {
			setSavingNotes(false)
		}
	}

	if (loading) return (
		<div className="flex flex-col items-center justify-center min-h-screen">
			<div>Loading Meeting…</div>
			<LoadingSpinner />
		</div>
	)

	if (error || !meeting) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen text-stone-muted gap-4">
				<p>{error ?? 'Meeting not found'}</p>
				<button onClick={() => navigate(-1)} className="text-terracotta hover:underline text-sm">Go back</button>
			</div>
		)
	}

	const pendingTopics = meeting?.topics?.filter(t => t.status === 'PENDING') || []
	const discussedTopics = meeting?.topics?.filter(t => t.status === 'DISCUSSED') || []
	return (
		<div className="min-h-screen bg-cream">
			<Nav showLogout={true} showProfile={true} username={name}/>

			<main className="max-w-5gl mx-auto px-4 py-10">
				<div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-8">
					{/* Meeting Info Panel */}
					<div className="space-y-6">
						<MeetingInfo
							meeting={meeting}
							editingDate={editingDate}
							editDateValue={editDateValue}
							videoCallLinkValue={videoCallLinkValue}
							physicalAddressValue={physicalAddressValue}
							savingDate={savingDate}
							savingStatus={savingStatus}
							onEditDateStart={handleEditDateStart}
							onSaveDate={handleSaveDate}
							onCancelEdit={() => setEditingDate(false)}
							onEditDateValueChange={setEditDateValue}
							onVideoCallLinkChange={setVideoCallLinkValue}
							onPhysicalAddressChange={setPhysicalAddressValue}
							onStatusUpdate={handleStatusUpdate}
							formatDate={formatDate}
						/>

						{/* Add topic */}
						<div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
							<h3 className="font-heading text-forest-deep mb-4">Topics</h3>
							<TopicForm
								chapterThemes={chapterThemes}
								submitLabel="Add"
								pendingLabel="Adding…"
								submitting={addingTopic}
								onSubmit={handleAddTopic}
							/>
							{addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}

							{pendingTopics.length > 0 ? (
								<ul className="divide-y divide-warm-border">
									{pendingTopics.map(topic => (
										<li key={topic.id} className="py-3">
											{editingTopicId === topic.id ? (
												<TopicForm
													chapterThemes={chapterThemes}
													initialTitle={topic.title}
													initialUrl={topic.url}
													initialDescription={topic.description || ''}
													initialThemes={(topic.themeIds || []).map(themeId => {
														const theme = chapterThemes.find(t => t.id === themeId)
														return { id: themeId, name: theme?.name || '' }
													}).filter(t => t.name)}
													submitLabel="Save"
													pendingLabel="Saving…"
													submitting={savingTopic}
													onSubmit={data => handleSaveTopic(topic.id, data)}
													onCancel={() => setEditingTopicId(null)}
												/>
											) : (
												<TopicCard
													topic={topic}
													chapterThemes={chapterThemes}
													onEdit={handleEditTopicStart}
													onDelete={handleDeleteTopic}
												/>
											)}
										</li>
									))}
								</ul>
							) : (
								<p className="text-stone-muted text-sm">No pending topics — add some above.</p>
							)}
						</div>

						{/* Discussed topics */}
						{discussedTopics.length > 0 && (
							<div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
								<h3 className="font-heading text-forest-deep mb-3">Discussed</h3>
								<ul className="divide-y divide-warm-border">
									{discussedTopics.map(topic => (
										<li key={topic.id} className="py-2 flex items-center gap-2 flex-wrap">
											<span className="text-stone-muted">✓</span>
										<button
											onClick={() => setSelectedTopic(topic)}
											className="text-sm text-stone-muted line-through hover:text-stone transition-colors text-left flex-1"
										>
											{topic.title}
										</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>

					<div className="space-y-6">
						{/* Wheel */}
						<div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
							<SpinWheel
								topics={meeting.topics || []}
								spinning={spinning}
								onSpinStart={() => setSpinning(true)}
								onSpinEnd={handleSpinEnd}
								meeting={meeting}
								updateMeetingStatus={handleStatusUpdate}
							/>
						</div>

						{/* Discussion Notes */}
						<div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
							<div className="flex items-center justify-between mb-3">
								<h3 className="font-heading text-forest-deep">Discussion Notes</h3>
								{savingNotes && <span className="text-xs text-stone-muted">Saving…</span>}
							</div>
							<textarea
								value={discussionNotesValue}
								onChange={e => setDiscussionNotesValue(e.target.value)}
								onBlur={handleSaveNotes}
								placeholder="Notes from the discussion…"
								rows={8}
								className="w-full bg-transparent border border-warm-border rounded text-sm text-stone focus:outline-none focus:border-terracotta p-3 resize-y"
							/>
						</div>
					</div>
				</div>
			</main>

			<TopicModal
				topic={selectedTopic}
			chapterThemes={chapterThemes}
			onMarkDiscussed={handleMarkDiscussed}
			onSkip={handleSkip}
			onClose={() => setSelectedTopic(null)}
			readOnly={selectedTopic?.status === 'DISCUSSED'}
		/>
	</div>
)
}