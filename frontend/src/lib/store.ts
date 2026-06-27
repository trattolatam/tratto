import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'
import { auth } from '@/lib/api'

interface AuthState {
  user: User | null; token: string | null; isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void; fetchMe: () => Promise<void>; setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, token: null, isLoading: false,
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await auth.login(email, password) as any
          localStorage.setItem('tratto_token', data.token)
          set({ user: data.user, token: data.token, isLoading: false })
        } catch (err) { set({ isLoading: false }); throw err }
      },
      logout: () => { localStorage.removeItem('tratto_token'); set({ user: null, token: null }) },
      fetchMe: async () => {
        const token = localStorage.getItem('tratto_token')
        if (!token) return
        try { const data = await auth.me() as any; set({ user: data.user }) } catch { get().logout() }
      },
      setUser: (user) => set({ user }),
    }),
    { name: 'tratto-auth', partialize: (state) => ({ token: state.token }) }
  )
)
