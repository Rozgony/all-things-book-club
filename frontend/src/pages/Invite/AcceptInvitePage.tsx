import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Nav } from '../../components/Nav'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import {
	deriveUserKey,
	deriveX25519KeyPair,
	getX25519PublicKey,
	unwrapChapterKeyWithSecret,
	wrapChapterKeyForRecipient,
	importChapterKey,
	fromBase64,
} from '../../lib/crypto'
import { setUserKey, setPrivateKey, getPrivateKey, hasPrivateKey } from '../../lib/keyStore'
import { setMyPublicKey } from '../../api/users'
import { getInvite, acceptInvite, type InviteInfo } from '../../api/invites'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Handles both new-user and already-logged-in acceptance of a chapter invite.
// token comes from ?token=, the one-time invite secret comes from the URL
// hash fragment (#...) — fragments are never sent to the server, so the
// secret never touches our backend in transit.
export function AcceptInvitePage() {
	const [searchParams] = useSearchParams()
	const token = searchParams.get('token') ?? ''
	const navigate = useNavigate()

	const [invite, setInvite] = useState<InviteInfo | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState<string | null>(null)
	// 'keys-in-memory' skips the redundant password prompt when this tab's
	// session already derived keys (e.g. clicked the link while browsing the app).
	const [authState, setAuthState] = useState<'loading' | 'keys-in-memory' | 'needs-password' | 'needs-signup'>('loading')
	const [isAuthenticated, setIsAuthenticated] = useState(false)

	useEffect(() => {
		getInvite(token)
			.then(setInvite)
			.catch(() => setLoadError('This invite is invalid or has expired.'))

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session) setAuthState('needs-signup')
			else {
				setAuthState(hasPrivateKey() ? 'keys-in-memory' : 'needs-password')
				setIsAuthenticated(true)
			}
		})
	}, [token])

	// Unwraps the invite's secret-wrapped key and re-wraps it via ECDH for
	// the given public key, then submits acceptance.
	const acceptWithKeys = async (chapterKeyRaw: Uint8Array, publicKey: Uint8Array) => {
		const chapterKey = await importChapterKey(chapterKeyRaw)
		const { encryptedChapterKey, keyNonce, ephemeralPublicKey } = await wrapChapterKeyForRecipient(chapterKey, publicKey)
		const { chapterId } = await acceptInvite(token, { encryptedChapterKey, keyNonce, ephemeralPublicKey })
		navigate(`/chapters/${chapterId}`)
	}

	const unwrapInviteSecret = () => {
		const inviteSecret = fromBase64(decodeURIComponent(window.location.hash.slice(1)))
		return unwrapChapterKeyWithSecret(invite!.encryptedChapterKey, invite!.keyNonce, inviteSecret)
	}

	// Path 1: already logged in and this tab's session already derived keys — no password needed.
	const handleAcceptWithMemoryKeys = async () => {
		setSubmitError(null)
		setSubmitting(true)
		try {
			const privateKey = getPrivateKey()
			const publicKey = getX25519PublicKey(privateKey)
			const rawChapterKey = await unwrapInviteSecret()
			await acceptWithKeys(rawChapterKey, publicKey)
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Failed to accept invite')
			setSubmitting(false)
		}
	}

	// Path 2: logged in but keys aren't in memory in this tab — re-derive from password.
	const handleAcceptWithPassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setSubmitError(null)
		setSubmitting(true)
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) throw new Error('Not authenticated')

			const saltRes = await fetch(`${API_BASE}/users/me/salt`, {
				headers: { Authorization: `Bearer ${session.access_token}` },
			})
			if (!saltRes.ok) throw new Error('Failed to initialize encryption')
			const { salt } = await saltRes.json()

			const userKey = await deriveUserKey(password, salt)
			await setUserKey(userKey)
			const { privateKey, publicKey } = deriveX25519KeyPair(password, salt)
			setPrivateKey(privateKey)

			const rawChapterKey = await unwrapInviteSecret()
			await acceptWithKeys(rawChapterKey, publicKey)
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Failed to accept invite')
			setSubmitting(false)
		}
	}

	// Path 3: no account yet — sign up, then derive keys and accept.
	const handleSignUpAndAccept = async (e: React.FormEvent) => {
		e.preventDefault()
		setSubmitError(null)
		setSubmitting(true)
		try {
			const { data, error } = await supabase.auth.signUp({ email, password })
			if (error) throw error
			const accessToken = data.session?.access_token
			if (!accessToken) throw new Error('Sign up succeeded but no session was returned.')

			const saltRes = await fetch(`${API_BASE}/users/me/salt`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
			if (!saltRes.ok) throw new Error('Failed to initialize encryption')
			const { salt } = await saltRes.json()

			const userKey = await deriveUserKey(password, salt)
			await setUserKey(userKey)
			const { privateKey, publicKey } = deriveX25519KeyPair(password, salt)
			setPrivateKey(privateKey)
			const publicKeyBase64 = btoa(String.fromCharCode(...publicKey))
			await setMyPublicKey(publicKeyBase64)

			const rawChapterKey = await unwrapInviteSecret()
			await acceptWithKeys(rawChapterKey, publicKey)
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Failed to accept invite')
			setSubmitting(false)
		}
	}

	if (loadError) {
		return (
			<>
				<Nav />
				<div className="flex items-center justify-center min-h-screen bg-cream">
					<p className="text-red-600">{loadError}</p>
				</div>
			</>
		)
	}

	if (!invite || authState === 'loading') {
		return (
			<>
				<Nav />
				<div className="flex items-center justify-center min-h-screen bg-cream">
					<LoadingSpinner />
				</div>
			</>
		)
	}

	return (
		<>
			<Nav showProfile={isAuthenticated} showChapters={isAuthenticated} showLogout={isAuthenticated} />
			<div className="flex items-center justify-center min-h-screen bg-cream">
				<div className="w-full max-w-sm px-8 py-10 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
					<div className="text-stone-muted text-sm mb-4">
						{invite.inviterEmail} has invited you to an All Things Book Club chapter.
					</div>

					{authState === 'keys-in-memory' && (
						<div className="space-y-5">
							{submitError && <p className="text-sm text-red-600">{submitError}</p>}
							<button
								onClick={handleAcceptWithMemoryKeys}
								disabled={submitting}
								className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
							>
								{submitting ? 'Joining…' : 'Accept invite'}
							</button>
						</div>
					)}

					{authState === 'needs-password' && (
						<form onSubmit={handleAcceptWithPassword} className="space-y-5">
							<div>
								<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">
									Confirm your password to accept
								</label>
								<input
									type="password"
									value={password}
									onChange={e => setPassword(e.target.value)}
									required
									className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
								/>
							</div>
							{submitError && <p className="text-sm text-red-600">{submitError}</p>}
							<button
								type="submit"
								disabled={submitting}
								className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
							>
								{submitting ? 'Joining…' : 'Accept invite'}
							</button>
						</form>
					)}

					{authState === 'needs-signup' && (
						<form onSubmit={handleSignUpAndAccept} className="space-y-5">
							<div>
								<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Email</label>
								<input
									type="email"
									value={email}
									onChange={e => setEmail(e.target.value)}
									required
									className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-stone-muted uppercase tracking-wider mb-1.5">Password</label>
								<input
									type="password"
									value={password}
									onChange={e => setPassword(e.target.value)}
									required
									minLength={8}
									className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
								/>
							</div>
							{submitError && <p className="text-sm text-red-600">{submitError}</p>}
							<button
								type="submit"
								disabled={submitting}
								className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
							>
								{submitting ? 'Joining…' : 'Create account & accept'}
							</button>
						</form>
					)}
				</div>
			</div>
		</>
	)
}
