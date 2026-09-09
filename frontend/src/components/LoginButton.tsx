import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { deriveAndStoreUserKey } from '../lib/authKey'
import { EmailPasswordForm } from './EmailPasswordForm'

export type LoginButtonProps = {
	variant?: 'nav' | 'prominent'
}

export function LoginButton({ variant = 'nav' }: LoginButtonProps) {
	const [showLogin, setShowLogin] = useState(false)
	const [mode, setMode] = useState<'login' | 'signup'>('login')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)

		// Step 1: Authenticate with Supabase
		const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

		if (authError) {
			setError(authError.message)
			setLoading(false)
			return
		}

		try {
			await deriveAndStoreUserKey(authData.session!.access_token, password)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to initialize encryption. Please try again.')
			setLoading(false)
			return
		}

		setLoading(false)
		navigate('/profile')
	}

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)

		const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

		if (authError) {
			setError(authError.message)
			setLoading(false)
			return
		}

		const accessToken = authData.session?.access_token
		if (!accessToken) {
			setError('Sign up succeeded but no session was returned. Please try logging in.')
			setLoading(false)
			return
		}

		try {
			await deriveAndStoreUserKey(accessToken, password)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to initialize encryption. Please try again.')
			setLoading(false)
			return
		}

		setLoading(false)
		navigate('/profile')
	}

	const switchMode = (nextMode: 'login' | 'signup') => {
		setError(null)
		setMode(nextMode)
	}

	const closeModal = () => {
		setShowLogin(false)
		setMode('login')
		setError(null)
	}

	const buttonClasses = variant === 'prominent' 
		? 'px-8 py-3 bg-terracotta text-white font-bold text-lg rounded hover:bg-terracotta-dark transition-colors'
		: 'hidden sm:block text-white text-sm rounded bg-terracotta font-bold p-2 hover:opacity-90 transition-colors'

	return (
		<>
			<button onClick={() => setShowLogin(true)} className={buttonClasses}>
				Login / Sign-up
			</button>

			{showLogin && (
				<>
					<div className="fixed inset-0 bg-black/50 z-[60]" onClick={closeModal} />
					<div className="fixed inset-0 flex items-center justify-center z-[70]">
						<div className="w-full max-w-sm px-8 py-10 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
							<div className="flex justify-between items-center mb-4">
								<div className="text-stone-muted text-sm">
									{mode === 'login' ? 'Sign in to your account' : 'Create your account'}
								</div>
								<button
									onClick={closeModal}
									className="text-stone-muted hover:text-stone text-lg font-semibold"
								>
									X
								</button>
							</div>
							{mode === 'login' ? (
								<EmailPasswordForm
									onSubmit={handleLogin}
									email={email}
									onEmailChange={setEmail}
									password={password}
									onPasswordChange={setPassword}
									error={error}
									submitting={loading}
									submitLabel="Sign in"
									submittingLabel="Signing in…"
									footer={
										<p className="text-sm text-stone-muted text-center">
											No account yet?{' '}
											<button type="button" onClick={() => switchMode('signup')} className="text-terracotta hover:underline">
												Sign up
											</button>
										</p>
									}
								/>
							) : (
								<EmailPasswordForm
									onSubmit={handleSignUp}
									email={email}
									onEmailChange={setEmail}
									password={password}
									onPasswordChange={setPassword}
									passwordMinLength={8}
									error={error}
									submitting={loading}
									submitLabel="Sign up"
									submittingLabel="Creating account…"
									footer={
										<p className="text-sm text-stone-muted text-center">
											Already have an account?{' '}
											<button type="button" onClick={() => switchMode('login')} className="text-terracotta hover:underline">
												Sign in
											</button>
										</p>
									}
								/>
							)}
						</div>
					</div>
				</>
			)}
		</>
	)
}
