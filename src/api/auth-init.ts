import { useAuthStore, type AuthMode } from '@/stores/useAuthStore'
import { API_BASE } from '@/api/client'

const VALID_MODES = new Set<AuthMode>(['open', 'token', 'full'])

export interface AuthInitResult {
  mode: AuthMode
  readToken: string
  jwtEnabled: boolean
}

/**
 * Fetch auth-init and update the auth store with the detected mode.
 * Returns the result, or null if the fetch failed.
 * Safe to call multiple times — skips if authMode is already set.
 */
export async function detectAuthMode(): Promise<AuthInitResult | null> {
  // Already detected — return current state
  const current = useAuthStore.getState()
  if (current.authMode !== null) {
    return {
      mode: current.authMode,
      readToken: current.readToken,
      jwtEnabled: current.jwtEnabled,
    }
  }

  let mode: AuthMode = 'full'
  let readToken = ''
  let jwtEnabled = true

  try {
    const res = await fetch(`${API_BASE}/auth-init`)
    if (!res.ok) {
      console.error(`auth-init returned ${res.status} ${res.statusText}`)
      return null
    }

    let data: any
    try {
      data = await res.json()
    } catch (parseErr) {
      console.error('auth-init returned OK but body is not valid JSON:', parseErr)
      return null
    }

    if (data && typeof data === 'object') {
      if (data.mode && VALID_MODES.has(data.mode)) {
        mode = data.mode
        readToken = data.read_token || ''
        jwtEnabled = data.jwt_enabled ?? false
      } else if (data.mode) {
        console.warn(`auth-init returned unrecognized mode: "${data.mode}", requiring login`)
        mode = 'full'
        jwtEnabled = true
      } else if ('token' in data) {
        // Legacy response: { token, guest_access }
        readToken = data.token || ''
        if (data.guest_access) {
          mode = readToken ? 'full' : 'open'
          jwtEnabled = false
        } else {
          mode = 'full'
          jwtEnabled = true
        }
      }
    }
  } catch (err) {
    console.error('auth-init fetch failed:', err)
    return null
  }

  useAuthStore.getState().setAuthInit(mode, readToken, jwtEnabled)
  return { mode, readToken, jwtEnabled }
}
