import { useState, useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { refreshAuth } from '@/api/client'
import { detectAuthMode } from '@/api/auth-init'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [checking, setChecking] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      setChecking(false)
      return
    }

    let cancelled = false

    async function init() {
      const result = await detectAuthMode()

      if (cancelled) return

      if (!result) {
        setAuthError(true)
        setChecking(false)
        return
      }

      // Only full mode with JWT requires login; all other modes skip auth
      if (result.mode === 'full' && result.jwtEnabled) {
        const refreshResult = await refreshAuth()
        if (cancelled) return
        if (refreshResult) {
          setAuth(refreshResult.access_token, refreshResult.user)
        } else {
          setAuthRequired(true)
        }
      }

      setChecking(false)
    }

    init()
    return () => { cancelled = true }
  }, [isAuthenticated, setAuth])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="text-destructive font-medium">Unable to connect to the API</div>
          <div className="text-sm text-muted-foreground">
            Could not determine authentication mode. Check that tr-engine is running.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (authRequired && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
