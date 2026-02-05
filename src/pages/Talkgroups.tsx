import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { getTalkgroups, getSystems } from '@/api/client'
import type { Talkgroup, System } from '@/api/types'
import { useFilterStore } from '@/stores/useFilterStore'
import { useMonitorStore } from '@/stores/useMonitorStore'
import { useRealtimeStore } from '@/stores/useRealtimeStore'
import { useTalkgroupCache, talkgroupKey } from '@/stores/useTalkgroupCache'
import { formatRelativeTime } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 30

// Color mapping for talkgroup tags/categories
function getTagColor(tag: string | undefined, group: string | undefined): string {
  const t = (tag || '').toLowerCase()
  const g = (group || '').toLowerCase()

  // Law enforcement - blue
  if (t.includes('law') || t.includes('police') || g.includes('law') || g.includes('police')) {
    return 'border-l-blue-500'
  }
  // Fire - red/orange
  if (t.includes('fire') || g.includes('fire')) {
    return 'border-l-red-500'
  }
  // EMS - green
  if (t.includes('ems') || t.includes('medical') || t.includes('hospital') || g.includes('ems') || g.includes('medical')) {
    return 'border-l-green-500'
  }
  // Dispatch (multi-agency) - purple
  if (t.includes('dispatch') || t.includes('interop') || t.includes('multi')) {
    return 'border-l-purple-500'
  }
  // Public works, transportation - amber
  if (t.includes('public') || t.includes('works') || t.includes('transport') || t.includes('highway') || g.includes('public') || g.includes('transport')) {
    return 'border-l-amber-500'
  }
  // Schools, security - cyan
  if (t.includes('school') || t.includes('security') || t.includes('campus') || g.includes('school')) {
    return 'border-l-cyan-500'
  }
  // Corrections - slate
  if (t.includes('corrections') || t.includes('jail') || t.includes('prison')) {
    return 'border-l-slate-500'
  }
  // Default - muted
  return 'border-l-muted-foreground/30'
}

