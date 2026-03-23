# Investigate Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a time-based investigation page that visualizes radio call activity across all talkgroups as a horizontal timeline, enabling users to quickly understand what happened at a specific time.

**Architecture:** New `/investigate` route with a page component that fetches calls for a time window and renders them as positioned blocks on a CSS-grid timeline. Talkgroup rows are sorted by activity. Calls are clickable for inline playback and expandable for detail. Real-time SSE events update the timeline when viewing "now".

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand (useAudioStore, useRealtimeStore, useTalkgroupColors, useTranscriptionCache), react-hotkeys-hook, React Router v7

**Spec:** `docs/superpowers/specs/2026-03-23-investigate-timeline-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/Investigate.tsx` | Create | Page component: URL state, controls, data fetching, layout |
| `src/components/investigate/Timeline.tsx` | Create | Time axis ruler + talkgroup rows container |
| ~~`src/components/investigate/CallBlock.tsx`~~ | *(collapsed into Timeline.tsx)* | Call block rendering is inlined in Timeline.tsx for simplicity — extract later if needed |
| `src/components/investigate/DetailPanel.tsx` | Create | Expandable panel: call info, transcription, units |
| `src/App.tsx` | Modify | Add route |
| `src/components/layout/Sidebar.tsx` | Modify | Add nav item |
| `src/components/command/CommandPalette.tsx` | Modify | Add command |
| `src/components/command/GoToMenu.tsx` | Modify | Add navigation option |
| `src/lib/constants.ts` | Modify | Add keyboard shortcut |

---

### Task 1: Route, Navigation, and Page Skeleton

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/constants.ts`
- Modify: `src/components/command/GoToMenu.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/command/CommandPalette.tsx`
- Create: `src/pages/Investigate.tsx`

- [ ] **Step 1: Add keyboard shortcut constant**

In `src/lib/constants.ts`, add to the `KEYBOARD_SHORTCUTS` object:

```typescript
GO_TO_INVESTIGATE: 'g>i',
```

- [ ] **Step 2: Add GoToMenu navigation option**

In `src/components/command/GoToMenu.tsx`, add to `NAVIGATION_OPTIONS` array:

```typescript
{ key: 'I', label: 'Investigate', path: '/investigate' },
```

- [ ] **Step 3: Add sidebar nav item**

In `src/components/layout/Sidebar.tsx`, add to the `navItems` array (after Systems, before Settings):

```typescript
{
  label: 'Investigate',
  path: '/investigate',
  icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
},
```

- [ ] **Step 4: Add command palette entry**

In `src/components/command/CommandPalette.tsx`, add a `<Command.Item>` in the Navigation group:

```tsx
<Command.Item
  value="go-to-investigate"
  onSelect={() => runCommand(() => navigate('/investigate'))}
  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  <span>Go to Investigate</span>
  <kbd className="ml-auto text-xs text-muted-foreground">g i</kbd>
