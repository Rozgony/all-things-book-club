import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/Home/LoginPage'
import { SignUpPage } from './pages/Home/SignUpPage'
import { AcceptInvitePage } from './pages/Invite/AcceptInvitePage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { ChapterDetailPage } from './pages/ChapterDetail/ChapterDetailPage'
import { MeetingPage } from './pages/Meetings/MeetingPage'
import { PrivacyPage } from './pages/Privacy/PrivacyPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
	return (
	  <Routes>
	    <Route path="/login" element={<LoginPage />} />
	    <Route path="/signup" element={<SignUpPage />} />
	    <Route path="/accept-invite" element={<AcceptInvitePage />} />
	    <Route path="/privacy" element={<PrivacyPage />} />
	    <Route
	      path="/profile"
	      element={
	        <ProtectedRoute>
	          <ProfilePage />
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
	    <Route path="*" element={<Navigate to="/profile" replace />} />
	  </Routes>
	)
}

export default App
