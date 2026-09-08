import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Nav } from '../../components/Nav'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import {
	deriveUserKey,
	unwrapChapterKeyWithSecret,
	importChapterKey,
	fromBase64Url,
	encryptChapterKey
} from '../../lib/crypto'
import { setUserKey, getUserKey } from '../../lib/keyStore'
import { getInvite, acceptInvite, type InviteInfo } from '../../api/invites'
import { initializeMemberJoinedAt } from '../../api/members'

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
	const [authState, setAuthState] = useState<'loading' | 'needs-password' | 'needs-signup' | 'needs-login'>('loading')
	const [isAuthenticated, setIsAuthenticated] = useState(false)

	useEffect(() => {
		getInvite(token)
			.then(setInvite)
			.catch(() => setLoadError('This invite is invalid or has expired.'))

		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session) setAuthState('needs-signup')
			else {
				setAuthState('needs-password')
				setIsAuthenticated(true)
			}
		})
	}, [token])

	// Unwraps the invite's secret-wrapped key and re-wraps it with the userKey,
	// then submits acceptance.
	const acceptWithKeys = async (chapterKeyRaw: Uint8Array) => {
		const chapterKey = await importChapterKey(chapterKeyRaw)
		const { encryptedChapterKey, keyNonce } = await encryptChapterKey(chapterKey, getUserKey())
		const { chapterId: cid, id: memberId } = await acceptInvite(token, { encryptedChapterKey, keyNonce })
		// joinedAt is recorded here, right after acceptance, as a follow-up call to
		// the existing member-blob endpoint — the invite itself carries no timestamp.
		await initializeMemberJoinedAt(memberId, chapterKey, new Date().toISOString())
		navigate(`/chapters/${cid}?setName=true`)
	}

	const unwrapInviteSecret = () => {
		const inviteSecret = fromBase64Url(decodeURIComponent(window.location.hash.slice(1)))
		return unwrapChapterKeyWithSecret(invite!.encryptedChapterKey, invite!.keyNonce, inviteSecret)
	}




	// Path 1: logged in but keys aren't in memory in this tab — re-derive from password.
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

			const rawChapterKey = await unwrapInviteSecret()
			await acceptWithKeys(rawChapterKey)
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Failed to accept invite')
			setSubmitting(false)
		}
	}

	// Path 2: no account yet — sign up, then derive keys and accept.
	const handleSignUpAndAccept = async (e: React.FormEvent) => {
		e.preventDefault()
		setSubmitError(null)
		setSubmitting(true)
		try {
			console.log('password: '+password);
			const { data, error } = await supabase.auth.signUp({ email, password })
			if (error) throw error
			const accessToken = data.session?.access_token
			console.log('accessToken: '+accessToken);
			if (!accessToken) throw new Error('Sign up succeeded but no session was returned.')

			const saltRes = await fetch(`${API_BASE}/users/me/salt`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
			console.log('saltRes: ',saltRes);

			if (!saltRes.ok) throw new Error('Failed to initialize encryption')
			const { salt } = await saltRes.json()

			const userKey = await deriveUserKey(password, salt)
			await setUserKey(userKey)
			console.log('userKey: ',userKey);

			const rawChapterKey = await unwrapInviteSecret()
			await acceptWithKeys(rawChapterKey)
			console.log('rawChapterKey: ',rawChapterKey);

		} catch (err) {
			console.log('err: ',err);

			setSubmitError(err instanceof Error ? err.message : 'Failed to accept invite')
			setSubmitting(false)
		}
	}

	// Path 3: has an account but isn't signed in — log in, then derive keys and accept.
	const handleLoginAndAccept = async (e: React.FormEvent) => {
		e.preventDefault()
		setSubmitError(null)
		setSubmitting(true)
		try {
			console.log('password: '+password);
			const { data, error } = await supabase.auth.signInWithPassword({ email, password })
			console.log('handleLoginAndAccept: ',{data, error});

			if (error) throw error
			const accessToken = data.session?.access_token
			if (!accessToken) throw new Error('Login succeeded but no session was returned.')

			const saltRes = await fetch(`${API_BASE}/users/me/salt`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
			console.log('saltRes: ',saltRes);

			if (!saltRes.ok) throw new Error('Failed to initialize encryption')
			const { salt } = await saltRes.json()
console.log('salt: ',salt);

			const userKey = await deriveUserKey(password, salt)
			await setUserKey(userKey)
console.log('userKey: ',userKey);

			const rawChapterKey = await unwrapInviteSecret()
			await acceptWithKeys(rawChapterKey)
			console.log('rawChapterKey: ',rawChapterKey);

		} catch (err) {
			console.log('err: ',err);
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
					<h3 className="font-heading text-forest-deep mb-2">Welcome!!!</h3>
					<div className="text-stone-muted text-sm mb-4">
						{invite.inviterName} has invited you to an All Things Book Club chapter.
					</div>
					<div className="text-stone-muted text-sm mb-4">
						Log in with your existing user or create an account to accept the invite.
					</div>

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
							<p className="text-sm text-stone-muted text-center">
								Already have an account?{' '}
								<button
									type="button"
									onClick={() => { setSubmitError(null); setAuthState('needs-login') }}
									className="text-terracotta hover:underline"
								>
									Log in
								</button>
							</p>
						</form>
					)}

					{authState === 'needs-login' && (
						<form onSubmit={handleLoginAndAccept} className="space-y-5">
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
									className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
								/>
							</div>
							{submitError && <p className="text-sm text-red-600">{submitError}</p>}
							<button
								type="submit"
								disabled={submitting}
								className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
							>
								{submitting ? 'Joining…' : 'Log in & accept'}
							</button>
							<p className="text-sm text-stone-muted text-center">
								Don't have an account?{' '}
								<button
									type="button"
									onClick={() => { setSubmitError(null); setAuthState('needs-signup') }}
									className="text-terracotta hover:underline"
								>
									Sign up
								</button>
							</p>
						</form>
					)}
				</div>
			</div>
		</>
	)
}
