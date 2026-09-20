import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { hasUserKey, restoreUserKey } from '../lib/keyStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const loading = useAuthStore((s) => s.loading)
	const checkSession = useAuthStore((s) => s.checkSession)
	const [keyReady, setKeyReady] = useState(hasUserKey())
	const [isLoading, setIsLoading] = useState(loading)
	const [isAuthenticated, setIsAuthenticated] = useState(false)

	useEffect(() => {
		checkSession()
			.then(session => {
				console.log('checkSession',{session})
				setIsAuthenticated(!!session)
				setIsLoading(false)
			})
	}, [checkSession])

	useEffect(() => {
		if (!keyReady) {
			restoreUserKey().then((restored) => setKeyReady(restored))
		}
	}, [])
	console.log('loading: '+loading)

	if (loading || isLoading) {
	  return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>
	}
	console.log('isAuthenticated: '+isAuthenticated)

	if (!isAuthenticated) {
	  return <Navigate to="/login" replace />
	}
	console.log('keyReady: '+keyReady)
	if (!keyReady) {
	  return <Navigate to="/login" replace />
	}

	return <>{children}</>
}
