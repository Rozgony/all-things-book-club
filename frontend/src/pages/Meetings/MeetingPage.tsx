import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Nav } from '../../components/Nav'
import { SpinWheel } from './SpinWheel'
import { TopicModal } from './TopicModal'
import { MeetingInfo } from './MeetingInfo'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { createTopic, updateTopicStatus, deleteTopic } from '../../api/topics'
import { updateMeeting, getMeetingById } from '../../api/meetings'
import { MeetingStatus, type Meeting, type Topic } from '../../api/types'

export function MeetingPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()

	const [meeting, setMeeting] = useState<Meeting | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [spinning, setSpinning] = useState(false)
	const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)

	const [newTopicTitle, setNewTopicTitle] = useState('')
	const [addingTopic, setAddingTopic] = useState(false)
	const [addError, setAddError] = useState<string | null>(null)

	const [editingDate, setEditingDate] = useState(false)
	const [editDateValue, setEditDateValue] = useState('')
	const [videoCallLinkValue, setVideoCallLinkValue] = useState('')
	const [physicalAddressValue, setPhysicalAddressValue] = useState('')
	const [savingDate, setSavingDate] = useState(false)

	const [savingStatus, setSavingStatus] = useState(false)

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
		if (!id) return
		getMeetingById(id)
			.then((meeting) => setMeeting(meeting))
			.catch(() => setError('Failed to load meeting'))
			.finally(() => setLoading(false))
	}, [])

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		})

	const handleAddTopic = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!id || !newTopicTitle.trim()) return
		setAddingTopic(true)
		setAddError(null)
		try {
			const topic = await createTopic(meeting?.chapterId!, id, newTopicTitle.trim())
			setMeeting(prev => {
				if (!prev) return null
				if (prev.topics) return { ...prev, topics: [...prev.topics, topic] }
				return { ...prev, topics: [topic] }
			})
			setNewTopicTitle('')
		} catch (e) {
			console.log({e})
			setAddError('Failed to add topic')
		} finally {
			setAddingTopic(false)
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
			<Nav showLogout={true} showProfile={true} />

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
							<form onSubmit={handleAddTopic} className="flex gap-2 mb-4">
								<input
									type="text"
									maxLength={48}
									value={newTopicTitle}
									onChange={e => setNewTopicTitle(e.target.value)}
									placeholder="Add a topic…"
									className="flex-1 px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone text-sm focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
								/>
								<button
									type="submit"
									disabled={addingTopic || !newTopicTitle.trim()}
									className="px-4 py-2 bg-forest text-white text-sm rounded hover:bg-forst-dark transition-colors disabled:opacity-50"
								>
									Add
								</button>
							</form>
							{addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}

							{pendingTopics.length > 0 ? (
								<ul className="divide-y divide-warm-border">
									{pendingTopics.map(topic => (
										<li key={topic.id} className="py-2.5 flex justify-between items-center">
											<span className="text-sm text-stone">{topic.title}</span>
											<button
												onClick={() => handleDeleteTopic(topic.id)}
												className="text-xs text-stone-muted hover:text-red-500 transition-colors ml-2"
											>
												remove
											</button>
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
										<li key={topic.id} className="py-2 flex items-center gap-2">
											<span className="text-stone-muted">✓</span>
											<span className="text-sm text-stone-muted line-through">{topic.title}</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
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
				</div>
			</main>

			<TopicModal
				topic={selectedTopic}
				onMarkDiscussed={handleMarkDiscussed}
				onSkip={handleSkip}
			/>
		</div>
	)
}
