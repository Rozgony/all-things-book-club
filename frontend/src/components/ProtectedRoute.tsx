import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { hasUserKey, restoreUserKey } from '../lib/keyStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const session = useAuthStore((s) => s.session)
	const loading = useAuthStore((s) => s.loading)
	const [keyReady, setKeyReady] = useState(hasUserKey())

	useEffect(() => {
		if (!keyReady) {
			restoreUserKey().then((restored) => setKeyReady(restored))
		}
	}, [])

	if (loading) {
	  return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>
	}

	if (!session) {
	  return <Navigate to="/login" replace />
	}

	if (!keyReady) {
	  return <Navigate to="/login" replace />
	}

	return <>{children}</>
}
