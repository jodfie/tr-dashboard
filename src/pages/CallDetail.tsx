import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAudioStore, selectIsPlaying } from '@/stores/useAudioStore'
import { getCall, getCallTransmissions, getCallFrequencies, getCallTranscription, getTalkgroup, getUnit } from '@/api/client'
import type { Call, Transmission, CallFrequency, Talkgroup, Unit, Transcription } from '@/api/types'
import {
  formatDuration,
  formatDateTime,
  formatFrequency,
  getTalkgroupDisplayName,
  getUnitDisplayName,
  getUnitColorByRid,
  cn,
} from '@/lib/utils'

// Find which unit spoke a word based on transmission time ranges
function findSpeaker(
  wordStart: number,
  wordEnd: number,
  transmissions: Transmission[]
): number | null {
  if (transmissions.length === 0) return null

  // Build transmission ranges with start/end times
  const ranges = transmissions
    .map(tx => {
      const start = (tx.position != null && tx.position >= 0) ? tx.position : 0
      const duration = (tx.duration != null && tx.duration > 0) ? tx.duration : 0
      return { start, end: start + duration, unit_rid: tx.unit_rid }
    })
    .sort((a, b) => a.start - b.start)

  // Find the transmission with the most overlap with this word
  let bestMatch: { unit_rid: number; overlap: number } | null = null

  for (const range of ranges) {
    const overlapStart = Math.max(wordStart, range.start)
    const overlapEnd = Math.min(wordEnd, range.end)
    const overlap = Math.max(0, overlapEnd - overlapStart)

    if (overlap > 0 && (bestMatch === null || overlap > bestMatch.overlap)) {
      bestMatch = { unit_rid: range.unit_rid, overlap }
    }
  }

  if (bestMatch) {
    return bestMatch.unit_rid
  }

  // If no overlap, find the transmission closest to the word's midpoint
  const wordMid = (wordStart + wordEnd) / 2
  let closest = ranges[0]
  let closestDist = Math.abs(wordMid - (closest.start + closest.end) / 2)

  for (const range of ranges) {
    const rangeMid = (range.start + range.end) / 2
    const dist = Math.abs(wordMid - rangeMid)
    if (dist < closestDist) {
      closest = range
      closestDist = dist
    }
  }

  return closest?.unit_rid ?? null
}

