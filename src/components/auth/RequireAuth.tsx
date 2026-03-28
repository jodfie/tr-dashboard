import { useState, useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { refreshAuth } from '@/api/client'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [checking, setChecking] = useState(!isAuthenticated)
  // When backend has no JWT auth configured, login endpoints return 404.
  // In that case, skip auth entirely and let legacy token mode work.
  const [authDisabled, setAuthDisabled] = useState(false)

  // On mount, attempt silent token refresh if not authenticated
  useEffect(() => {
    if (isAuthenticated) return

    let cancelled = false
    refreshAuth().then((result) => {
      if (cancelled) return
      if (result === null) {
        // Refresh failed — could be expired or backend has no JWT auth.
        // Check auth-init for guest_access, then probe login endpoint as fallback.
        fetch('/api/v1/auth-init').then((res) => res.ok ? res.json() : null).then((data) => {
          if (cancelled) return
          if (data?.guest_access) {
            setAuthDisabled(true)
            setChecking(false)
            return
          }
          // Fallback: probe the login endpoint to detect legacy/open mode
          fetch('/api/v1/auth/login', { method: 'OPTIONS' }).then((res) => {
            if (cancelled) return
            if (res.status === 404 || res.status === 405 || res.status === 403) {
              setAuthDisabled(true)
            }
            setChecking(false)
          }).catch(() => {
            if (!cancelled) setChecking(false)
          })
        }).catch(() => {
          if (!cancelled) setChecking(false)
        })
        return
      }
      setAuth(result.access_token, result.user)
      setChecking(false)
    })

    return () => { cancelled = true }
  }, [isAuthenticated, setAuth])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Backend has no JWT auth — skip login, run in legacy mode
  if (authDisabled) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
