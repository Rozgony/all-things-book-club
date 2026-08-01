import { useState } from 'react'
import { type Meeting } from '../../api/types'
import { MeetingCard } from './MeetingCard'
import { createMeeting } from '../../api/meetings'

interface MeetingsListProps {
	chapterId: string
	meetings: Meeting[]
	loading: boolean
	onMeetingCreated: (meeting: Meeting) => void
	onMeetingDeleted?: (id: string) => void
	isAdmin: boolean
}

export function MeetingsList({ chapterId, meetings, loading, onMeetingCreated, onMeetingDeleted, isAdmin }: MeetingsListProps) {
	const upcomingAndActive = meetings
		.filter(m => m.status === 'SCHEDULED' || m.status === 'ACTIVE')
		.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
	
	const pastMeetings = meetings
		.filter(m => m.status === 'COMPLETED' || m.status === 'CANCELLED')
		.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

	const [showForm, setShowForm] = useState(false)
	const [scheduledAt, setScheduledAt] = useState('')
	const [duration, setDuration] = useState(60)
	const [saving, setSaving] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)
	const [viewPastMeetings, setViewPastMeetings] = useState(false)

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setSaving(true)
		setFormError(null)
		try {
			const meeting = await createMeeting(chapterId, scheduledAt, duration)
			onMeetingCreated(meeting)
			setShowForm(false)
			setScheduledAt('')
			setDuration(60)
		} catch {
			setFormError('Failed to schedule meeting')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="bg-white rounded border border-warm-border p-6 mb-7" style={{ boxShadow: 'var(--shadow)' }}>
			<div className="flex justify-between items-center mb-4">
				<h3 className="font-heading text-forest-deep">Scheduled & Active Meetings</h3>
				{isAdmin && !showForm && (
					<button
						onClick={() => setShowForm(true)}
						className="px-3 py-1 text-sm border border-warm-border rounded hover:bg-cream transition-colors"
					>
						+ Schedule Meeting
					</button>
				)}
			</div>

			{showForm && (
				<form onSubmit={handleCreate} className="mb-5 p-4 bg-cream/40 rounded border border-warm-border space-y-3">
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
							Date & Time <span className="text-red-500">*</span>
						</label>
						<input
							type="datetime-local"
							value={scheduledAt}
							onChange={e => setScheduledAt(e.target.value)}
							required
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
							Duration (minutes)
						</label>
						<input
							type="number"
							value={duration}
							min={15}
							step={15}
							onChange={e => setDuration(Number(e.target.value))}
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
					{formError && <p className="text-sm text-red-600">{formError}</p>}
					<div className="flex gap-3">
						<button
							type="submit"
							disabled={saving}
							className="px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-deep transition-colors disabled:opacity-50"
						>
							{saving ? 'Scheduling…' : 'Schedule'}
						</button>
						<button
							type="button"
							onClick={() => { setShowForm(false); setFormError(null) }}
							className="px-4 py-2 text-sm text-terracotta hover:text-terracotta-dark border rounded border-terracotta transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{loading ? (
				<p className="text-stone-muted text-sm">Loading meetings…</p>
			) : (
				<div className="min-h-36">
					<div className="flex">
						<button 
							className={`min-w-36 px-4 py-2 ${viewPastMeetings ? 'bg-cream text-forest' : 'bg-forest text-white'} border-warm-border  font-heading tracking-wide rounded-tl hover:${viewPastMeetings ? 'bg-cream-dark' : 'bg-forest-dark'} transition-colors`}
							onClick={() => setViewPastMeetings(false)}>
								Upcoming
						</button>
						<button 
							className={`min-w-36 px-4 py-2 ${viewPastMeetings ? 'bg-forest text-white' : 'bg-cream text-forest'} border-warm-border font-heading tracking-wide rounded-tr hover:${viewPastMeetings ? 'bg-forest-dark' : 'bg-cream-dark'} transition-colors`}
							onClick={() => setViewPastMeetings(true)}>
								Past
						</button>
					</div>
					{ 
						viewPastMeetings ? 
						<ul className="divide-y divide-warm-border">
							{pastMeetings.length > 0 ? (
								pastMeetings.map(meeting => (
									<MeetingCard key={meeting.id} meeting={meeting} onDeleted={onMeetingDeleted} />
								))
							) : (
								<p className="py-4 text-stone-muted text-sm">No past meetings</p>
							)}
						</ul> :
						<ul className="divide-y divide-warm-border">
							{upcomingAndActive.length > 0 ? (
								upcomingAndActive.map(meeting => (
									<MeetingCard key={meeting.id} meeting={meeting} onDeleted={onMeetingDeleted} />
								))
							) : (
								<p className="py-4 text-stone-muted text-sm">No upcoming meetings scheduled</p>
							)}
						</ul>
					}
				</div>
			)}
		</div>
	)
}