export default function Talkgroups() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allTalkgroups, setAllTalkgroups] = useState<Talkgroup[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Subscribe to state to trigger re-renders, then get actions separately
  const favoriteTalkgroups = useFilterStore((s) => s.favoriteTalkgroups)
  const isFavorite = useFilterStore((s) => s.isFavorite)
  const toggleFavoriteTalkgroup = useFilterStore((s) => s.toggleFavoriteTalkgroup)
  const monitoredTalkgroups = useMonitorStore((s) => s.monitoredTalkgroups)
  const isMonitored = useMonitorStore((s) => s.isMonitored)
  const toggleTalkgroupMonitor = useMonitorStore((s) => s.toggleTalkgroupMonitor)
  // Force re-render when these change (the state subscriptions above handle this)
  void favoriteTalkgroups
  void monitoredTalkgroups
  const addTalkgroupsToCache = useTalkgroupCache((s) => s.addTalkgroups)

  // Subscribe to active calls for real-time highlighting
  const activeCalls = useRealtimeStore((s) => s.activeCalls)

  // Timer tick to update "recently active" badges (re-render every 5 seconds)
  const [, setTick] = useState(0)
  useEffect(() => {
    const hasRecentCalls = Array.from(activeCalls.values()).some(
      (call) => !call.isActive && call.endedAt && (Date.now() - call.endedAt) < 30000
    )
    if (!hasRecentCalls) return

    const interval = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(interval)
  }, [activeCalls])

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('size') || String(DEFAULT_PAGE_SIZE), 10)
  const search = searchParams.get('search') || ''
  const sysidFilter = searchParams.get('sysid') || ''
  const groupFilter = searchParams.get('group') || ''
  const tagFilter = searchParams.get('tag') || ''
  const sortBy = (searchParams.get('sort') as 'alpha_tag' | 'tgid' | 'last_seen' | 'call_count' | 'calls_1h' | 'calls_24h' | 'unit_count') || 'calls_24h'
  const sortDir = (searchParams.get('dir') as 'asc' | 'desc') || 'desc'

  const offset = (page - 1) * pageSize

  // Fetch systems for filter
  useEffect(() => {
    getSystems().then((res) => setSystems(res.sites)).catch(console.error)
  }, [])

  // Fetch all talkgroups once on mount (paginated to get all)
  useEffect(() => {
    setLoading(true)

    async function fetchAllTalkgroups() {
      const allTgs: Talkgroup[] = []
      const batchSize = 1000
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const res = await getTalkgroups({ limit: batchSize, offset })
        const tgs = res.talkgroups || []
        allTgs.push(...tgs)

        // If we got fewer than batchSize, we've reached the end
        if (tgs.length < batchSize) {
          hasMore = false
        } else {
          offset += batchSize
        }
      }

      return allTgs
    }

    fetchAllTalkgroups()
      .then((tgs) => {
        setAllTalkgroups(tgs)
        addTalkgroupsToCache(tgs)

        // Extract unique groups and tags for filters
        const groups = new Set<string>()
        const tags = new Set<string>()
        for (const tg of tgs) {
          if (tg.group) groups.add(tg.group)
          if (tg.tag) tags.add(tg.tag)
        }
        setAvailableGroups(Array.from(groups).sort())
        setAvailableTags(Array.from(tags).sort())
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [addTalkgroupsToCache])

  // Client-side filtering, sorting, and pagination
  const filteredAndSorted = (() => {
    let result = [...allTalkgroups]

    // Filter by system
    if (sysidFilter) {
      result = result.filter((tg) => tg.sysid === sysidFilter)
    }

    // Filter by group
    if (groupFilter) {
      result = result.filter((tg) => tg.group === groupFilter)
    }

    // Filter by tag
    if (tagFilter) {
      result = result.filter((tg) => tg.tag === tagFilter)
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter((tg) =>
        (tg.alpha_tag && tg.alpha_tag.toLowerCase().includes(searchLower)) ||
        (tg.description && tg.description.toLowerCase().includes(searchLower)) ||
        (tg.group && tg.group.toLowerCase().includes(searchLower)) ||
        (tg.tag && tg.tag.toLowerCase().includes(searchLower)) ||
        String(tg.tgid).includes(search)
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'alpha_tag':
          cmp = (a.alpha_tag || '').localeCompare(b.alpha_tag || '')
          break
        case 'tgid':
          cmp = a.tgid - b.tgid
          break
        case 'last_seen':
          cmp = new Date(a.last_seen || 0).getTime() - new Date(b.last_seen || 0).getTime()
          break
        case 'call_count':
          cmp = (a.call_count || 0) - (b.call_count || 0)
          break
        case 'calls_1h':
          cmp = (a.calls_1h || 0) - (b.calls_1h || 0)
          break
        case 'calls_24h':
          cmp = (a.calls_24h || 0) - (b.calls_24h || 0)
          break
        case 'unit_count':
          cmp = (a.unit_count || 0) - (b.unit_count || 0)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  })()

  const totalCount = filteredAndSorted.length
  const talkgroups = filteredAndSorted.slice(offset, offset + pageSize)

  const updateParam = useCallback(
    (key: string, value: string) => {
      const newParams = new URLSearchParams(searchParams)
      if (value) {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
      if (key !== 'page') {
        newParams.set('page', '1')
      }
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

  const goToPage = useCallback(
    (newPage: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(newPage))
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

  const changePageSize = useCallback(
    (newSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('size', String(newSize))
      newParams.set('page', '1')
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Talkgroups</h1>
        <p className="text-muted-foreground">Browse and monitor talkgroups</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search talkgroups..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
              />
            </div>

            <select
              value={sysidFilter}
              onChange={(e) => updateParam('sysid', e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All systems</option>
              {systems.map((sys) => (
                <option key={sys.id} value={sys.sysid || ''}>
                  {sys.short_name} {sys.sysid && `(${sys.sysid})`}
                </option>
              ))}
            </select>

            <select
              value={groupFilter}
              onChange={(e) => updateParam('group', e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All groups</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(e) => updateParam('tag', e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            <select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [sort, dir] = e.target.value.split(':')
                const newParams = new URLSearchParams(searchParams)
                newParams.set('sort', sort)
                newParams.set('dir', dir)
                newParams.set('page', '1')
                setSearchParams(newParams)
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="alpha_tag:asc">Name (A-Z)</option>
              <option value="alpha_tag:desc">Name (Z-A)</option>
              <option value="tgid:asc">TGID (Low-High)</option>
              <option value="tgid:desc">TGID (High-Low)</option>
              <option value="last_seen:desc">Recently Active</option>
              <option value="call_count:desc">Most Calls (Total)</option>
              <option value="calls_24h:desc">Most Calls (24h)</option>
              <option value="calls_1h:desc">Most Calls (1h)</option>
              <option value="unit_count:desc">Most Units</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Pagination - Top */}
      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
        pageSizeOptions={[30, 60, 90]}
      />

      {/* Results */}
      <div>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Loading...
          </div>
        ) : talkgroups.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No talkgroups found
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {talkgroups.map((tg) => {
              const tgKey = talkgroupKey(tg.sysid, tg.tgid)
              const monitored = isMonitored(tg.sysid, tg.tgid)
              const favorite = isFavorite(tg.sysid, tg.tgid)

              const tagColor = getTagColor(tg.tag, tg.group)

              // Check if this talkgroup has an active or recently ended call
              const activeCall = Array.from(activeCalls.values()).find(
                (call) => call.sysid === tg.sysid && call.talkgroup === tg.tgid
              )
              const hasActiveCall = activeCall?.isActive ?? false
              // Show "recent" badge for 30 seconds after call ends
              const isRecentlyActive = activeCall && !activeCall.isActive && activeCall.endedAt &&
                (Date.now() - activeCall.endedAt) < 30000

              const bgClass = hasActiveCall
                ? 'bg-live/15 ring-1 ring-live/50'
                : isRecentlyActive
                  ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                  : monitored
                    ? 'bg-live/5'
                    : favorite
                      ? 'bg-primary/5'
                      : 'bg-card'

              return (
                <div
                  key={tgKey}
                  className={`flex gap-2 rounded-md border border-l-4 ${tagColor} ${bgClass} p-2 hover:bg-accent/50 transition-colors ${hasActiveCall ? 'animate-pulse' : ''}`}
                >
                  {/* Action buttons - vertical on left */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => toggleTalkgroupMonitor(tg.sysid, tg.tgid)}
                      className={`p-0.5 rounded ${
                        monitored
                          ? 'text-live bg-live/10'
                          : 'text-muted-foreground hover:text-live'
                      }`}
                      title={monitored ? 'Stop monitoring' : 'Monitor'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={monitored ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleFavoriteTalkgroup(tg.sysid, tg.tgid)}
                      className={`p-0.5 rounded ${
                        favorite
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-primary'
                      }`}
                      title={favorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <Link to={`/talkgroups/${tg.sysid}:${tg.tgid}`} className="flex-1 min-w-0">
                    {/* Row 1: Name + TGID + mode + tag */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate hover:underline">
                        {tg.alpha_tag || `TG ${tg.tgid}`}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{tg.tgid}</span>
                      {tg.mode && <span className="text-xs text-muted-foreground shrink-0">{tg.mode}</span>}
                      {tg.tag && <span className="text-xs text-muted-foreground/70 shrink-0 ml-auto">{tg.tag}</span>}
                    </div>
                    {/* Row 2: Description */}
                    {tg.description && (
                      <div className="text-xs text-muted-foreground truncate">{tg.description}</div>
                    )}
                    {/* Row 3: Group */}
                    {tg.group && (
                      <div className="text-xs text-muted-foreground/70 truncate">{tg.group}</div>
                    )}
                    {/* Row 4: Stats + Live/Recent badges */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span><span className="text-foreground">{tg.calls_1h ?? 0}</span>/1h</span>
                      <span><span className="text-foreground">{tg.calls_24h ?? 0}</span>/24h</span>
                      <span><span className="text-foreground">{tg.unit_count ?? 0}</span>u</span>
                      <span className="text-muted-foreground/60">{formatRelativeTime(tg.last_seen)}</span>
                      {hasActiveCall && (
                        <span className="shrink-0 px-1 py-0.5 text-[10px] font-bold bg-live text-white rounded ml-auto">
                          LIVE
                        </span>
                      )}
                      {isRecentlyActive && (
                        <span className="shrink-0 px-1 py-0.5 text-[10px] font-medium bg-amber-500 text-white rounded ml-auto">
                          RECENT
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
        pageSizeOptions={[30, 60, 90]}
      />

      {/* Color Key */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" />Law</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" />Fire</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" />EMS</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500" />Dispatch</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" />Public Works</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-cyan-500" />Schools</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-500" />Corrections</span>
      </div>
    </div>
  )
}
