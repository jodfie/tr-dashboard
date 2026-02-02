import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { talkgroupKey, parseTalkgroupKey } from './useTalkgroupCache'

interface FilterState {
  // System filter
  selectedSystems: string[]

  // Talkgroup filters - stored as "sysid:tgid" keys
  favoriteTalkgroups: string[]
  selectedTalkgroups: string[]

  // Unit filters
  selectedUnits: number[]

  // Search
  searchQuery: string

  // Time range
  timeRange: 'live' | '1h' | '6h' | '24h' | 'custom'
  customStartTime: string | null
  customEndTime: string | null

  // Display preferences
  showEncrypted: boolean
  showEmergencyOnly: boolean

  // Actions
  setSelectedSystems: (systems: string[]) => void
  toggleSystem: (system: string) => void

  setFavoriteTalkgroups: (talkgroups: string[]) => void
  toggleFavoriteTalkgroup: (sysid: string, tgid: number) => void
  isFavorite: (sysid: string, tgid: number) => boolean
  // Fallback check when sysid unknown
  isFavoriteByTgid: (tgid: number) => boolean

  setSelectedTalkgroups: (talkgroups: string[]) => void
  toggleTalkgroup: (sysid: string, tgid: number) => void

  setSelectedUnits: (units: number[]) => void
  toggleUnit: (unitId: number) => void

  setSearchQuery: (query: string) => void

  setTimeRange: (range: 'live' | '1h' | '6h' | '24h' | 'custom') => void
  setCustomTimeRange: (start: string, end: string) => void

  setShowEncrypted: (show: boolean) => void
  setShowEmergencyOnly: (show: boolean) => void

  resetFilters: () => void
}

const initialState = {
  selectedSystems: [] as string[],
  favoriteTalkgroups: [] as string[],
  selectedTalkgroups: [] as string[],
  selectedUnits: [] as number[],
  searchQuery: '',
  timeRange: 'live' as const,
  customStartTime: null as string | null,
  customEndTime: null as string | null,
  showEncrypted: true,
  showEmergencyOnly: false,
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSelectedSystems: (systems) => set({ selectedSystems: systems }),

      toggleSystem: (system) =>
        set((state) => ({
          selectedSystems: state.selectedSystems.includes(system)
            ? state.selectedSystems.filter((s) => s !== system)
            : [...state.selectedSystems, system],
        })),

      setFavoriteTalkgroups: (talkgroups) => set({ favoriteTalkgroups: talkgroups }),

      toggleFavoriteTalkgroup: (sysid, tgid) =>
        set((state) => {
          const key = talkgroupKey(sysid, tgid)
          return {
            favoriteTalkgroups: state.favoriteTalkgroups.includes(key)
              ? state.favoriteTalkgroups.filter((t) => t !== key)
              : [...state.favoriteTalkgroups, key],
          }
        }),

      isFavorite: (sysid, tgid) => get().favoriteTalkgroups.includes(talkgroupKey(sysid, tgid)),

      isFavoriteByTgid: (tgid) => {
        for (const key of get().favoriteTalkgroups) {
          const parsed = parseTalkgroupKey(key)
          if (parsed && parsed.tgid === tgid) {
            return true
          }
        }
        return false
      },

      setSelectedTalkgroups: (talkgroups) => set({ selectedTalkgroups: talkgroups }),

      toggleTalkgroup: (sysid, tgid) =>
        set((state) => {
          const key = talkgroupKey(sysid, tgid)
          return {
            selectedTalkgroups: state.selectedTalkgroups.includes(key)
              ? state.selectedTalkgroups.filter((t) => t !== key)
              : [...state.selectedTalkgroups, key],
          }
        }),

      setSelectedUnits: (units) => set({ selectedUnits: units }),

      toggleUnit: (unitId) =>
        set((state) => ({
          selectedUnits: state.selectedUnits.includes(unitId)
            ? state.selectedUnits.filter((u) => u !== unitId)
            : [...state.selectedUnits, unitId],
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setTimeRange: (range) => set({ timeRange: range }),

      setCustomTimeRange: (start, end) =>
        set({
          timeRange: 'custom',
          customStartTime: start,
          customEndTime: end,
        }),

      setShowEncrypted: (show) => set({ showEncrypted: show }),

      setShowEmergencyOnly: (show) => set({ showEmergencyOnly: show }),

      resetFilters: () =>
        set({
          selectedSystems: [],
          selectedTalkgroups: [],
          selectedUnits: [],
          searchQuery: '',
          timeRange: 'live',
          customStartTime: null,
          customEndTime: null,
          showEncrypted: true,
          showEmergencyOnly: false,
        }),
    }),
    {
      name: 'tr-dashboard-filters',
      partialize: (state) => ({
        favoriteTalkgroups: state.favoriteTalkgroups,
        showEncrypted: state.showEncrypted,
      }),
    }
  )
)
