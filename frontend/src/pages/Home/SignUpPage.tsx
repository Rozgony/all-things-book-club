import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Nav } from '../../components/Nav'
import { deriveUserKey, deriveX25519KeyPair } from '../../lib/crypto'
import { setUserKey, setPrivateKey } from '../../lib/keyStore'
import { setMyPublicKey } from '../../api/users'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// For organic sign-ups (new chapter founders, no invite). Invited users go
// through AcceptInvitePage instead, which does the same key setup inline.
export function SignUpPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleSubmit = async (e: React.FormEvent) => {
	  e.preventDefault()
	  setError(null)
	  setLoading(true)

	  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
	  if (authError) {
	    setError(authError.message)
	    setLoading(false)
	    return
	  }
	  // enable_confirmations = false in supabase/config.toml means this session
	  // is active immediately — no separate email confirmation step needed.
	  const accessToken = authData.session?.access_token
	  if (!accessToken) {
	    setError('Sign up succeeded but no session was returned. Please try logging in.')
	    setLoading(false)
	    return
	  }

	  const saltRes = await fetch(`${API_BASE}/users/me/salt`, {
	    headers: { Authorization: `Bearer ${accessToken}` }
	  })
	  if (!saltRes.ok) {
	    setError('Failed to initialize encryption. Please try again.')
	    setLoading(false)
	    return
	  }
	  const { salt } = await saltRes.json()

	  const key = await deriveUserKey(password, salt)
	  await setUserKey(key)

	  const { privateKey, publicKey } = deriveX25519KeyPair(password, salt)
	  setPrivateKey(privateKey)
	  const publicKeyBase64 = btoa(String.fromCharCode(...publicKey))
	  await setMyPublicKey(publicKeyBase64)

	  setLoading(false)
	  navigate('/profile')
	}

	return (
	  <>
	  <Nav />
	  <div className="flex items-center justify-center min-h-screen bg-cream">
	    <div className="w-full max-w-sm px-8 py-10 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
	      <div className="text-stone-muted text-sm mb-4">Create your account</div>
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
	            minLength={8}
	            className="w-full px-3 py-2.5 border border-warm-border rounded bg-cream/40 text-stone focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
	          />
	        </div>
	        {error && <p className="text-sm text-red-600">{error}</p>}
	        <button
	          type="submit"
	          disabled={loading}
	          className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
	        >
	          {loading ? 'Creating account…' : 'Sign up'}
	        </button>
	        <p className="text-sm text-stone-muted text-center">
	          Already have an account? <Link to="/login" className="text-terracotta hover:underline">Sign in</Link>
	        </p>
	      </form>
	    </div>
	  </div>
	  </>
	)
}
