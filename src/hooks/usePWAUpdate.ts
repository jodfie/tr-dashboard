import { useState, useEffect, useCallback } from 'react'

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const handler = () => setUpdateAvailable(true)
    window.addEventListener('sw-update-available', handler)
    return () => window.removeEventListener('sw-update-available', handler)
  }, [])

  const acceptUpdate = useCallback(() => {
    if (updateSW) {
      updateSW(true)
    } else {
      window.location.reload()
    }
  }, [])

  return { updateAvailable, acceptUpdate }
}

// Called from main.tsx to store the update function
export function setUpdateSW(fn: (reloadPage?: boolean) => Promise<void>) {
  updateSW = fn
}
