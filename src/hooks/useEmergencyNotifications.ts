import { useEffect, useRef } from 'react'
import { useRealtimeStore } from '@/stores/useRealtimeStore'
import { useFilterStore } from '@/stores/useFilterStore'

export function useEmergencyNotifications() {
  const activeCalls = useRealtimeStore((s) => s.activeCalls)
  const emergencyNotifications = useFilterStore((s) => s.emergencyNotifications)
  const seenIds = useRef(new Set<number>())

  useEffect(() => {
    if (!emergencyNotifications) return
    if (typeof Notification === 'undefined') return

    for (const [callId, call] of activeCalls) {
      if (!call.emergency) continue
      if (seenIds.current.has(callId)) continue

      seenIds.current.add(callId)

      const notificationOptions = {
        body: `${call.tg_alpha_tag || `TG ${call.tgid}`} — ${call.system_name || `System ${call.system_id}`}`,
        tag: `emergency-${callId}`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
      } satisfies NotificationOptions & { vibrate: number[] }

      if (Notification.permission === 'granted') {
        new Notification('Emergency Call', notificationOptions)
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification('Emergency Call', notificationOptions)
          }
        })
      }
    }

    // Clean up old IDs to prevent memory leak
    if (seenIds.current.size > 500) {
      const activeIds = new Set(activeCalls.keys())
      for (const id of seenIds.current) {
        if (!activeIds.has(id)) seenIds.current.delete(id)
      }
    }
  }, [activeCalls, emergencyNotifications])
}
