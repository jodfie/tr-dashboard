import { useMemo } from 'react'
import { CallCard } from './CallCard'
import type { Call } from '@/api/types'

interface CallListProps {
  calls: Call[]
  showSystem?: boolean
  compact?: boolean
  emptyMessage?: string
  deduplicate?: boolean
}

// Deduplicate calls by call_group_id or call_id, keeping the first occurrence
function deduplicateCalls(calls: Call[]): Call[] {
  const seen = new Set<number>()
  return calls.filter((call) => {
    const groupId = call.call_group_id ?? call.call_id
    if (groupId == null) return true
    if (seen.has(groupId)) {
      return false
    }
    seen.add(groupId)
    return true
  })
}

export function CallList({
  calls,
  showSystem = true,
  compact = false,
  emptyMessage = 'No calls found',
  deduplicate = true,
}: CallListProps) {
  const displayCalls = useMemo(
    () => (deduplicate ? deduplicateCalls(calls) : calls),
    [calls, deduplicate]
  )

  if (displayCalls.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {displayCalls.map((call) => (
        <CallCard
          key={call.call_id}
          call={call}
          showSystem={showSystem}
          compact={compact}
        />
      ))}
    </div>
  )
}
