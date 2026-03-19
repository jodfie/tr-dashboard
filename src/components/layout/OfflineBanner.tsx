import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-1.5 text-sm text-destructive">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" x2="22" y1="2" y2="22" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
        <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
        <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
        <path d="M5 12.55a10 10 0 0 1 5.17-2.39" />
        <line x1="12" x2="12.01" y1="20" y2="20" />
      </svg>
      You are offline — live data unavailable
    </div>
  )
}
