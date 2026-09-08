import { useEffect, useState } from 'react'
import { getChapterKey } from '../lib/keyStore'
import { wrapChapterKeyWithSecret } from '../lib/crypto'
import { createInvite, createInviteAndEmail } from '../api/invites'
import { getMyProfile } from '../api/users'

interface InviteModalProps {
	chapterId: string
	onClose: () => void
}

type Tab = 'link' | 'email'

// Invites are link-only: whoever holds the link can join. Copying it here
// keeps the invite secret fully private; emailing it hands the secret to
// our email provider (Resend) as an explicit, disclosed trade-off.
export function InviteModal({ chapterId, onClose }: InviteModalProps) {
	const [tab, setTab] = useState<Tab>('link')
	const [inviterName, setInviterName] = useState('')
	const [inviteURL, setInviteURL] = useState('')
	const [copied, setCopied] = useState(false)
	const [email, setEmail] = useState('')
	const [creating, setCreating] = useState(false)
	const [sending, setSending] = useState(false)
	const [sent, setSent] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		getMyProfile()
			.then(p => setInviterName(p.name ?? ''))
			.catch(() => {})
	}, [])

	const buildInvite = async () => {
		const chapterKey = getChapterKey(chapterId)
		const inviteSecret = crypto.getRandomValues(new Uint8Array(32))
		const { encryptedChapterKey, keyNonce } = await wrapChapterKeyWithSecret(chapterKey, inviteSecret)
		const inviteSecretBase64url = btoa(String.fromCharCode(...inviteSecret))
			.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
		return { encryptedChapterKey, keyNonce, inviteSecretBase64url }
	}

	const handleCopyLink = async () => {
		setError(null)
		setCreating(true)
		try {
			const { encryptedChapterKey, keyNonce, inviteSecretBase64url } = await buildInvite()
			const { inviteURL } = await createInvite({ chapterId, encryptedChapterKey, keyNonce, inviteSecretBase64url, inviterName })
			setInviteURL(inviteURL)
			await navigator.clipboard.writeText(inviteURL)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.log({error})
			setError('Failed to create invite. Please try again.')
		} finally {
			setCreating(false)
		}
	}

	const handleSendEmail = async (e: React.FormEvent) => {
		e.preventDefault()
		setSending(true)
		setError(null)
		try {
			const { encryptedChapterKey, keyNonce, inviteSecretBase64url } = await buildInvite()
			await createInviteAndEmail({ chapterId, invitedEmail: email, encryptedChapterKey, keyNonce, inviteSecretBase64url, inviterName })
			setSent(true)
		} catch {
			setError('Failed to send invite. Please try again.')
		} finally {
			setSending(false)
		}
	}

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded border border-warm-border p-6 max-w-md w-full h-[440px]" style={{ boxShadow: 'var(--shadow)' }}>
				<h3 className="font-heading text-forest-deep mb-4">Invite a member</h3>
				<div className="flex border-b border-warm-border mb-4">
					<button
						onClick={() => setTab('link')}
						className={`flex-1 py-2 text-sm font-medium tracking-wide transition-colors ${
							tab === 'link'
								? 'text-forest border-b-2 border-forest -mb-px'
								: 'text-stone-muted hover:text-stone'
						}`}
					>
						Copy Link
					</button>
					<button
						onClick={() => setTab('email')}
						className={`flex-1 py-2 text-sm font-medium tracking-wide transition-colors ${
							tab === 'email'
								? 'text-forest border-b-2 border-forest -mb-px'
								: 'text-stone-muted hover:text-stone'
						}`}
					>
						Email Link
					</button>
				</div>

				{tab === 'link' && (
					<div className="space-y-3 min-h-[229px]">
						<div className="mb-4">
							<label className="block text-xs text-stone-muted mb-1">Your name (shown to the invitee)</label>
							<input
								type="text"
								value={inviterName}
								onChange={e => setInviterName(e.target.value)}
								placeholder="Your name"
								className="w-full px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
							/>
						</div>
						<button
							onClick={handleCopyLink}
							disabled={creating}
							className="w-full px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-deep transition-colors disabled:opacity-50"
						>
							{creating ? 'Creating…' : 'Copy Invite Link'}
						</button>
						{inviteURL && (
							<div>
								<div className="flex gap-2 mb-2">
									<input
										readOnly
										value={inviteURL}
										onFocus={e => e.target.select()}
										className="flex-1 px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone text-xs focus:outline-none"
									/>
									<button
										onClick={async () => {
											await navigator.clipboard.writeText(inviteURL)
											setCopied(true)
											setTimeout(() => setCopied(false), 2000)
										}}
										className="px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-deep transition-colors whitespace-nowrap"
									>
										{copied ? 'Copied!' : 'Copy'}
									</button>
								</div>
								<p className="text-xs text-stone-muted">Anyone with this link can join the chapter.</p>
							</div>
						)}
					</div>
				)}

				{tab === 'email' && (
					sent ? (
						<div className="space-y-3 min-h-[229px] flex align-center">
							<p className="text-sm text-forest">Invite emailed to {email}.</p>
						</div>
					) : (
						<form onSubmit={handleSendEmail} className="space-y-3 min-h-[229px]">
							<div className="mb-4">
								<label className="block text-xs text-stone-muted mb-1">Your name (shown to the invitee)</label>
								<input
									type="text"
									value={inviterName}
									onChange={e => setInviterName(e.target.value)}
									placeholder="Your name"
									className="w-full px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
								/>
							</div>
							<input
								type="email"
								value={email}
								onChange={e => setEmail(e.target.value)}
								placeholder="member@example.com"
								required
								className="w-full px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
							/>
							<button
								type="submit"
								disabled={sending}
								className="w-full px-4 py-2 bg-forest text-white text-sm tracking-wide rounded hover:bg-forest-deep transition-colors disabled:opacity-50"
							>
								{sending ? 'Sending…' : 'Send invite'}
							</button>
							<p className="text-xs text-stone-muted">
								Sending via email shares the invite key with our email provider (Resend). See our{' '}
								<a href="/privacy" className="text-terracotta hover:underline">privacy notes</a> for details.
							</p>
						</form>
					)
				)}

				{error && <p className="text-sm text-red-600 mt-2">{error}</p>}

				<div className="flex justify-end mt-5">
					<button onClick={onClose} className="px-4 py-2 text-sm text-stone-muted hover:text-stone transition-colors">
						Close
					</button>
				</div>
			</div>
		</div>
	)
}
