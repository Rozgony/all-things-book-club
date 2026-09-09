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

	  return () => subscription.unsubscribe()
	},
}))
