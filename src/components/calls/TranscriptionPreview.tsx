import { useMemo } from 'react'
import { useTranscriptionCache } from '@/stores/useTranscriptionCache'
import { getUnitColorByRid } from '@/lib/utils'
import type { AttributedWord } from '@/api/types'

interface TranscriptionPreviewProps {
  callId: number
  compact?: boolean
  full?: boolean // Show full text without truncation
  maxLines?: number // Limit to N lines with CSS line-clamp
}

// Note: This component does NOT auto-fetch transcriptions.
// Transcriptions are fetched on call detail page (explicit) or via cache.

export function TranscriptionPreview({ callId, compact = false, full = false, maxLines }: TranscriptionPreviewProps) {
  const entry = useTranscriptionCache((s) => s.getEntry(callId))

  const text = entry?.transcription?.text
  const words = entry?.transcription?.words?.words

  // Get unique unit src IDs in order of appearance from words
  const uniqueUnits = useMemo(() => {
    if (!words || words.length === 0) return []
    const seen = new Set<number>()
    const units: number[] = []
    for (const w of words) {
      if (w.src && !seen.has(w.src)) {
        seen.add(w.src)
        units.push(w.src)
      }
    }
    return units
  }, [words])

  // Show nothing while loading or if no transcription
  if (!entry || entry.status !== 'loaded' || !text) {
    return null
  }

  // Use line-clamp if maxLines specified, otherwise use character limits
  const useLineClamp = maxLines !== undefined
  const maxLength = full || useLineClamp ? Infinity : compact ? 80 : 150

  // Line clamp styles
  const lineClampStyle = useLineClamp ? {
    display: '-webkit-box',
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  } : undefined

  // If we have attributed words with unit info, render colored
  if (words && words.length > 0 && uniqueUnits.length > 1) {
    return (
      <ColoredTranscription
        words={words}
        uniqueUnits={uniqueUnits}
        maxLength={maxLength}
        lineClampStyle={lineClampStyle}
      />
    )
  }

  // Fallback to plain text display
  const displayText = !full && !useLineClamp && text.length > maxLength
    ? text.slice(0, maxLength).trim() + '...'
    : text

  return (
    <p
      className={`text-sm text-muted-foreground italic ${!full && !useLineClamp ? 'truncate' : ''}`}
      style={lineClampStyle}
    >
      {displayText}
    </p>
  )
}

function ColoredTranscription({
  words,
  uniqueUnits,
  maxLength,
  lineClampStyle,
}: {
  words: AttributedWord[]
  uniqueUnits: number[]
  maxLength: number
  lineClampStyle?: React.CSSProperties
}) {
  let charCount = 0
  const truncatedWords: AttributedWord[] = []
  let truncated = false

  for (const w of words) {
    if (charCount + w.word.length + 1 > maxLength) {
      truncated = true
      break
    }
    truncatedWords.push(w)
    charCount += w.word.length + 1
  }

  return (
    <p className="text-sm text-muted-foreground italic" style={lineClampStyle}>
      {truncatedWords.map((w, i) => {
        const color = w.src
          ? getUnitColorByRid(w.src, uniqueUnits)
          : null
        return (
          <span key={i}>
            {i > 0 && ' '}
            <span className={color?.text}>
              {w.word}
            </span>
          </span>
        )
      })}
      {truncated && '...'}
    </p>
  )
}