</Command.Item>
```

- [ ] **Step 5: Create page skeleton**

Create `src/pages/Investigate.tsx` with a minimal placeholder:

```tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function Investigate() {
  const [searchParams] = useSearchParams()
  const targetTime = searchParams.get('t') || new Date().toISOString()
  const windowMin = parseInt(searchParams.get('window') || '15', 10)
  const keyword = searchParams.get('q') || ''

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Investigate</h1>
      <p className="text-muted-foreground">
        Centered on {new Date(targetTime).toLocaleString()} · ±{windowMin}m
        {keyword && ` · "${keyword}"`}
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Add route**

In `src/App.tsx`, add import and route inside `RequireAuth`/`MainLayout`:

```tsx
import Investigate from '@/pages/Investigate'
// ...
<Route path="/investigate" element={<Investigate />} />
```

- [ ] **Step 7: Type-check and commit**

Run: `npm run lint`
Expected: no errors

```bash
git add src/pages/Investigate.tsx src/App.tsx src/lib/constants.ts src/components/command/GoToMenu.tsx src/components/layout/Sidebar.tsx src/components/command/CommandPalette.tsx
git commit -m "feat: add investigate page skeleton with route and navigation"
```

---

### Task 2: Entry Controls and Data Fetching

**Files:**
- Modify: `src/pages/Investigate.tsx`

- [ ] **Step 1: Add URL state management**

Replace the page skeleton with full state management. The page reads `t`, `window`, and `q` from URL search params and computes `windowStart`/`windowEnd`:

```tsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCalls, searchTranscriptions } from '@/api/client'
import type { Call } from '@/api/types'

const WINDOW_PRESETS = [5, 15, 30, 60] as const

export default function Investigate() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [matchingCallIds, setMatchingCallIds] = useState<Set<number> | null>(null)

  // URL-driven state
  const targetTime = searchParams.get('t') || new Date().toISOString()
  const windowMin = parseInt(searchParams.get('window') || '15', 10)
  const keyword = searchParams.get('q') || ''

  const { windowStart, windowEnd } = useMemo(() => {
    const center = new Date(targetTime).getTime()
    return {
      windowStart: new Date(center - windowMin * 60 * 1000).toISOString(),
      windowEnd: new Date(center + windowMin * 60 * 1000).toISOString(),
    }
  }, [targetTime, windowMin])

  const updateParams = useCallback((updates: Record<string, string>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setTargetTime = (t: string) => updateParams({ t })
  const setWindow = (w: number) => updateParams({ window: String(w) })
  const setKeyword = (q: string) => updateParams({ q })
  const jumpToNow = () => updateParams({ t: new Date().toISOString() })
```

- [ ] **Step 2: Add data fetching effect**

Add the fetch logic with debounce, truncation detection, and keyword intersection:

```tsx
  // Fetch calls for current window
  useEffect(() => {
    setLoading(true)
    const timeout = setTimeout(() => {
      const fetchData = async () => {
        try {
          const callRes = await getCalls({
            start_time: windowStart,
            end_time: windowEnd,
            limit: 500,
            sort: '-start_time',
          })
          setCalls(callRes.calls)
          setTotalCount(callRes.total)

          // Keyword filter via transcription search
          if (keyword.trim()) {
            const txRes = await searchTranscriptions(keyword.trim(), {
              start_time: windowStart,
              end_time: windowEnd,
              limit: 500,
            })
            setMatchingCallIds(new Set(txRes.results.map(r => r.call_id)))
          } else {
            setMatchingCallIds(null)
          }
        } catch (err) {
          console.error('Investigate fetch error:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }, 300) // debounce

    return () => clearTimeout(timeout)
  }, [windowStart, windowEnd, keyword])
```

- [ ] **Step 3: Add controls UI**

Add the entry controls bar and summary label:

```tsx
  // Filter calls by keyword match
  const filteredCalls = useMemo(() => {
    if (!matchingCallIds) return calls
    return calls.filter(c => matchingCallIds.has(c.call_id))
  }, [calls, matchingCallIds])

  // Group by talkgroup, sorted by count desc
  const talkgroupGroups = useMemo(() => {
    const groups = new Map<string, { tgKey: string; tgName: string; systemId: number; tgid: number; calls: Call[] }>()
    for (const call of filteredCalls) {
      const key = `${call.system_id}:${call.tgid}`
      if (!groups.has(key)) {
        groups.set(key, {
          tgKey: key,
          tgName: call.tg_alpha_tag || `TG ${call.tgid}`,
          systemId: call.system_id,
          tgid: call.tgid,
          calls: [],
        })
      }
      groups.get(key)!.calls.push(call)
    }
    return [...groups.values()].sort((a, b) => b.calls.length - a.calls.length)
  }, [filteredCalls])

  const isTruncated = totalCount > calls.length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="datetime-local"
          value={targetTime.slice(0, 16)}
          onChange={(e) => setTargetTime(new Date(e.target.value).toISOString())}
          className="bg-background border border-border rounded px-2 py-1 text-sm font-mono"
        />
        <Button variant="outline" size="sm" onClick={jumpToNow}>Now</Button>

        <div className="flex gap-1">
          {WINDOW_PRESETS.map(w => (
            <Button
              key={w}
              variant={windowMin === w ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWindow(w)}
            >
              ±{w}m
            </Button>
          ))}
        </div>

        <Input
          placeholder="Filter by keyword..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Summary + truncation warning */}
      <div className="text-sm text-muted-foreground">
        Showing {new Date(windowStart).toLocaleTimeString()} – {new Date(windowEnd).toLocaleTimeString()}
        {' · '}{filteredCalls.length} calls across {talkgroupGroups.length} talkgroups
        {loading && ' · Loading...'}
      </div>
      {isTruncated && (
        <div className="text-sm text-amber-400 bg-amber-950/20 border border-amber-700/30 rounded px-3 py-2">
          Showing {calls.length} of {totalCount} calls — narrow your window for complete results
        </div>
      )}

      {/* Timeline placeholder */}
      <div className="text-muted-foreground text-sm">
        {talkgroupGroups.length === 0 && !loading
          ? (keyword ? `No calls matching "${keyword}" in this window` : 'No calls in this window')
          : `${talkgroupGroups.length} talkgroup rows ready for timeline`
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check and commit**

Run: `npm run lint`
Expected: no errors

```bash
git add src/pages/Investigate.tsx
git commit -m "feat: add investigate page controls and data fetching"
```

---

### Task 3: Timeline Component

**Files:**
- Create: `src/components/investigate/Timeline.tsx`
- Modify: `src/pages/Investigate.tsx`

- [ ] **Step 1: Create Timeline component**

Create `src/components/investigate/Timeline.tsx`. This renders the time axis ruler and talkgroup rows:

```tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Call } from '@/api/types'
import { useTalkgroupColors } from '@/stores/useTalkgroupColors'
import { cn } from '@/lib/utils'

