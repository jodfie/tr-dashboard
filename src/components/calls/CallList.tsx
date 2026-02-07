import { useMemo } from 'react'
import { CallCard } from './CallCard'
import type { RecentCallInfo, Call } from '@/api/types'

interface CallListProps {
  calls: (RecentCallInfo | Call)[]
  showSystem?: boolean
  compact?: boolean
  emptyMessage?: string
  deduplicate?: boolean
}

// Deduplicate calls by call_group_id or call_id, keeping the first occurrence
function deduplicateCalls(
  calls: (RecentCallInfo | Call)[]
): (RecentCallInfo | Call)[] {
  const seen = new Set<string | number>()
  return calls.filter((call) => {
    // Use call_group_id, then call_id
    const groupId = call.call_group_id ?? call.call_id
    if (groupId == null) return true  // Can't dedupe without an ID
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
