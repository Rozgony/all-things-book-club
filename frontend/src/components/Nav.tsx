import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LoginButton } from './LoginButton'

export type NavParams = {
	  showLogout?: boolean
	  showProfile?: boolean
	  showChapters?: boolean
	  showLogin?: boolean
	  username?: string
}

export function Nav(params: NavParams) {
 const { showLogout, showProfile, showChapters, showLogin, username } = params;
	const isAuthenticated = useAuthStore((s) => !!s.session)
	const signOut = useAuthStore((s) => s.signOut)
	const navigate = useNavigate()
	return (
	  	<nav className="bg-forest px-6 py-4 flex justify-between items-center">
	    	<h1 className="font-heading text-white text-lg tracking-wide"><a href='/'>All Things Book Club</a></h1>
	    	<div className="flex items-center gap-5">
				{ (!showChapters || !isAuthenticated) || <button onClick={() => navigate('/chapters')} className="text-sm text-white/75 hover:text-white transition-colors">All Chapters</button> }
	      		{ (!showProfile || !isAuthenticated) || <button onClick={() => navigate('/profile')} className="text-sm text-white/75 hover:text-white transition-colors">{username || 'Profile'}</button> }
	      		{ (!showLogout || !isAuthenticated) || <button onClick={signOut} className="text-sm text-white/75 hover:text-white transition-colors">Sign out</button> }
	      		{ (!showLogin || (
					isAuthenticated ? 
						<button onClick={() => navigate('/profile')} className="text-sm text-white/75 hover:text-white transition-colors">{username || 'Profile'}</button> 
						: 
						<LoginButton variant='nav' />
						)
					) 
				}
	    	</div>
	  	</nav>
	)
}
