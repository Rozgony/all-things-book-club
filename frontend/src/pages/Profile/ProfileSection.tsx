import { type UserProfile } from '../../api/types'

interface ProfileSectionProps {
	profile: UserProfile
	email: string
	pendingEmail?: string | null
	editing: boolean
	name: string
	timezone: string
	emailValue: string
	passwordValue: string
	confirmPasswordValue: string
	error: string | null
	saving: boolean
	onEditClick: () => void
	onNameChange: (value: string) => void
	onTimezoneChange: (value: string) => void
	onEmailChange: (value: string) => void
	onPasswordChange: (value: string) => void
	onConfirmPasswordChange: (value: string) => void
	onSave: (e: React.FormEvent) => void
	onCancel: () => void
}

export function ProfileSection({
	profile,
	email,
	pendingEmail,
	editing,
	name,
	timezone,
	emailValue,
	passwordValue,
	confirmPasswordValue,
	error,
	saving,
	onEditClick,
	onNameChange,
	onTimezoneChange,
	onEmailChange,
	onPasswordChange,
	onConfirmPasswordChange,
	onSave,
	onCancel,
}: ProfileSectionProps) {
	return (
		<div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
			<h2 className="font-heading text-forest-deep mb-7">Your Profile</h2>
			{!editing ? (
				<div className="grid grid-cols-2 gap-x-8 gap-y-5">
					<div>
						<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Name</p>
						<p className="text-stone">{profile.name ?? <span className="text-stone-muted italic">Not set</span>}</p>
					</div>
					<div>
						<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Email</p>
						<p className="text-stone">{email}</p>
						{pendingEmail && (
							<p className="text-xs text-terracotta mt-0.5">
								Pending: {pendingEmail} — check both inboxes to confirm
							</p>
						)}
					</div>
					<div>
						<p className="text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1">Timezone</p>
						<p className="text-stone">{profile.timezone}</p>
					</div>
					<div className="col-span-2 pt-2">
						<button
							onClick={onEditClick}
							className="py-2 px-5 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-dark transition-colors"
						>
							Edit profile
						</button>
					</div>
				</div>
			) : (
				<form onSubmit={onSave} className="grid grid-cols-2 gap-x-8 gap-y-4">
					<div className="col-span-2 text-xs font-semibold text-stone-muted uppercase tracking-wider">Profile</div>
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
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Email</label>
						<input
							type="email"
							value={emailValue}
							onChange={e => onEmailChange(e.target.value)}
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
						{pendingEmail && (
							<p className="text-xs text-terracotta mt-1">Pending change to {pendingEmail} — check both inboxes to confirm</p>
						)}
					</div>
					<div className="col-span-2">
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Timezone</label>
						<input
							type="text"
							list="timezone-list"
							value={timezone}
							onChange={e => onTimezoneChange(e.target.value)}
							placeholder="e.g. America/Los_Angeles"
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
						<datalist id="timezone-list">
							{Intl.supportedValuesOf('timeZone').map(tz => (
								<option key={tz} value={tz} />
							))}
						</datalist>
					</div>
					<div className="col-span-2 border-t border-warm-border pt-4 text-xs font-semibold text-stone-muted uppercase tracking-wider">Security</div>
					<div>
						<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">New Password</label>
						<input
							type="password"
							value={passwordValue}
							placeholder="Leave blank to keep current"
							autoComplete="new-password"
							onChange={e => onPasswordChange(e.target.value)}
							className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
						/>
					</div>
					{passwordValue && (
						<div>
							<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Confirm Password</label>
							<input
								type="password"
								value={confirmPasswordValue}
								placeholder="Repeat new password"
								autoComplete="new-password"
								onChange={e => onConfirmPasswordChange(e.target.value)}
								className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
							/>
							{confirmPasswordValue && passwordValue !== confirmPasswordValue && (
								<p className="text-xs text-red-500 mt-1">Passwords don't match</p>
							)}
						</div>
					)}
					{error && <div className="col-span-2 text-sm text-red-600">{error}</div>}
					<div className="col-span-2 flex gap-3">
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
							className="py-2 px-4 text-terracotta text-sm border rounded hover:text-terracotta-dark transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			)}
		</div>
	)
}
