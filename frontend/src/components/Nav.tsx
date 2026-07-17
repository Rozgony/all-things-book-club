import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export type NavParams = {
	  showLogout?: boolean
	  showProfile?: boolean
	  showChapters?: boolean
}

export function Nav(params: NavParams) {
 const { showLogout, showProfile, showChapters } = params;
	const signOut = useAuthStore((s) => s.signOut)
	const navigate = useNavigate()

	return (
	  	<nav className="bg-forest px-6 py-4 flex justify-between items-center">
	    	<h1 className="font-heading text-white text-lg tracking-wide">All Things Book Club</h1>
	    	<div className="flex items-center gap-5">
				{ !showChapters || <button onClick={() => navigate('/chapters')} className="text-sm text-white/75 hover:text-white transition-colors">All Chapters</button> }
	      		{ !showProfile || <button onClick={() => navigate('/profile')} className="text-sm text-white/75 hover:text-white transition-colors">Profile</button> }
	      		{ !showLogout || <button onClick={signOut} className="text-sm text-white/75 hover:text-white transition-colors">Sign out</button> }
	    	</div>
	  	</nav>
	)
}
