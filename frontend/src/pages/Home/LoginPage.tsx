import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Nav } from '../../components/Nav'
import { deriveUserKey } from '../../lib/crypto'
import { setUserKey } from '../../lib/keyStore'
import { LoginSpinDemo } from './SpinDemo'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export function LoginPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [showLoginForm, setShowLoginForm] = useState(false)
	const navigate = useNavigate()

	const handleSubmit = async (e: React.FormEvent) => {
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

	  // Step 2: Fetch (or create) the user's key derivation salt from our backend
	  const saltRes = await fetch(`${API_BASE}/users/me/salt`, {
	    headers: { Authorization: `Bearer ${authData.session?.access_token}` }
	  })

	  if (!saltRes.ok) {
	    setError('Failed to initialize encryption. Please try again.')
	    setLoading(false)
	    return
	  }

	  const { salt } = await saltRes.json()

	  // Step 3: Derive the user's encryption key from their password + salt
	  // This is deterministic — same password + salt = same key on any device
	  const key = await deriveUserKey(password, salt)
	  await setUserKey(key)

	  setLoading(false)
	  navigate('/profile')
	}

	return (
	  <>
	  <Nav showLogin onLoginClick={() => setShowLoginForm(true)} />
		<div className="max-w-2xl mx-auto px-4 py-4">
			<h1>Welcome to All Things Book Club</h1>
			<h4>A place to share what facinates you, hear new ideas, and make new friends.</h4>
		</div>
		<div className="flex flex-col items-center bg-cream px-6 py-12">
			<LoginSpinDemo />
		</div>
		<div className="max-w-2xl mx-auto">
			<div className="bg-white rounded border border-warm-border text-forest-deep p-6 my-8 text-left">
				<h3>How does it work?</h3>
				<p className="py-2">
					We all have things that facinate us and want to tell someone about.  
					It could be a book, a movie, a podcast, a conversation, or even a meme.
					All Things Book Club is a chance to share about those topics with everyone's wrapped attention. 
				</p>
				<ol className="py-2">  The process is simple:
					<li className="pl-4">1. Each member adds their topic of interest to the wheel.</li>
					<li className="pl-4">2. Someone spins the wheel and it randomly selects a topic.</li>
					<li className="pl-4">3. The person who selected the topic gets a couple minutes to share what facinates them about it.</li>
					<li className="pl-4">4. Then the discussion opens to the group for a couple more minutes.</li>
					<li className="pl-4">5. Once conversation on the topic has slowed, spin again to repeat with a new topic.</li>
				</ol>
				<p className="py-2">Everyone gets to share and everyone is listened to.</p>
				<p className="py-2">Each meeting and its topics are stored in our end-to-end encrypted database so you can revisit any interesting topics anytime you want.</p>
				<p className="py-2">Join today!</p>
			</div>
			<div className="bg-white rounded border border-warm-border text-forest-deep p-6 my-8 text-left">
				<h3 className="text-white">Want to dig deeper?</h3>
				<p className="py-2">Have a community of collaborators, researchers, or creators that you want to develop a deeper <a className="text-terracotta hover:text-terracotta-dark underline break-all" href="https://en.wiktionary.org/wiki/scenius">scenious</a> with?</p>
				<p className="py-2">Create an All Things Book Club Chapter today and deepen your investigations and explorations together!</p>
			</div>
			<div className="bg-white rounded border border-warm-border text-forest-deep p-6 my-8 text-left">
				<h3 className="text-white">What about privacy?</h3>
				<p className="py-2">Your ideas are yours. We don't want to know. That's why all collected with your Book Club Chapter is end-to-end encrypted so that it is server-blind.  Meaning we couldn't look at it even if we tried.</p>
			</div>
		</div>
		{showLoginForm && (
			<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
				<div className="relative w-full max-w-sm px-8 py-10 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
						<button
							type="button"
							onClick={() => setShowLoginForm(false)}
							aria-label="Close"
							className="absolute top-3 right-3 text-stone-muted hover:text-stone transition-colors">
							X
						</button>
					<div className="text-stone-muted text-sm mb-4">Sign in to your account</div>
					<form onSubmit={handleSubmit} className="space-y-5">
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
						{error && <p className="text-sm text-red-600">{error}</p>}
						<button
							type="submit"
							disabled={loading}
							className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50">
								{loading ? 'Signing in…' : 'Sign in'}
						</button>
					</form>
				</div>
			</div>
	  	)}
	  </>
	)
}