interface TalkgroupGroup {
  tgKey: string
  tgName: string
  systemId: number
  tgid: number
  calls: Call[]
}

interface TimelineProps {
  groups: TalkgroupGroup[]
  windowStart: string
  windowEnd: string
  selectedCallId: number | null
  expandedCallId: number | null
  onCallClick: (call: Call) => void
  onCallExpand: (call: Call) => void
  renderDetailPanel?: (call: Call) => React.ReactNode
}

function getTickInterval(windowMinutes: number): number {
  if (windowMinutes <= 10) return 1
  if (windowMinutes <= 30) return 5
  return 10
}

export function Timeline({
  groups, windowStart, windowEnd,
  selectedCallId, expandedCallId,
  onCallClick, onCallExpand, renderDetailPanel,
}: TimelineProps) {
  const getCachedColor = useTalkgroupColors((s) => s.getCachedColor)
  const startMs = new Date(windowStart).getTime()
  const endMs = new Date(windowEnd).getTime()
  const durationMs = endMs - startMs
  const windowMinutes = durationMs / 60000

  // Time axis ticks
  const ticks = useMemo(() => {
    const interval = getTickInterval(windowMinutes)
    const result: { pct: number; label: string }[] = []
    const firstTick = new Date(windowStart)
    firstTick.setSeconds(0, 0)
    firstTick.setMinutes(Math.ceil(firstTick.getMinutes() / interval) * interval)

    let t = firstTick.getTime()
    while (t <= endMs) {
      const pct = ((t - startMs) / durationMs) * 100
      if (pct >= 0 && pct <= 100) {
        result.push({
          pct,
          label: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })
      }
      t += interval * 60 * 1000
    }
    return result
  }, [windowStart, endMs, startMs, durationMs, windowMinutes])

  // Now marker
  const nowMs = Date.now()
  const nowPct = nowMs >= startMs && nowMs <= endMs
    ? ((nowMs - startMs) / durationMs) * 100
    : null

  if (groups.length === 0) return null

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      {/* Time axis */}
      <div className="relative h-8 bg-zinc-900/40 border-b border-border/30" style={{ marginLeft: '180px' }}>
        {ticks.map((tick, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex flex-col items-center"
            style={{ left: `${tick.pct}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-px h-2 bg-border/60" />
            <span className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{tick.label}</span>
          </div>
        ))}
        {nowPct !== null && (
          <div
            className="absolute top-0 h-full w-px bg-primary/60 z-10"
            style={{ left: `${nowPct}%` }}
            title="Now"
          >
            <div className="absolute -top-0 left-1 text-[9px] text-primary font-mono">NOW</div>
          </div>
        )}
      </div>

      {/* Talkgroup rows */}
      {groups.map((group) => {
        const tgColor = getCachedColor(group.systemId, group.tgid, {
          alpha_tag: group.tgName,
          system_id: group.systemId,
          tgid: group.tgid,
        })
        const expandedCall = group.calls.find(c => c.call_id === expandedCallId)

        return (
          <div key={group.tgKey}>
            <div className="flex border-b border-border/20 hover:bg-muted/10">
              {/* TG label */}
              <div className="w-[180px] shrink-0 px-3 py-1.5 flex items-center">
                <Link
                  to={`/talkgroups/${group.tgKey}`}
                  className={cn("text-sm truncate hover:underline", !tgColor && "text-sky-400")}
                  style={tgColor ? { color: tgColor } : undefined}
                  title={group.tgName}
                >
                  {group.tgName}
                </Link>
                <span className="text-[10px] text-muted-foreground/50 ml-1.5 shrink-0">
                  {group.calls.length}
                </span>
              </div>

              {/* Call blocks area */}
              <div className="flex-1 relative h-10">
                {group.calls.map((call) => {
                  const callStart = new Date(call.start_time).getTime()
                  const callEnd = call.stop_time
                    ? new Date(call.stop_time).getTime()
                    : callStart + (call.duration ?? 0) * 1000
                  const leftPct = Math.max(0, ((callStart - startMs) / durationMs) * 100)
                  const widthPct = Math.max(0.3, ((callEnd - callStart) / durationMs) * 100)
                  const isSelected = call.call_id === selectedCallId
                  const isExpanded = call.call_id === expandedCallId

                  return (
                    <div
                      key={call.call_id}
                      className={cn(
                        "absolute top-1 bottom-1 rounded-sm cursor-pointer transition-all",
                        "hover:brightness-125 hover:z-10",
                        call.emergency ? "ring-1 ring-red-500" : "",
                        call.encrypted ? "opacity-50" : "",
                        isSelected ? "ring-2 ring-primary animate-pulse" : "",
                        isExpanded ? "ring-2 ring-amber-500" : "",
                      )}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        minWidth: '4px',
                        backgroundColor: tgColor || '#38bdf8',
                      }}
                      onClick={() => onCallClick(call)}
                      onDoubleClick={() => onCallExpand(call)}
                      title={`${new Date(call.start_time).toLocaleTimeString()} · ${call.duration ? Math.round(call.duration) + 's' : '?'} · ${call.src_list?.length ?? 0} units`}
                    />
                  )
                })}

                {/* Now marker line continues through rows */}
                {nowPct !== null && (
                  <div
                    className="absolute top-0 h-full w-px bg-primary/30 pointer-events-none"
                    style={{ left: `${nowPct}%` }}
                  />
                )}
              </div>
            </div>

            {/* Detail panel (rendered below the row) */}
            {expandedCall && renderDetailPanel?.(expandedCall)}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Wire Timeline into Investigate page**

In `src/pages/Investigate.tsx`, import and render the Timeline, add selection/expansion state:

Add state:
```tsx
const [selectedCallId, setSelectedCallId] = useState<number | null>(null)
const [expandedCallId, setExpandedCallId] = useState<number | null>(null)

const loadCall = useAudioStore((s) => s.loadCall)
const currentCall = useAudioStore((s) => s.currentCall)
```

Add imports for `useAudioStore` and `Timeline`. Add handlers:
```tsx
const handleCallClick = useCallback((call: Call) => {
  setSelectedCallId(call.call_id)
  if (call.audio_url) loadCall(call)
}, [loadCall])

const handleCallExpand = useCallback((call: Call) => {
  setExpandedCallId(prev => prev === call.call_id ? null : call.call_id)
}, [])
```

Replace the timeline placeholder with:
```tsx
<Timeline
  groups={talkgroupGroups}
  windowStart={windowStart}
  windowEnd={windowEnd}
  selectedCallId={currentCall?.callId ?? selectedCallId}
  expandedCallId={expandedCallId}
  onCallClick={handleCallClick}
  onCallExpand={handleCallExpand}
/>
```

- [ ] **Step 3: Type-check and commit**

Run: `npm run lint`
Expected: no errors

```bash
git add src/components/investigate/Timeline.tsx src/pages/Investigate.tsx
git commit -m "feat: add timeline visualization with talkgroup rows and call blocks"
```

---

### Task 4: Detail Panel

**Files:**
- Create: `src/components/investigate/DetailPanel.tsx`
- Modify: `src/pages/Investigate.tsx`

- [ ] **Step 1: Create DetailPanel component**

Create `src/components/investigate/DetailPanel.tsx`:

```tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { Call } from '@/api/types'
import { useTranscriptionCache } from '@/stores/useTranscriptionCache'
import { TranscriptionPreview } from '@/components/calls/TranscriptionPreview'
import { formatDateTime, formatDuration, formatFrequency } from '@/lib/utils'

interface DetailPanelProps {
  call: Call
}

export function DetailPanel({ call }: DetailPanelProps) {
  const fetchTranscription = useTranscriptionCache((s) => s.fetchTranscription)

  useEffect(() => {
    if (call.has_transcription) {
      fetchTranscription(call.call_id)
    }
  }, [call.call_id, call.has_transcription, fetchTranscription])

  return (
    <div className="bg-zinc-900/60 border-b border-border/30 px-4 py-3 ml-[180px] animate-in slide-in-from-top-1 duration-150">
      <div className="flex gap-6">
        {/* Call info */}
        <div className="space-y-1 text-sm shrink-0">
          <div className="font-medium">{formatDateTime(call.start_time)}</div>
          <div className="text-muted-foreground">
            {call.duration ? formatDuration(call.duration) : '—'}
            {call.freq && ` · ${formatFrequency(call.freq)}`}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {call.emergency && <Badge variant="destructive" className="text-[10px]">EMERGENCY</Badge>}
            {call.encrypted && <Badge variant="secondary" className="text-[10px]">ENCRYPTED</Badge>}
          </div>
        </div>

        {/* Transcription */}
        <div className="flex-1 min-w-0">
          {call.has_transcription ? (
            <TranscriptionPreview callId={call.call_id} full />
          ) : (
            <span className="text-sm text-muted-foreground/50">No transcription</span>
          )}
        </div>

        {/* Units */}
        <div className="shrink-0 space-y-1">
          {call.src_list && call.src_list.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[10px] text-muted-foreground uppercase">Units</div>
              {call.src_list.slice(0, 5).map((tx, i) => (
                <Link
                  key={i}
                  to={`/units/${call.system_id}:${tx.src}`}
                  className="block text-xs text-amber-400 hover:underline"
                >
                  {tx.tag || `Unit ${tx.src}`}
                </Link>
              ))}
              {call.src_list.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{call.src_list.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-2 pt-2 border-t border-border/20">
        <Link to={`/calls/${call.call_id}`} className="text-xs text-primary hover:underline">
          Open full detail →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire DetailPanel into Investigate page**

In `src/pages/Investigate.tsx`, import `DetailPanel` and pass it as `renderDetailPanel`:

```tsx
import { DetailPanel } from '@/components/investigate/DetailPanel'

// In the Timeline props:
renderDetailPanel={(call) => <DetailPanel call={call} />}
```

- [ ] **Step 3: Type-check and commit**

Run: `npm run lint`
Expected: no errors

```bash
git add src/components/investigate/DetailPanel.tsx src/pages/Investigate.tsx
git commit -m "feat: add expandable detail panel with transcription and units"
```

---

### Task 5: Keyboard Shortcuts and Live Updates

**Files:**
- Modify: `src/pages/Investigate.tsx`

- [ ] **Step 1: Add keyboard shortcuts**

Add `useHotkeys` from `react-hotkeys-hook` to the page. **Important:** This project uses react-hotkeys-hook v5 which takes an options object as the third argument (not a dependency array). Use `useCallback` for handlers that close over state:

```tsx
import { useHotkeys } from 'react-hotkeys-hook'

// Pan left/right by 25% of window
const handlePanLeft = useCallback(() => {
  const shift = windowMin * 60 * 1000 * 0.5 // 25% of full window (which is ±windowMin)
  setTargetTime(new Date(new Date(targetTime).getTime() - shift).toISOString())
}, [targetTime, windowMin, setTargetTime])

const handlePanRight = useCallback(() => {
  const shift = windowMin * 60 * 1000 * 0.5
  setTargetTime(new Date(new Date(targetTime).getTime() + shift).toISOString())
}, [targetTime, windowMin, setTargetTime])

const handleZoomIn = useCallback(() => {
  const idx = WINDOW_PRESETS.indexOf(windowMin as typeof WINDOW_PRESETS[number])
  if (idx > 0) setWindow(WINDOW_PRESETS[idx - 1])
}, [windowMin, setWindow])

const handleZoomOut = useCallback(() => {
  const idx = WINDOW_PRESETS.indexOf(windowMin as typeof WINDOW_PRESETS[number])
  if (idx < WINDOW_PRESETS.length - 1) setWindow(WINDOW_PRESETS[idx + 1])
}, [windowMin, setWindow])

const handlePlaySelected = useCallback(() => {
  if (selectedCallId !== null) {
    const call = allCalls.find(c => c.call_id === selectedCallId)
    if (call) loadCall(call)
  }
}, [selectedCallId, allCalls, loadCall])

useHotkeys('left', handlePanLeft, { preventDefault: true })
useHotkeys('right', handlePanRight, { preventDefault: true })
useHotkeys('equal', handleZoomIn) // + key
useHotkeys('minus', handleZoomOut)
useHotkeys('enter', handlePlaySelected) // Play/pause selected call (Space is global audio)
useHotkeys('n', jumpToNow)
useHotkeys('escape', () => setExpandedCallId(null))
```

- [ ] **Step 2: Add live SSE updates**

When the window includes "now", merge active calls from the realtime store:

```tsx
const activeCalls = useRealtimeStore((s) => s.activeCalls)

// Merge live calls into the timeline
const allCalls = useMemo(() => {
  const nowMs = Date.now()
  const startMs = new Date(windowStart).getTime()
  const endMs = new Date(windowEnd).getTime()

  if (nowMs < startMs || nowMs > endMs) return filteredCalls

  // Add active calls that aren't already in the fetched set
  const fetchedIds = new Set(filteredCalls.map(c => c.call_id))
  const liveCalls = Array.from(activeCalls.values()).filter(
    c => !fetchedIds.has(c.call_id) && c.start_time &&
      new Date(c.start_time).getTime() >= startMs
  )
  return [...filteredCalls, ...liveCalls]
}, [filteredCalls, activeCalls, windowStart, windowEnd])
```

Update `talkgroupGroups` memo to iterate `allCalls` instead of `filteredCalls`:

```tsx
  const talkgroupGroups = useMemo(() => {
    const groups = new Map<string, { tgKey: string; tgName: string; systemId: number; tgid: number; calls: Call[] }>()
    for (const call of allCalls) {  // <-- changed from filteredCalls
      const key = `${call.system_id}:${call.tgid}`
      if (!groups.has(key)) {
        groups.set(key, {
          tgKey: key,
          tgName: call.tg_alpha_tag || `TG ${call.tgid}`,
          systemId: call.system_id,
          tgid: call.tgid,
          calls: [],
        })
      }
      groups.get(key)!.calls.push(call)
    }
    return [...groups.values()].sort((a, b) => b.calls.length - a.calls.length)
  }, [allCalls])  // <-- changed from filteredCalls
```

Note: `isTruncated` must stay based on REST `calls.length` vs `totalCount`, NOT `allCalls.length`, since live calls inflate the count.

- [ ] **Step 3: Type-check and commit**

Run: `npm run lint`
Expected: no errors

```bash
git add src/pages/Investigate.tsx
git commit -m "feat: add keyboard shortcuts and live SSE updates to investigate timeline"
```

---

### Task 6: Polish and Final Integration

**Files:**
- Modify: `src/pages/Investigate.tsx`
- Modify: `src/components/investigate/Timeline.tsx`

- [ ] **Step 1: Add pan/zoom buttons for non-keyboard users**

Add previous/next buttons flanking the time picker:

```tsx
<div className="flex items-center gap-1">
  <Button variant="ghost" size="sm" onClick={() => {
    const shift = windowMin * 60 * 1000 * 0.5
    setTargetTime(new Date(new Date(targetTime).getTime() - shift).toISOString())
  }}>←</Button>
  <input type="datetime-local" ... />
  <Button variant="ghost" size="sm" onClick={() => {
    const shift = windowMin * 60 * 1000 * 0.5
    setTargetTime(new Date(new Date(targetTime).getTime() + shift).toISOString())
  }}>→</Button>
</div>
```

- [ ] **Step 2: Add empty state and loading states**

Add a loading skeleton while data fetches:

```tsx
{loading && talkgroupGroups.length === 0 && (
  <div className="flex items-center justify-center h-32 text-muted-foreground">
    Loading calls...
  </div>
)}
{!loading && talkgroupGroups.length === 0 && (
  <div className="flex items-center justify-center h-32 text-muted-foreground">
    {keyword ? `No calls matching "${keyword}" in this window` : 'No calls in this window'}
  </div>
)}
```

- [ ] **Step 3: Final type-check, build, and commit**

Run: `npm run lint && npm run build`
Expected: no errors, successful build

```bash
git add -A
git commit -m "feat: polish investigate timeline with pan buttons, loading states, empty states"
```

---

## Completion Checklist

After all tasks are done:

- [ ] `/investigate` route works and shows timeline
- [ ] Time picker, window selector, keyword filter all work
- [ ] Call blocks are positioned correctly on the time axis
- [ ] Click plays inline, double-click expands detail panel
- [ ] Detail panel shows transcription, units, link to full detail
- [ ] Keyboard shortcuts work (arrows, +/-, Enter, N, Escape)
- [ ] Live SSE updates show when window includes "now"
- [ ] Truncation warning shows when >500 calls
- [ ] Sidebar, command palette, and Go To menu all navigate to Investigate
- [ ] `npm run lint` and `npm run build` pass
