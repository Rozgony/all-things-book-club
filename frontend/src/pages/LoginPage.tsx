import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Nav } from '../components/Nav'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      navigate('/profile')
    }

    setLoading(false)
  }

  return (
    <>
    <Nav />
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <div className="w-full max-w-sm px-8 py-10 bg-white rounded border border-warm-border" style={{ boxShadow: 'var(--shadow)' }}>
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
            className="w-full py-2.5 px-4 bg-terracotta text-white font-sans tracking-wide rounded hover:bg-terracotta-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
    </>
  )
}
