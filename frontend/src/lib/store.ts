import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'
import { auth } from '@/lib/api'

interface AuthState {
  user: User | null; token: string | null; isLoading: boolean; authChecked: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void; fetchMe: () => Promise<void>; setUser: (user: User) => void
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, token: null, isLoading: false, authChecked: false,
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await auth.login(email, password) as any
          localStorage.setItem('tratto_token', data.token)
          set({ user: data.user, token: data.token, isLoading: false, authChecked: true })
          return data.user
        } catch (err) { set({ isLoading: false }); throw err }
      },
      logout: () => { localStorage.removeItem('tratto_token'); set({ user: null, token: null, authChecked: true }) },
      fetchMe: async () => {
        const token = localStorage.getItem('tratto_token')
        if (!token) { set({ authChecked: true }); return }
        try { const data = await auth.me() as any; set({ user: data.user, authChecked: true }) }
        catch { get().logout() }
      },
      setUser: (user) => set({ user }),
      setToken: (token) => { localStorage.setItem('tratto_token', token); set({ token }) },
    }),
    { name: 'tratto-auth', partialize: (state) => ({ token: state.token }) }
  )
)
