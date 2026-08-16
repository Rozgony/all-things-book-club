import { useState } from 'react'
import { getChapterKey } from '../../lib/keyStore'
import { wrapChapterKeyWithSecret } from '../../lib/crypto'
import { createInvite } from '../../api/invites'

interface InviteMemberFormProps {
	chapterId: string
}

export function InviteMemberForm({ chapterId }: InviteMemberFormProps) {
	const [email, setEmail] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setSubmitting(true)
		setMessage(null)
		setError(null)

		try {
			const chapterKey = getChapterKey(chapterId)
			const inviteSecret = crypto.getRandomValues(new Uint8Array(32))
			const { encryptedChapterKey, keyNonce } = await wrapChapterKeyWithSecret(chapterKey, inviteSecret)
			const inviteSecretBase64url = btoa(String.fromCharCode(...inviteSecret))
				.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
			await createInvite({ chapterId, invitedEmail: email, encryptedChapterKey, keyNonce, inviteSecretBase64url })
			setMessage(`An invite has been emailed to ${email}.`)
			setEmail('')
		} catch {
			setError('Failed to send invite. Please try again.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="bg-white rounded border border-warm-border p-6 mb-7 space-y-3" style={{ boxShadow: 'var(--shadow)' }}>
			<h3 className="font-heading text-forest-deep text-sm">Invite a member</h3>
			<div className="flex gap-2">
				<input
					type="email"
					value={email}
					onChange={e => setEmail(e.target.value)}
					placeholder="member@example.com"
					required
					className="flex-1 px-3 py-2 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
				/>
				<button
					type="submit"
					disabled={submitting}
					className="px-4 py-2 bg-terracotta text-white text-sm tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
				>
					{submitting ? 'Sending…' : 'Invite'}
				</button>
			</div>
			{message && <p className="text-sm text-forest">{message}</p>}
			{error && <p className="text-sm text-red-600">{error}</p>}
		</form>
	)
}
