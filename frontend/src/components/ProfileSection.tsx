import { type UserProfile } from '../api/types'

interface ProfileSectionProps {
	profile: UserProfile
	editing: boolean
	name: string
	timezone: string
	error: string | null
	saving: boolean
	onEditClick: () => void
	onNameChange: (value: string) => void
	onTimezoneChange: (value: string) => void
	onSave: (e: React.FormEvent) => void
	onCancel: () => void
}

export function ProfileSection({
	profile,
	editing,
	name,
	timezone,
	error,
	saving,
	onEditClick,
	onNameChange,
	onTimezoneChange,
	onSave,
	onCancel,
}: ProfileSectionProps) {
	return (
		<div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
			<h2 className="font-heading text-forest-deep mb-7">Your Profile</h2>

			{error && <p className="mb-4 text-sm text-red-600">{error}</p>}

			{!editing ? (
				<div className="space-y-5">
					<div>
						<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Email</p>
						<p className="text-stone">{profile.email}</p>
					</div>
					<div>
						<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Name</p>
						<p className="text-stone">{profile.name ?? <span className="text-stone-muted italic">Not set</span>}</p>
					</div>
					<div>
						<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Timezone</p>
						<p className="text-stone">{profile.timezone}</p>
					</div>
					<button
						onClick={onEditClick}
						className="mt-2 py-2 px-5 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-dark transition-colors"
					>
						Edit profile
					</button>
				</div>
			) : (
				<form onSubmit={onSave} className="space-y-4">
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Name</label>
						<input
							type="text"
							value={name}
							onChange={e => onNameChange(e.target.value)}
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Timezone</label>
						<input
							type="text"
							value={timezone}
							onChange={e => onTimezoneChange(e.target.value)}
							placeholder="e.g. America/Los_Angeles"
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
					<div className="flex gap-3">
						<button
							type="submit"
							disabled={saving}
							className="py-2 px-5 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-dark transition-colors disabled:opacity-50"
						>
							{saving ? 'Saving…' : 'Save'}
						</button>
						<button
							type="button"
							onClick={onCancel}
							className="py-2 px-4 bg-terracotta text-white text-sm border border-warm-border rounded hover:bg-terracotta-dark transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			)}
		</div>
	)
}
