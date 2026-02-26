import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { APP_VERSION } from '@/version'

interface UpdateState {
  updateCheckEnabled: boolean
  hasCheckedOnce: boolean
  latestVersion: string | null
  updateUrl: string | null
  lastChecked: string | null

  setUpdateCheckEnabled: (enabled: boolean) => void
  setUpdateInfo: (version: string | null, url: string | null) => void
  checkForUpdate: (engineVersion?: string | null) => Promise<void>
}

export const useUpdateStore = create<UpdateState>()(
  persist(
    (set, get) => ({
      updateCheckEnabled: true,
      hasCheckedOnce: false,
      latestVersion: null,
      updateUrl: null,
      lastChecked: null,

      setUpdateCheckEnabled: (enabled) => set({ updateCheckEnabled: enabled }),

      setUpdateInfo: (version, url) => set({ latestVersion: version, updateUrl: url }),

      checkForUpdate: async (engineVersion) => {
        const { updateCheckEnabled } = get()
        if (!updateCheckEnabled) return

        try {
          const params = new URLSearchParams({
            product: 'tr-dashboard',
            v: APP_VERSION,
          })
          if (engineVersion) {
            params.set('engine', engineVersion)
          }

          const res = await fetch(
            `https://updates.luxprimatech.com/check?${params.toString()}`
          )
          if (!res.ok) return

          const data = await res.json()
          set({
            latestVersion: data.latest_version ?? null,
            updateUrl: data.update_url ?? null,
            lastChecked: new Date().toISOString(),
            hasCheckedOnce: true,
          })
        } catch {
          // Silently fail — update check is best-effort
          set({ hasCheckedOnce: true })
        }
      },
    }),
    {
      name: 'tr-dashboard-update-check',
      partialize: (state) => ({
        updateCheckEnabled: state.updateCheckEnabled,
        hasCheckedOnce: state.hasCheckedOnce,
        latestVersion: state.latestVersion,
        updateUrl: state.updateUrl,
        lastChecked: state.lastChecked,
      }),
    }
  )
)
