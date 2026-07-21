import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Meeting, meetingStatusReadable } from '../api/types'
import { createMeeting } from '../api/meetings'

interface MeetingsListProps {
	chapterId: string
	meetings: Meeting[]
	loading: boolean
	onMeetingCreated: (meeting: Meeting) => void
	isAdmin: boolean
}

function formatMeetingDate(dateString: string) {
	const date = new Date(dateString)
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

export function MeetingsList({ chapterId, meetings, loading, onMeetingCreated, isAdmin }: MeetingsListProps) {
	const navigate = useNavigate()
	const upcomingAndActive = meetings
		.filter(m => m.status === 'SCHEDULED' || m.status === 'ACTIVE')
		.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

	const [showForm, setShowForm] = useState(false)
	const [scheduledAt, setScheduledAt] = useState('')
	const [duration, setDuration] = useState(60)
	const [saving, setSaving] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)

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
							className="px-4 py-2 bg-terracotta text-white text-sm tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
						>
							{saving ? 'Scheduling…' : 'Schedule'}
						</button>
						<button
							type="button"
							onClick={() => { setShowForm(false); setFormError(null) }}
							className="px-4 py-2 text-sm text-stone-muted hover:text-stone transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{loading ? (
				<p className="text-stone-muted text-sm">Loading meetings…</p>
			) : upcomingAndActive.length > 0 ? (
				<ul className="divide-y divide-warm-border">
					{upcomingAndActive.map(meeting => (
						<li
							key={meeting.id}
							className="py-3 flex justify-between items-center cursor-pointer hover:bg-cream/50 -mx-2 px-2 rounded transition-colors"
							onClick={() => navigate(`/meetings/${meeting.id}`)}
						>
							<div>
								<p className="text-sm text-stone font-medium">{formatMeetingDate(meeting.scheduledAt)}</p>
								<p className="text-xs text-stone-muted">{meeting.duration} minutes</p>
							</div>
							<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
								meeting.status === 'ACTIVE'
									? 'bg-red-100 text-red-700'
									: 'bg-terracotta-light text-terracotta'
							}`}>
								{meetingStatusReadable[meeting.status]}
							</span>
						</li>
					))}
				</ul>
			) : (
				<p className="text-stone-muted text-sm">No upcoming meetings scheduled</p>
			)}
		</div>
	)
}
