import { type Meeting, meetingStatusReadable } from '../api/types'

interface MeetingStatusBadgeProps {
	status: Meeting['status']
}

export function MeetingStatusBadge({ status }: MeetingStatusBadgeProps) {
	return (
		<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
			status === 'ACTIVE'
				? 'bg-forest-light text-forest'
				: 'bg-cream text-terracotta-dark'
		}`}>
			{meetingStatusReadable[status]}
		</span>
	)
}
