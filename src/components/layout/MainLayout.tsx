import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { useHotkeys } from 'react-hotkeys-hook'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { CommandPalette } from '@/components/command/CommandPalette'
import { initializeRealtimeConnection } from '@/stores/useRealtimeStore'
import { useTalkgroupCache } from '@/stores/useTalkgroupCache'
import { getTalkgroups } from '@/api/client'
import { KEYBOARD_SHORTCUTS } from '@/lib/constants'

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const addTalkgroupsToCache = useTalkgroupCache((s) => s.addTalkgroups)

  // Initialize WebSocket connection
  useEffect(() => {
    const cleanup = initializeRealtimeConnection()
    return cleanup
  }, [])

  // Warm the talkgroup cache on startup
  useEffect(() => {
    // Fetch talkgroups to populate cache for sidebar display
    getTalkgroups({ limit: 500 })
      .then((res) => {
        addTalkgroupsToCache(res.talkgroups)
      })
      .catch((err) => {
        console.error('Failed to warm talkgroup cache:', err)
      })
  }, [addTalkgroupsToCache])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const openCommand = useCallback(() => {
    setCommandOpen(true)
  }, [])

  // Keyboard shortcuts
  useHotkeys(KEYBOARD_SHORTCUTS.COMMAND_PALETTE, (e) => {
    e.preventDefault()
    setCommandOpen((prev) => !prev)
  })

  useHotkeys(KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR, (e) => {
    e.preventDefault()
    toggleSidebar()
  })

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header onToggleSidebar={toggleSidebar} onOpenCommand={openCommand} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            <Outlet />
          </div>
          <AudioPlayer />
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
