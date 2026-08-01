import { useState } from 'react'
import { getChapterKey } from '../../lib/keyStore'
import { wrapChapterKeyForRecipient, wrapChapterKeyWithSecret, fromBase64 } from '../../lib/crypto'
import { lookupUserByEmail, inviteExistingUser, createInvite } from '../../api/invites'

interface InviteMemberFormProps {
	chapterId: string
}

// Admin-only widget: looks up the invited email first to decide between the
// direct-ECDH path (existing user) and the one-time-secret email path (new
// user) — see documentation/Invite-Plan.md Phase 5.
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
			const existingUser = await lookupUserByEmail(email)

			if (existingUser && existingUser.publicKey) {
				// Existing user — wrap directly for their public key, no email round-trip needed.
				const recipientPublicKey = fromBase64(existingUser.publicKey)
				const { encryptedChapterKey, keyNonce, ephemeralPublicKey } = await wrapChapterKeyForRecipient(chapterKey, recipientPublicKey)
				await inviteExistingUser({ chapterId, userId: existingUser.id, encryptedChapterKey, keyNonce, ephemeralPublicKey })
				setMessage(`${email} has been added to the chapter.`)
			} else {
				// New user — wrap with a one-time secret that travels in the emailed link's hash fragment.
				const inviteSecret = crypto.getRandomValues(new Uint8Array(32))
				const { encryptedChapterKey, keyNonce } = await wrapChapterKeyWithSecret(chapterKey, inviteSecret)
				const inviteSecretBase64url = btoa(String.fromCharCode(...inviteSecret))
					.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
				await createInvite({ chapterId, invitedEmail: email, encryptedChapterKey, keyNonce, inviteSecretBase64url })
				setMessage(`An invite has been emailed to ${email}.`)
			}
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
