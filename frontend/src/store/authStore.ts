import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getMyProfile } from '../api/users'

interface AuthState {
	session: Session | null
	user: User | null
	loading: boolean
	timezone: string | null
	setTimezone: (tz: string) => void
	signOut: () => Promise<void>
	checkSession: () => Promise<Session | null>
	_initialize: () => () => void
}

export const useAuthStore = create<AuthState>((set) => ({
	session: null,
	user: null,
	loading: true,
	timezone: null,

	setTimezone: (tz) => set({ timezone: tz }),

	signOut: async () => {
	  await supabase.auth.signOut()
	},

	// Forces a real expiry/refresh check instead of trusting the cached session.
	checkSession: async () => {
	  const { data: { session } } = await supabase.auth.getSession()
	  console.log('checkSession',session)
	  set({ session, user: session?.user ?? null })
	  return session
	},

	_initialize: () => {
	  supabase.auth.getSession().then(({ data: { session } }) => {
	    set({ session, user: session?.user ?? null, loading: false })
	    if (session) {
	      getMyProfile().then(p => set({ timezone: p.timezone ?? null })).catch(() => {})
	    }
	  })

	  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
	    set({ session, user: session?.user ?? null })
	    if (session) {
	      getMyProfile().then(p => set({ timezone: p.timezone ?? null })).catch(() => {})
	    }
	  })

	  // Timers that auto-refresh the token get throttled/suspended while the tab is
	  // backgrounded or the machine sleeps, so the session can silently expire without
	  // onAuthStateChange ever firing. Re-check when the tab becomes active again.
	  const revalidate = () => {
		console.log('revalidate')
	    if (document.visibilityState === 'visible') {
	      useAuthStore.getState().checkSession()
	    }
	  }
	  document.addEventListener('visibilitychange', revalidate)

	  return () => {
	    subscription.unsubscribe()
	    document.removeEventListener('visibilitychange', revalidate)
	  }
	},
}))
