import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAudioStore, selectIsPlaying } from '@/stores/useAudioStore'
import type { Call } from '@/api/types'
import {
  formatDuration,
  formatTime,
  formatFrequency,
  getTalkgroupDisplayName,
} from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CallCardProps {
  call: Call
  showSystem?: boolean
  compact?: boolean
}

export function CallCard({ call, showSystem = true, compact = false }: CallCardProps) {
  const loadCall = useAudioStore((s) => s.loadCall)
  const currentCall = useAudioStore((s) => s.currentCall)
  const isPlaying = useAudioStore(selectIsPlaying)

  const isCurrentlyPlaying = currentCall?.callId === call.call_id
  const hasAudio = !!call.audio_url

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (hasAudio) {
      loadCall(call)
    }
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50',
          isCurrentlyPlaying && 'border-primary bg-primary/5'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlay}
          disabled={!hasAudio}
          className="shrink-0"
        >
          {isCurrentlyPlaying && isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/calls/${call.call_id}`}
              className="truncate font-medium hover:underline"
            >
              {getTalkgroupDisplayName(call.tgid, call.tg_alpha_tag)}
            </Link>
            {call.emergency && <Badge variant="destructive">EMERG</Badge>}
            {call.encrypted && <Badge variant="secondary">ENC</Badge>}
          </div>
          {call.transcription_text && (
            <p className="text-sm text-muted-foreground italic truncate">
              {call.transcription_text.slice(0, 80)}{call.transcription_text.length > 80 ? '...' : ''}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatTime(call.start_time)}</span>
            {showSystem && call.system_name && (
              <>
                <span>&bull;</span>
                <span>{call.system_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-sm">{formatDuration(call.duration ?? 0)}</div>
          {call.units && call.units.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {call.units.length} unit{call.units.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'transition-colors hover:bg-accent/50',
        isCurrentlyPlaying && 'border-primary bg-primary/5'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                to={`/calls/${call.call_id}`}
                className="truncate text-lg font-medium hover:underline"
              >
                {getTalkgroupDisplayName(call.tgid, call.tg_alpha_tag)}
              </Link>
              {call.emergency && <Badge variant="destructive">EMERGENCY</Badge>}
              {call.encrypted && <Badge variant="secondary">ENCRYPTED</Badge>}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{formatTime(call.start_time)}</span>
              {showSystem && call.system_name && <span>{call.system_name}</span>}
              {call.freq != null && call.freq > 0 && (
                <span className="font-mono">{formatFrequency(call.freq)}</span>
              )}
            </div>

            {call.transcription_text && (
              <p className="mt-2 text-sm text-muted-foreground italic truncate">
                {call.transcription_text.slice(0, 150)}{call.transcription_text.length > 150 ? '...' : ''}
              </p>
            )}

            {call.units && call.units.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {call.units.slice(0, 5).map((unit, i) => (
                  <Link key={i} to={`/units/${call.system_id}:${unit.unit_id}`}>
                    <Badge variant="outline" className="text-xs hover:bg-accent">
                      {unit.alpha_tag || `Unit ${unit.unit_id}`}
                    </Badge>
                  </Link>
                ))}
                {call.units.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{call.units.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="font-mono text-lg">{formatDuration(call.duration ?? 0)}</div>
            <Button
              variant={isCurrentlyPlaying ? 'default' : 'secondary'}
              size="sm"
              onClick={handlePlay}
              disabled={!hasAudio}
            >
              {isCurrentlyPlaying && isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                  Playing
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Play
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
