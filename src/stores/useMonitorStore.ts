import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { talkgroupKey, parseTalkgroupKey } from './useTalkgroupCache'

interface MonitorState {
  // Monitored talkgroups (by "sysid:tgid" key)
  monitoredTalkgroups: Set<string>
  // Whether monitoring is active (master switch)
  isMonitoring: boolean

  // Actions
  toggleTalkgroupMonitor: (sysid: string, tgid: number) => void
  addTalkgroupMonitor: (sysid: string, tgid: number) => void
  removeTalkgroupMonitor: (sysid: string, tgid: number) => void
  clearAllMonitors: () => void
  setMonitoring: (enabled: boolean) => void
  toggleMonitoring: () => void
  isMonitored: (sysid: string, tgid: number) => boolean

  // Check if any talkgroup with this tgid is monitored (for when sysid unknown)
  isMonitoredByTgid: (tgid: number) => boolean

  // Get all monitored talkgroup keys
  getMonitoredKeys: () => string[]
}

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set, get) => ({
      monitoredTalkgroups: new Set(),
      isMonitoring: false,

      toggleTalkgroupMonitor: (sysid, tgid) =>
        set((state) => {
          const key = talkgroupKey(sysid, tgid)
          const newSet = new Set(state.monitoredTalkgroups)
          if (newSet.has(key)) {
            newSet.delete(key)
            // Disable monitoring if no talkgroups left
            return {
              monitoredTalkgroups: newSet,
              isMonitoring: newSet.size > 0 ? state.isMonitoring : false
            }
          } else {
            newSet.add(key)
            // Auto-enable monitoring when adding a talkgroup
            return { monitoredTalkgroups: newSet, isMonitoring: true }
          }
        }),

      addTalkgroupMonitor: (sysid, tgid) =>
        set((state) => {
          const key = talkgroupKey(sysid, tgid)
          const newSet = new Set(state.monitoredTalkgroups)
          newSet.add(key)
          // Auto-enable monitoring when adding a talkgroup
          return { monitoredTalkgroups: newSet, isMonitoring: true }
        }),

      removeTalkgroupMonitor: (sysid, tgid) =>
        set((state) => {
          const key = talkgroupKey(sysid, tgid)
          const newSet = new Set(state.monitoredTalkgroups)
          newSet.delete(key)
          return { monitoredTalkgroups: newSet }
        }),

      clearAllMonitors: () => set({ monitoredTalkgroups: new Set() }),

      setMonitoring: (enabled) => set({ isMonitoring: enabled }),

      toggleMonitoring: () => set((state) => ({ isMonitoring: !state.isMonitoring })),

      isMonitored: (sysid, tgid) => get().monitoredTalkgroups.has(talkgroupKey(sysid, tgid)),

      // Fallback check when sysid is unknown
      isMonitoredByTgid: (tgid) => {
        for (const key of get().monitoredTalkgroups) {
          const parsed = parseTalkgroupKey(key)
          if (parsed && parsed.tgid === tgid) {
            return true
          }
        }
        return false
      },

      getMonitoredKeys: () => Array.from(get().monitoredTalkgroups),
    }),
    {
      name: 'tr-dashboard-monitor',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          // Convert array back to Set
          if (parsed.state?.monitoredTalkgroups) {
            parsed.state.monitoredTalkgroups = new Set(parsed.state.monitoredTalkgroups)
          }
          return parsed
        },
        setItem: (name, value) => {
          // Convert Set to array for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              monitoredTalkgroups: Array.from(value.state.monitoredTalkgroups),
            },
          }
          localStorage.setItem(name, JSON.stringify(toStore))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
