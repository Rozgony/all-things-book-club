import type { ReactNode } from 'react'

export type EmailPasswordFormProps = {
	onSubmit: (e: React.FormEvent) => void
	showEmail?: boolean
	email?: string
	onEmailChange?: (value: string) => void
	password: string
	onPasswordChange: (value: string) => void
	passwordLabel?: string
	passwordMinLength?: number
	error?: string | null
	submitting?: boolean
	submitLabel: string
	submittingLabel?: string
	footer?: ReactNode
}

// Dumb, presentational email+password form — shared markup/styling only.
// Callers own all state and submit behavior.
export function EmailPasswordForm({
	onSubmit,
	showEmail = true,
	email,
	onEmailChange,
	password,
	onPasswordChange,
	passwordLabel = 'Password',
	passwordMinLength,
	error,
	submitting,
	submitLabel,
	submittingLabel,
	footer
}: EmailPasswordFormProps) {
	return (
		<form onSubmit={onSubmit} className="space-y-5">
			{showEmail && (
				<div>
					<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Email</label>
					<input
						type="email"
						value={email}
						onChange={e => onEmailChange?.(e.target.value)}
						required
						className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
					/>
				</div>
			)}
			<div>
				<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">{passwordLabel}</label>
				<input
					type="password"
					value={password}
					onChange={e => onPasswordChange(e.target.value)}
					required
					minLength={passwordMinLength}
					className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
				/>
			</div>
			{error && <p className="text-sm text-red-600">{error}</p>}
			<button
				type="submit"
				disabled={submitting}
				className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
			>
				{submitting ? (submittingLabel ?? submitLabel) : submitLabel}
			</button>
			{footer}
		</form>
	)
}
