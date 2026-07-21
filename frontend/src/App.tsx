import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { ChaptersPage } from './pages/ChaptersPage'
import { ChapterDetailPage } from './pages/ChapterDetailPage'
import { MeetingPage } from './pages/MeetingPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
	return (
	  <Routes>
	    <Route path="/login" element={<LoginPage />} />
	    <Route
	      path="/profile"
	      element={
	        <ProtectedRoute>
	          <ProfilePage />
	        </ProtectedRoute>
	      }
	    />
	    <Route
	      path="/chapters"
	      element={
	        <ProtectedRoute>
	          <ChaptersPage />
	        </ProtectedRoute>
	      }
	    />
	    <Route
	      path="/chapters/:id"
	      element={
	        <ProtectedRoute>
	          <ChapterDetailPage />
	        </ProtectedRoute>
	      }
	    />
	    <Route
	      path="/meetings/:id"
	      element={
	        <ProtectedRoute>
	          <MeetingPage />
	        </ProtectedRoute>
	      }
	    />
	    <Route path="*" element={<Navigate to="/chapters" replace />} />
	  </Routes>
	)
}

export default App
