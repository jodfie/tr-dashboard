import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAudioStore, selectIsPlaying } from '@/stores/useAudioStore'
import { useTranscriptionCache } from '@/stores/useTranscriptionCache'
import { TranscriptionPreview } from '@/components/calls/TranscriptionPreview'
import type { RecentCallInfo, Call } from '@/api/types'
import {
  formatDuration,
  formatTime,
  formatFrequency,
  getTalkgroupDisplayName,
  getUnitColorByRid,
} from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CallCardProps {
  call: RecentCallInfo | Call
  showSystem?: boolean
  compact?: boolean
}

export function CallCard({ call, showSystem = true, compact = false }: CallCardProps) {
  const loadCall = useAudioStore((s) => s.loadCall)
  const currentCall = useAudioStore((s) => s.currentCall)
  const isPlaying = useAudioStore(selectIsPlaying)

  // Use call_id (composite format) for audio URLs and identification
  const callId = call.call_id ?? ''
  const isCurrentlyPlaying = currentCall?.callId === callId
  const hasAudio = 'has_audio' in call ? call.has_audio : !!call.audio_path
  const system = 'system' in call ? call.system : ''
  const sysid = 'sysid' in call ? call.sysid : ('tg_sysid' in call ? call.tg_sysid : undefined)
  const tgAlphaTag = call.tg_alpha_tag
  const tgid = call.tgid ?? 0

  // Get transmissions from cache to determine unit colors
  const transcriptionEntry = useTranscriptionCache((s) => s.getEntry(callId))

  // Get unique unit RIDs in order of appearance from transmissions
  const uniqueUnits = useMemo(() => {
    if (!transcriptionEntry?.transmissions || transcriptionEntry.transmissions.length === 0) return []
    const seen = new Set<number>()
    const units: number[] = []
    // Sort by position (use 0 for missing positions)
    const sorted = [...transcriptionEntry.transmissions].sort((a, b) => {
      const posA = (a.position != null && a.position >= 0) ? a.position : 0
      const posB = (b.position != null && b.position >= 0) ? b.position : 0
      return posA - posB
    })
    for (const tx of sorted) {
      if (!seen.has(tx.unit_rid)) {
        seen.add(tx.unit_rid)
        units.push(tx.unit_rid)
      }
    }
    return units
  }, [transcriptionEntry?.transmissions])

  // Check if we have units to color-code
  const hasUnits = uniqueUnits.length > 0

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (hasAudio && callId) {
      loadCall({
        call_id: callId,
        system,
        sysid,
        tgid,
        tg_alpha_tag: tgAlphaTag,
        duration: call.duration,
        start_time: call.start_time,
        stop_time: call.stop_time || '',
        call_num: 0,
        freq: 'freq' in call ? call.freq : 0,
        encrypted: call.encrypted,
        emergency: call.emergency,
        has_audio: hasAudio,
        audio_path: call.audio_path,
        units: 'units' in call && Array.isArray(call.units) ? call.units.map(u => ({ unit_id: 'unit_id' in u ? u.unit_id : u.unit_rid, unit_tag: 'unit_tag' in u ? u.unit_tag : u.alpha_tag })) : [],
      })
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
              to={`/calls/${callId}`}
              className="truncate font-medium hover:underline"
            >
              {getTalkgroupDisplayName(tgid, tgAlphaTag)}
            </Link>
            {call.emergency && <Badge variant="destructive">EMERG</Badge>}
            {call.encrypted && <Badge variant="secondary">ENC</Badge>}
          </div>
          <TranscriptionPreview callId={callId} compact />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatTime(call.start_time)}</span>
            {showSystem && system && (
              <>
                <span>•</span>
                <span>{system}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-sm">{formatDuration(call.duration)}</div>
          {'units' in call && call.units && call.units.length > 0 && (
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
                to={`/calls/${callId}`}
                className="truncate text-lg font-medium hover:underline"
              >
                {getTalkgroupDisplayName(tgid, tgAlphaTag)}
              </Link>
              {call.emergency && <Badge variant="destructive">EMERGENCY</Badge>}
              {call.encrypted && <Badge variant="secondary">ENCRYPTED</Badge>}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{formatTime(call.start_time)}</span>
              {showSystem && system && <span>{system}</span>}
              {'freq' in call && call.freq > 0 && (
                <span className="font-mono">{formatFrequency(call.freq)}</span>
              )}
            </div>

            <div className="mt-2">
              <TranscriptionPreview callId={callId} />
            </div>

            {'units' in call && call.units && call.units.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {call.units.slice(0, 5).map((unit, i) => {
                  const unitId = 'unit_id' in unit ? unit.unit_id : unit.unit_rid
                  const unitDisplay = 'unit_tag' in unit ? unit.unit_tag || unit.unit_id : unit.alpha_tag || unit.unit_rid
                  const unitColor = hasUnits ? getUnitColorByRid(unitId, uniqueUnits) : null
                  const colorClasses = unitColor ? `${unitColor.text} ${unitColor.border}` : ''
                  return sysid ? (
                    <Link key={i} to={`/units/${sysid}:${unitId}`}>
                      <Badge variant="outline" className={cn("text-xs hover:bg-accent", colorClasses)}>
                        {unitDisplay}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge key={i} variant="outline" className={cn("text-xs", colorClasses)}>
                      {unitDisplay}
                    </Badge>
                  )
                })}
                {call.units.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{call.units.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="font-mono text-lg">{formatDuration(call.duration)}</div>
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
