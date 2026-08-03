import { useEffect, useState } from 'react'
import { type Meeting, type RecurringRule } from '../../api/types'
import { MeetingFrequency, meetingFrequencyReadable } from '../../api/types'
import { createMeeting, createRecurringRule, getRecurringRule, updateRecurringRule } from '../../api/meetings'

interface ScheduleMeetingFormProps {
	chapterId: string
	editRuleId?: string
	onMeetingCreated?: (meeting: Meeting) => void
	onRuleUpdated?: (rule: RecurringRule) => void
	onCancel: () => void
}

function toDatetimeLocal(iso: string | null): string {
	if (!iso) return ''
	const d = new Date(iso)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ScheduleMeetingForm({ chapterId, editRuleId, onMeetingCreated, onRuleUpdated, onCancel }: ScheduleMeetingFormProps) {
	const isEditing = !!editRuleId
	const [isRecurring, setIsRecurring] = useState(isEditing)
	const [scheduledAt, setScheduledAt] = useState('')
	const [duration, setDuration] = useState(60)
	const [videoCallLink, setVideoCallLink] = useState('')
	const [physicalAddress, setPhysicalAddress] = useState('')
	const [frequency, setFrequency] = useState<MeetingFrequency>(MeetingFrequency.WEEKLY)
	const [interval, setInterval] = useState(1)
	const [endDate, setEndDate] = useState('')
	const [saving, setSaving] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)
	const [loading, setLoading] = useState(isEditing)

	useEffect(() => {
		if (!editRuleId) return
		let cancelled = false
		setLoading(true)
		getRecurringRule(editRuleId)
			.then(rule => {
				if (cancelled) return
				setFrequency(rule.frequency)
				setInterval(rule.interval)
				setDuration(rule.duration)
				setEndDate(toDatetimeLocal(rule.endDate))
			})
			.catch(() => { if (!cancelled) setFormError('Failed to load recurring meeting') })
			.finally(() => { if (!cancelled) setLoading(false) })
		return () => { cancelled = true }
	}, [editRuleId])

	const resetForm = () => {
		setScheduledAt('')
		setDuration(60)
		setVideoCallLink('')
		setPhysicalAddress('')
		setIsRecurring(false)
		setFrequency(MeetingFrequency.WEEKLY)
		setInterval(1)
		setEndDate('')
	}

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setSaving(true)
		setFormError(null)
		try {
			if (editRuleId) {
				const rule = await updateRecurringRule(editRuleId, { frequency, interval, duration, endDate: endDate || null })
				onRuleUpdated?.(rule)
				onCancel()
				return
			}
			const meeting = isRecurring
				? await createRecurringRule(
					chapterId,
					frequency,
					interval,
					scheduledAt,
					endDate || undefined,
					duration,
					videoCallLink || undefined,
					physicalAddress || undefined
				)
				: await createMeeting(chapterId, scheduledAt, duration, videoCallLink || undefined, physicalAddress || undefined)
			onMeetingCreated?.(meeting)
			resetForm()
			onCancel()
		} catch (err) {
			setFormError(err instanceof Error ? err.message : (editRuleId ? 'Failed to save recurring meeting' : isRecurring ? 'Failed to schedule recurring meeting' : 'Failed to schedule meeting'))
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return <p className="text-stone-muted text-sm">Loading…</p>
	}

	return (
		<form onSubmit={handleCreate} className="mb-5 p-4 bg-cream/40 rounded border border-warm-border space-y-3">
			{!isEditing && (
				<div className="flex items-center gap-2">
					<button
						type="button"
						role="switch"
						aria-checked={isRecurring}
						onClick={() => setIsRecurring(!isRecurring)}
						className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta ${isRecurring ? 'bg-forest' : 'bg-warm-border'}`}
					>
						<span
							className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-1'}`}
						/>
					</button>
					<span className="text-xs font-semibold text-stone-muted uppercase tracking-wider">
						Recurring meeting
					</span>
				</div>
			)}

			{!isEditing && (
				<div>
					<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
						{isRecurring ? 'Start Date & Time' : 'Date & Time'} <span className="text-red-500">*</span>
					</label>
					<input
						type="datetime-local"
						value={scheduledAt}
						onChange={e => setScheduledAt(e.target.value)}
						required
						className="w-full px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
					/>
				</div>
			)}

			{(isEditing || isRecurring) && (
				<>
					<div className="flex gap-3 items-center">
						<span className="text-sm font-semibold text-stone-muted whitespace-nowrap">Every</span>
						<input
							type="number"
							value={interval}
							min={1}
							step={1}
							onChange={e => setInterval(Number(e.target.value))}
							className="w-16 flex-shrink-0 px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
						<select
							value={frequency}
							onChange={e => setFrequency(e.target.value as MeetingFrequency)}
							className="flex-1 min-w-0 px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						>
							{Object.values(MeetingFrequency).map(f => (
								<option key={f} value={f}>{meetingFrequencyReadable[f]}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
							End Date (optional)
						</label>
						<input
							type="datetime-local"
							value={endDate}
							onChange={e => setEndDate(e.target.value)}
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
				</>
			)}

			<div>
				<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
					Duration (minutes)
				</label>
				<input
					type="number"
					value={duration}
					onChange={e => setDuration(Number(e.target.value))}
					className="w-full px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
				/>
			</div>
			{!isEditing && (
				<>
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
							Video Call Link
						</label>
						<input
							type="url"
							value={videoCallLink}
							placeholder="https://meet.link.com/..."
							onChange={e => setVideoCallLink(e.target.value)}
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
							Physical Address
						</label>
						<input
							type="text"
							value={physicalAddress}
							placeholder="123 Main St, City, State"
							onChange={e => setPhysicalAddress(e.target.value)}
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-white text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
				</>
			)}
			{formError && <p className="text-sm text-red-600">{formError}</p>}
			<div className="flex gap-3">
				<button
					type="submit"
					disabled={saving}
					className="px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-deep transition-colors disabled:opacity-50"
				>
					{saving ? 'Saving…' : isEditing ? 'Save' : 'Schedule'}
				</button>
				<button
					type="button"
					onClick={() => { setFormError(null); onCancel() }}
					className="px-4 py-2 text-sm text-terracotta hover:text-terracotta-dark border rounded border-terracotta transition-colors"
				>
					Cancel
				</button>
			</div>
		</form>
	)
}

