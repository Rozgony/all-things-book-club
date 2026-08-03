import { useState } from 'react'
import { type Meeting } from '../../api/types'
import { MeetingCard } from './MeetingCard'
import { ScheduleMeetingForm } from './ScheduleMeetingForm'

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
	const [viewPastMeetings, setViewPastMeetings] = useState(false)
	const [showRecurringRule, setShowRecurringRule] = useState(false)

	const activeRecurringRuleId = meetings.find(m => m.recurringGroupId)?.recurringGroupId ?? null

	return (
		<div className="bg-white rounded border border-warm-border p-6 mb-7" style={{ boxShadow: 'var(--shadow)' }}>
			<div className="flex justify-between items-center mb-4">
				<h3 className="font-heading text-forest-deep">Scheduled & Active Meetings</h3>
				{isAdmin && !showForm && (
					<div className="flex gap-2">
						{activeRecurringRuleId && (
							<button
								onClick={() => setShowRecurringRule(true)}
								className="px-3 py-1 text-sm border border-warm-border rounded hover:bg-cream transition-colors"
							>
								Manage Recurring
							</button>
						)}
						<button
							onClick={() => setShowForm(true)}
							className="px-3 py-1 text-sm border border-warm-border rounded hover:bg-cream transition-colors"
						>
							+ Schedule Meeting
						</button>
					</div>
				)}
			</div>

			{showRecurringRule && activeRecurringRuleId && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRecurringRule(false)}>
					<div className="bg-white rounded border border-warm-border p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-lg font-heading text-forest-deep">Recurring Meeting</h2>
							<button
								onClick={() => setShowRecurringRule(false)}
								className="text-stone-muted hover:text-stone text-2xl leading-none"
								aria-label="Close modal"
							>
								×
							</button>
						</div>
						<ScheduleMeetingForm
							chapterId={chapterId}
							editRuleId={activeRecurringRuleId}
							onCancel={() => setShowRecurringRule(false)}
						/>
					</div>
				</div>
			)}

			{showForm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
					<div className="bg-white rounded border border-warm-border p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-lg font-heading text-forest-deep">Schedule a Meeting</h2>
							<button
								onClick={() => setShowForm(false)}
								className="text-stone-muted hover:text-stone text-2xl leading-none"
								aria-label="Close modal"
							>
								×
							</button>
						</div>
						<ScheduleMeetingForm
							chapterId={chapterId}
							onMeetingCreated={onMeetingCreated}
							onCancel={() => setShowForm(false)}
						/>
					</div>
				</div>
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
						<ul className="divide-y divide-warm-border h-80 overflow-y-auto overflow-x-hidden border border-warm-border rounded bg-white p-4">
							{pastMeetings.length > 0 ? (
								pastMeetings.map(meeting => (
									<MeetingCard key={meeting.id} meeting={meeting} onDeleted={onMeetingDeleted} />
								))
							) : (
								<p className="py-4 text-stone-muted text-sm">No past meetings</p>
							)}
						</ul> :
						<ul className="divide-y divide-warm-border h-80 overflow-y-auto overflow-x-hidden border border-warm-border rounded bg-white p-4">
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
