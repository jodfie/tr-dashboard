import { usePWAUpdate } from '@/hooks/usePWAUpdate'

export function PWAUpdateBanner() {
  const { updateAvailable, acceptUpdate } = usePWAUpdate()

  if (!updateAvailable) return null

  return (
    <div className="flex items-center justify-center gap-3 bg-primary px-4 py-1.5 text-sm text-primary-foreground">
      <span>New version available</span>
      <button
        onClick={acceptUpdate}
        className="rounded bg-primary-foreground/20 px-2.5 py-0.5 text-xs font-medium hover:bg-primary-foreground/30 transition-colors"
      >
        Update
      </button>
    </div>
  )
}
