import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
  username: string
  role: string
}

interface AuthState {
  // JWT auth
  accessToken: string
  user: AuthUser | null
  isAuthenticated: boolean

  // Legacy write token (backward compat)
  writeToken: string

  // Actions
  setAuth: (accessToken: string, user: AuthUser) => void
  clearAuth: () => void
  setAccessToken: (token: string) => void
  setWriteToken: (token: string) => void
  clearWriteToken: () => void

  // Role helpers
  isAdmin: () => boolean
  canWrite: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: '',
      user: null,
      isAuthenticated: false,
      writeToken: '',

      setAuth: (accessToken, user) =>
        set({ accessToken, user, isAuthenticated: true }),

      clearAuth: () =>
        set({ accessToken: '', user: null, isAuthenticated: false }),

      setAccessToken: (token) => set({ accessToken: token }),

      setWriteToken: (token) => set({ writeToken: token }),
      clearWriteToken: () => set({ writeToken: '' }),

      isAdmin: () => get().user?.role === 'admin',
      canWrite: () => {
        const role = get().user?.role
        return role === 'admin' || role === 'editor' || !!get().writeToken
      },
    }),
    {
      name: 'tr-dashboard-auth',
      // Only persist writeToken. Access token lives in memory only
      // (restored via refreshAuth on page load). User is also memory-only
      // to avoid a stale-role window where isAdmin()/canWrite() return
      // truthy before the refresh validates the session.
      partialize: (state) => ({
        writeToken: state.writeToken,
      }),
      // Migrate from old store shape — discard any persisted auth state
      migrate: (persisted: any, version: number) => {
        if (version === 0 && persisted && typeof persisted === 'object') {
          return {
            writeToken: persisted.writeToken || '',
          }
        }
        return persisted as AuthState
      },
      version: 2,
    }
  )
)