export default function CallDetail() {
  const { id } = useParams<{ id: string }>()
  const [call, setCall] = useState<Call | null>(null)
  const [talkgroup, setTalkgroup] = useState<Talkgroup | null>(null)
  const [transmissions, setTransmissions] = useState<Transmission[]>([])
  const [frequencies, setFrequencies] = useState<CallFrequency[]>([])
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [unitMap, setUnitMap] = useState<Map<number, Unit>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCall = useAudioStore((s) => s.loadCall)
  const currentCall = useAudioStore((s) => s.currentCall)
  const isPlaying = useAudioStore(selectIsPlaying)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError(null)

    Promise.all([
      getCall(id),
      getCallTransmissions(id).catch(() => []),
      getCallFrequencies(id).catch(() => []),
    ])
      .then(async ([callRes, txRes, freqRes]) => {
        setCall(callRes)
        // API returns raw arrays, not wrapped objects
        const txArray: Transmission[] = Array.isArray(txRes) ? txRes : (txRes.transmissions || [])
        const freqArray: CallFrequency[] = Array.isArray(freqRes) ? freqRes : (freqRes.frequencies || [])
        setTransmissions(txArray)
        setFrequencies(freqArray)

        // Fetch talkgroup info if we have tg_sysid and tgid but no tg_alpha_tag
        if (callRes.tg_sysid && callRes.tgid && !callRes.tg_alpha_tag) {
          try {
            const tg = await getTalkgroup(`${callRes.tg_sysid}:${callRes.tgid}`)
            setTalkgroup(tg)
          } catch (e) {
            console.error('Failed to fetch talkgroup:', e)
          }
        }

        // Fetch unit info for transmissions - use composite keys (sysid:unit_rid)
        const uniqueUnitKeys = [...new Set(
          txArray
            .filter(tx => tx.unit_sysid && tx.unit_rid)
            .map(tx => `${tx.unit_sysid}:${tx.unit_rid}`)
        )]
        if (uniqueUnitKeys.length > 0) {
          const unitResults = await Promise.all(
            uniqueUnitKeys.map(key => getUnit(key).catch(() => null))
          )
          const newUnitMap = new Map<number, Unit>()
          unitResults.forEach(unit => {
            if (unit) {
              newUnitMap.set(unit.unit_id, unit)
            }
          })
          setUnitMap(newUnitMap)
        }

        // Fetch transcription if available
        try {
          const tx = await getCallTranscription(id)
          setTranscription(tx)
        } catch {
          // Transcription not available - that's fine
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Failed to load call details')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Get talkgroup display info from either call or fetched talkgroup
  const tgid = call?.tgid || talkgroup?.tgid || 0
  const tgAlphaTag = call?.tg_alpha_tag || talkgroup?.alpha_tag

  // Compare using the route param id (composite format) since that's what we use for callId
  const isCurrentlyPlaying = currentCall?.callId === id || currentCall?.callId === String(call?.id)

  // Get unique unit RIDs in order of appearance for color-coding
  const uniqueUnits = useMemo(() => {
    if (transmissions.length === 0) return []
    const seen = new Set<number>()
    const units: number[] = []
    const sorted = [...transmissions].sort((a, b) => {
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
  }, [transmissions])

  const hasUnits = uniqueUnits.length > 0

  // Find which transmissions have transcribed words
  const transmissionsWithWords = useMemo(() => {
    if (!transcription?.words || transmissions.length === 0) return new Set<number>()

    const withWords = new Set<number>()
    for (const word of transcription.words) {
      // Find which transmission this word belongs to
      for (const tx of transmissions) {
        const start = (tx.position != null && tx.position >= 0) ? tx.position : 0
        const duration = (tx.duration != null && tx.duration > 0) ? tx.duration : 0
        const end = start + duration

        // Check for overlap
        if (word.start < end && word.end > start) {
          withWords.add(tx.id)
          break
        }
      }
    }
    return withWords
  }, [transcription?.words, transmissions])

  const handlePlay = () => {
    if (!call || !call.audio_path) return
    // Use route param id as call_id (composite format) for audio URL
    const callIdStr = id || String(call.id)
    loadCall({
      id: call.id,
      call_id: callIdStr,
      system: '',
      tgid: tgid,
      tg_alpha_tag: tgAlphaTag,
      duration: call.duration,
      start_time: call.start_time,
      stop_time: call.stop_time || '',
      call_num: call.call_num,
      freq: call.freq,
      encrypted: call.encrypted,
      emergency: call.emergency,
      has_audio: true,
      audio_path: call.audio_path,
      units: [],
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="space-y-4">
        <div className="flex h-64 items-center justify-center text-destructive">
          {error || 'Call not found'}
        </div>
        <div className="text-center">
          <Link to="/calls" className="text-primary hover:underline">
            ← Back to calls
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2">
            <Link to="/calls" className="text-sm text-muted-foreground hover:underline">
              ← Back to calls
            </Link>
          </div>
          <h1 className="text-2xl font-bold">
            {call.tg_sysid ? (
              <Link to={`/talkgroups/${call.tg_sysid}:${tgid}`} className="hover:underline">
                {getTalkgroupDisplayName(tgid, tgAlphaTag)}
              </Link>
            ) : (
              getTalkgroupDisplayName(tgid, tgAlphaTag)
            )}
          </h1>
          <p className="text-muted-foreground">{formatDateTime(call.start_time)}</p>
        </div>

        <Button
          size="lg"
          onClick={handlePlay}
          disabled={!call.audio_path}
        >
          {isCurrentlyPlaying && isPlaying ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              Playing
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Play Audio
            </>
          )}
        </Button>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {call.emergency && <Badge variant="destructive">EMERGENCY</Badge>}
        {call.encrypted && <Badge variant="secondary">ENCRYPTED</Badge>}
        {call.analog && <Badge variant="outline">Analog</Badge>}
        {call.phase2_tdma && <Badge variant="outline">Phase 2 TDMA</Badge>}
      </div>

      {/* Call info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-mono text-lg">{formatDuration(call.duration)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="font-mono">{formatFrequency(call.freq)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p>{formatDateTime(call.start_time)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Time</p>
                <p>{call.stop_time ? formatDateTime(call.stop_time) : 'Active'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Audio Type</p>
                <p className="capitalize">{call.audio_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Talkgroup ID</p>
                <p className="font-mono">{tgid || '—'}</p>
              </div>
            </div>

            {call.tr_call_id && (
              <div>
                <p className="text-sm text-muted-foreground">Call ID</p>
                <p className="font-mono text-xs">{call.tr_call_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signal Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Signal</p>
                <p className="font-mono">
                  {call.signal_db != null && call.signal_db < 900 ? `${call.signal_db.toFixed(1)} dB` : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Noise</p>
                <p className="font-mono">
                  {call.noise_db != null && call.noise_db < 900 ? `${call.noise_db.toFixed(1)} dB` : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="font-mono">{call.error_count ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Spikes</p>
                <p className="font-mono">{call.spike_count ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Freq Error</p>
                <p className="font-mono">{call.freq_error ?? 0} Hz</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Audio Size</p>
                <p className="font-mono">{call.audio_size ? (call.audio_size / 1024).toFixed(1) : '—'} KB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcription */}
      {transcription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Transcription</span>
              {transcription.confidence != null && (
                <Badge variant="outline" className="text-xs font-normal">
                  {(transcription.confidence * 100).toFixed(0)}% confidence
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Full text with color-coding */}
              <div className="rounded-lg bg-muted/50 p-4">
                {hasUnits && transcription.words && transcription.words.length > 0 ? (
                  <div className="text-lg leading-relaxed">
                    {(() => {
                      const elements: React.ReactNode[] = []
                      let lastWordEnd = 0

                      // Sort transmissions by position for inline display
                      const sortedTx = [...transmissions].sort((a, b) => {
                        const posA = (a.position != null && a.position >= 0) ? a.position : 0
                        const posB = (b.position != null && b.position >= 0) ? b.position : 0
                        return posA - posB
                      })

                      // Track which untranscribed transmissions we've shown
                      const shownUntranscribed = new Set<number>()

                      transcription.words.forEach((word, i) => {
                        // Before this word, show any untranscribed transmissions that occurred
                        for (const tx of sortedTx) {
                          if (shownUntranscribed.has(tx.id)) continue
                          if (transmissionsWithWords.has(tx.id)) continue

                          const txStart = (tx.position != null && tx.position >= 0) ? tx.position : 0
                          const txEnd = txStart + ((tx.duration != null && tx.duration > 0) ? tx.duration : 0)

                          // Show if this transmission ended before or during this word
                          if (txEnd <= word.end && txStart >= lastWordEnd) {
                            const color = getUnitColorByRid(tx.unit_rid, uniqueUnits)
                            const unitName = unitMap.get(tx.unit_rid)?.alpha_tag || `Unit ${tx.unit_rid}`
                            elements.push(
                              <span
                                key={`untx-${tx.id}`}
                                className={cn(
                                  "inline-flex items-center justify-center w-5 h-5 mx-0.5 rounded-full text-xs cursor-help",
                                  color?.bg,
                                  color?.text
                                )}
                                title={`${unitName} - no transcription (${txStart.toFixed(1)}s - ${txEnd.toFixed(1)}s)`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                  <line x1="4" y1="4" x2="20" y2="20" />
                                </svg>
                              </span>
                            )
                            shownUntranscribed.add(tx.id)
                          }
                        }

                        // Add the word
                        const speaker = findSpeaker(word.start, word.end, transmissions)
                        const color = speaker !== null ? getUnitColorByRid(speaker, uniqueUnits) : null
                        elements.push(
                          <span key={`word-${i}`}>
                            {i > 0 && ' '}
                            <span className={color?.text}>{word.word}</span>
                          </span>
                        )
                        lastWordEnd = word.end
                      })

                      return elements
                    })()}
                  </div>
                ) : (
                  <p className="text-lg leading-relaxed">{transcription.text}</p>
                )}
              </div>

              {/* Word-level timestamps */}
              {transcription.words && transcription.words.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Word Timeline
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {transcription.words.map((word, i) => {
                      const speaker = hasUnits ? findSpeaker(word.start, word.end, transmissions) : null
                      const color = speaker !== null ? getUnitColorByRid(speaker, uniqueUnits) : null
                      return (
                        <button
                          key={i}
                          className={cn(
                            "group relative rounded px-1.5 py-0.5 text-sm transition-colors hover:bg-primary hover:text-primary-foreground",
                            color ? `${color.bg} ${color.text}` : "bg-secondary"
                          )}
                          title={`${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s`}
                        >
                          {word.word}
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-popover px-1.5 py-0.5 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                            {word.start.toFixed(1)}s
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{transcription.word_count} words</span>
                {transcription.language && <span>Language: {transcription.language}</span>}
                {transcription.model && <span>Model: {transcription.model}</span>}
                {transcription.duration_ms != null && (
                  <span>Processed in {(transcription.duration_ms / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transmissions */}
      <Card>
        <CardHeader>
          <CardTitle>Transmissions ({transmissions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!transmissions || transmissions.length === 0 ? (
            <p className="text-muted-foreground">No transmission data available</p>
          ) : (
            <div className="space-y-2">
              {transmissions.map((tx, i) => {
                const unitColor = hasUnits ? getUnitColorByRid(tx.unit_rid, uniqueUnits) : null
                const txStart = (tx.position != null && tx.position >= 0) ? tx.position : 0
                // Find frequency active during this transmission
                const freq = frequencies.find(f => {
                  const fStart = (f.position != null && f.position >= 0) ? f.position : 0
                  const fEnd = fStart + ((f.duration != null && f.duration > 0) ? f.duration : 9999)
                  return txStart >= fStart && txStart < fEnd
                })
                return (
                  <div
                    key={tx.id || i}
                    className={cn(
                      "flex items-center justify-between rounded-lg border bg-card p-3",
                      unitColor?.border
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                        unitColor ? `${unitColor.bg} ${unitColor.text}` : "bg-primary/20 text-primary"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className={cn("font-medium", unitColor?.text)}>
                          {tx.unit_sysid ? (
                            <Link to={`/units/${tx.unit_sysid}:${tx.unit_rid}`} className="hover:underline">
                              {unitMap.get(tx.unit_rid)?.alpha_tag
                                ? unitMap.get(tx.unit_rid)!.alpha_tag
                                : getUnitDisplayName(tx.unit_rid)}
                            </Link>
                          ) : (
                            unitMap.get(tx.unit_rid)?.alpha_tag
                              ? unitMap.get(tx.unit_rid)!.alpha_tag
                              : getUnitDisplayName(tx.unit_rid)
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {freq?.freq ? formatFrequency(freq.freq) : ''}{freq?.freq ? ' • ' : ''}{txStart.toFixed(1)}s{tx.duration != null && tx.duration > 0 ? ` • ${formatDuration(tx.duration)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tx.emergency && (
                        <Badge variant="destructive">EMERG</Badge>
                      )}
                      {transcription && !transmissionsWithWords.has(tx.id) && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No transcript
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
