import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const session = useAuthStore((s) => s.session)
	const loading = useAuthStore((s) => s.loading)

	if (loading) {
	  return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>
	}

	if (!session) {
	  return <Navigate to="/login" replace />
	}

	return <>{children}</>
}
