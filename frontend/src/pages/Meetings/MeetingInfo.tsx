import { useNavigate } from 'react-router-dom'
import { type Meeting, MeetingStatus, SpinnerSize } from '../../api/types'
import { MeetingStatusBadge } from '../../components/MeetingStatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'

interface MeetingInfoProps {
	meeting: Meeting
	editingDate: boolean
	editDateValue: string
	videoCallLinkValue: string
	physicalAddressValue: string
	savingDate: boolean
	savingStatus: boolean
	onEditDateStart: () => void
	onSaveDate: () => void
	onCancelEdit: () => void
	onEditDateValueChange: (value: string) => void
	onVideoCallLinkChange: (value: string) => void
	onPhysicalAddressChange: (value: string) => void
	onStatusUpdate: () => void
	formatDate: (dateString: string) => string
}

export function MeetingInfo({
	meeting,
	editingDate,
	editDateValue,
	videoCallLinkValue,
	physicalAddressValue,
	savingDate,
	savingStatus,
	onEditDateStart,
	onSaveDate,
	onCancelEdit,
	onEditDateValueChange,
	onVideoCallLinkChange,
	onPhysicalAddressChange,
	onStatusUpdate,
	formatDate
}: MeetingInfoProps) {
	const navigate = useNavigate()

	return (
		<>
			<div className="bg-white rounded border border-warm-border p-6" style={{ boxShadow: 'var(--shadow)' }}>
				<div className="flex items-center justify-between">
					<button onClick={() => navigate(-1)} className="text-med underline text-stone-muted hover:text-stone inline-block">
						{meeting.chapter?.name || ''} Chapter
					</button>
					<div className="flex items-center">
						<MeetingStatusBadge status={meeting.status}></MeetingStatusBadge>
						<button
							onClick={() => onStatusUpdate()}
							className={`flex items-center justify-center ml-2 px-1.5 py-1.5 min-w-24 ${meeting.status === MeetingStatus.ACTIVE ? 'text-terracotta hover:text-terracotta-dark border-terracotta' : 'text-forest hover:text-forest-deep border-forest'} text-sm border rounded transition-colors disabled:opacity-50`}
						>
							{savingStatus ? (
								<LoadingSpinner size={SpinnerSize.SM} />
							) : meeting.status === MeetingStatus.ACTIVE ? (
								'End Meeting'
							) : (
								'Start Meeting'
							)}
						</button>
					</div>
				</div>
				{editingDate ? (
					<div className="mt-2 space-y-4">
						<div className="flex items-center justify-between gap-2">
							<input
								type="datetime-local"
								value={editDateValue}
								onChange={e => onEditDateValueChange(e.target.value)}
								className="font-heading text-forest-deep bg-transparent border-b border-terracotta focus:outline-none focus:border-terracotta py-0.5 w-full"
								style={{ fontSize: '1.33em' }}
							/>
						</div>
						<div className="flex items-center gap-6 flex-wrap">
							<div className="flex-1 min-w-40">
								<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Video Call</p>
								<input
									type="url"
									value={videoCallLinkValue}
									onChange={e => onVideoCallLinkChange(e.target.value)}
									placeholder="https://meet.google.com/…"
									className="w-full bg-transparent border-b border-warm-border text-terracotta text-sm focus:outline-none focus:border-terracotta py-0.5 placeholder:text-stone-muted/50"
								/>
							</div>
							<div className="flex-1 min-w-40">
								<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Location</p>
								<input
									type="text"
									value={physicalAddressValue}
									onChange={e => onPhysicalAddressChange(e.target.value)}
									placeholder="123 Main St, City, State"
									className="w-full bg-transparent border-b border-warm-border text-terracotta text-sm focus:outline-none focus:border-terracotta py-0.5 placeholder:text-stone-muted/50"
								/>
							</div>
						</div>
						<div className="flex items-center gap-2 justify-end">
							<button
								onClick={onSaveDate}
								disabled={savingDate}
								className="px-3 py-1.5 bg-terracotta text-white text-sm rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
							>
								{savingDate ? 'Saving…' : 'Save'}
							</button>
							<button
								onClick={onCancelEdit}
								className="px-3 py-1.5 border border-warm-border text-stone-muted text-sm rounded hover:bg-cream transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				) : (
					<div className="flex items-center justify-start gap-2 mb-2 mt-2">
						<h2 className="font-heading text-forest-deep">
							{formatDate(meeting.scheduledAt)}
						</h2>
						{['SCHEDULED', 'ACTIVE'].includes(meeting.status) ? (
							<button
								onClick={onEditDateStart}
								className="text-stone-muted hover:text-stone transition-colors p-1"
								title="Edit date"
							>
								<div className="rotate-90">✏️</div>
							</button>
						) : null}
					</div>
				)}

				{!editingDate && (meeting.videoCallLink || meeting.physicalAddress) && (
					<div className="flex items-center gap-6 flex-wrap">
						{meeting.videoCallLink && (
							<div>
								<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Video Call</p>
								<a
									href={meeting.videoCallLink}
									target="_blank"
									rel="noopener noreferrer"
									className="text-terracotta hover:text-terracotta-dark underline text-sm break-all"
								>
									Open Video Link
								</a>
							</div>
						)}
						{meeting.physicalAddress && (
							<div>
								<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Location</p>
								<a
									href={`https://maps.google.com/?q=${encodeURIComponent(meeting.physicalAddress)}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-terracotta hover:text-terracotta-dark underline text-sm break-all"
								>
									{meeting.physicalAddress}
								</a>
							</div>
						)}
					</div>
				)}
			</div>
		</>
	)
}
