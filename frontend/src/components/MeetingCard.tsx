import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Meeting } from '../api/types'
import { deleteMeeting } from '../api/meetings'
import { ConfirmModal } from './ConfirmModal'
import { MeetingStatusBadge } from './MeetingStatusBadge'

interface MeetingCardProps {
	meeting: Meeting
	onDeleted?: (id: string) => void
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

export function MeetingCard({ meeting, onDeleted }: MeetingCardProps) {
	const navigate = useNavigate()
	const [showConfirm, setShowConfirm] = useState(false)
	const [deleting, setDeleting] = useState(false)

	const handleDelete = async () => {
		setDeleting(true)
		try {
			await deleteMeeting(meeting.id)
			onDeleted?.(meeting.id)
		} finally {
			setDeleting(false)
			setShowConfirm(false)
		}
	}

	return (
		<>
			<li
				className="py-3 flex justify-between items-center cursor-pointer hover:bg-cream/50 -mx-2 px-2 rounded transition-colors"
				onClick={() => navigate(`/meetings/${meeting.id}`)}
			>
				<div>
					<p className="text-sm text-stone font-medium">{formatMeetingDate(meeting.scheduledAt)}</p>
					<p className="text-xs text-stone-muted">{meeting.duration} minutes</p>
				</div>
				<div className="flex items-center gap-2">
					<MeetingStatusBadge status={meeting.status} />
					{ 
						meeting.status === 'SCHEDULED' ? 
						<button
							onClick={e => { e.stopPropagation(); setShowConfirm(true) }}
							className="text-stone-muted hover:text-red-500 transition-colors p-1"
							title="Delete meeting"
						>
							🗑️
						</button>
						: null
					}
				</div>
			</li>

			{showConfirm && (
				<ConfirmModal
					header="Delete meeting?"
					bodyText={<>This will permanently delete the meeting on <span className="text-stone font-medium">{formatMeetingDate(meeting.scheduledAt)}</span> and all its topics.</>}
					confirmText="Delete"
					onConfirm={handleDelete}
					onCancel={() => setShowConfirm(false)}
					confirming={deleting}
				/>
			)}
		</>
	)
}
