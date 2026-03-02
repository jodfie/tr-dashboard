import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  writeToken: string
  setWriteToken: (token: string) => void
  clearWriteToken: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      writeToken: '',
      setWriteToken: (token) => set({ writeToken: token }),
      clearWriteToken: () => set({ writeToken: '' }),
    }),
    { name: 'tr-dashboard-auth' }
  )
)
