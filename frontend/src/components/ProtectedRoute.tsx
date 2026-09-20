import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { hasUserKey, restoreUserKey } from '../lib/keyStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	// const session = useAuthStore((s) => s.session)
	const loading = useAuthStore((s) => s.loading)
	const checkSession = useAuthStore((s) => s.checkSession)
	const [keyReady, setKeyReady] = useState(hasUserKey())
	const [isAuthenticated, setIsAuthenticated] = useState(false)

	useEffect(() => {
		checkSession()
			.then(session => {
				setIsAuthenticated(!!session)
			})
	}, [checkSession])

	useEffect(() => {
		if (!keyReady) {
			restoreUserKey().then((restored) => setKeyReady(restored))
		}
	}, [])

	if (loading) {
	  return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>
	}
console.log('inline isAuthenticated: '+isAuthenticated);
	if (!isAuthenticated) {
	  return <Navigate to="/login" replace />
	}
console.log('inline keyReady: '+keyReady);
	if (!keyReady) {
	  return <Navigate to="/login" replace />
	}

	return <>{children}</>
}
