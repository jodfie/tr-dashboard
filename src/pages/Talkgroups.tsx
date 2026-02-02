import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { getTalkgroups, getSystems } from '@/api/client'
import type { Talkgroup, System } from '@/api/types'
import { useFilterStore } from '@/stores/useFilterStore'
import { useMonitorStore } from '@/stores/useMonitorStore'
import { useTalkgroupCache, talkgroupKey } from '@/stores/useTalkgroupCache'
import { getTalkgroupDisplayName, formatRelativeTime } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 30

export default function Talkgroups() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [talkgroups, setTalkgroups] = useState<Talkgroup[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

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

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('size') || String(DEFAULT_PAGE_SIZE), 10)
  const search = searchParams.get('search') || ''
  const sysidFilter = searchParams.get('sysid') || ''
  const sortBy = (searchParams.get('sort') as 'alpha_tag' | 'tgid' | 'last_seen' | 'call_count' | 'calls_1h' | 'calls_24h' | 'unit_count') || 'alpha_tag'
  const sortDir = (searchParams.get('dir') as 'asc' | 'desc') || 'asc'

  const offset = (page - 1) * pageSize

  // Fetch systems for filter
  useEffect(() => {
    getSystems().then((res) => setSystems(res.sites)).catch(console.error)
  }, [])

  // Fetch talkgroups
  useEffect(() => {
    setLoading(true)
    getTalkgroups({
      sysid: sysidFilter || undefined,
      search: search || undefined,
      sort: sortBy,
      sort_dir: sortDir,
      limit: pageSize,
      offset,
    })
      .then((res) => {
        const tgs = res.talkgroups || []
        setTalkgroups(tgs)
        setTotalCount(res.count || tgs.length)
        addTalkgroupsToCache(tgs)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, pageSize, search, sysidFilter, sortBy, sortDir, offset, addTalkgroupsToCache])

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {talkgroups.map((tg) => {
              const tgKey = talkgroupKey(tg.sysid, tg.tgid)
              const monitored = isMonitored(tg.sysid, tg.tgid)
              const favorite = isFavorite(tg.sysid, tg.tgid)

              return (
                <Card key={tgKey} className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <Link to={`/talkgroups/${tg.sysid}:${tg.tgid}`} className="flex-1">
                        <h3 className="font-semibold hover:underline">
                          {getTalkgroupDisplayName(tg.tgid, tg.alpha_tag)}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tg.group || 'Uncategorized'}
                        </p>
                      </Link>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleTalkgroupMonitor(tg.sysid, tg.tgid)}
                          className={`p-1 ${
                            monitored
                              ? 'text-live'
                              : 'text-muted-foreground hover:text-live'
                          }`}
                          title={
                            monitored
                              ? 'Stop monitoring'
                              : 'Monitor this talkgroup'
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill={monitored ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleFavoriteTalkgroup(tg.sysid, tg.tgid)}
                          className={`p-1 ${
                            favorite
                              ? 'text-primary'
                              : 'text-muted-foreground hover:text-primary'
                          }`}
                          title={
                            favorite
                              ? 'Remove from favorites'
                              : 'Add to favorites'
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill={favorite ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {tg.tgid}
                      </Badge>
                      {tg.tag && <Badge variant="secondary">{tg.tag}</Badge>}
                      {tg.mode === 'D' && (
                        <Badge variant="outline" className="text-xs">
                          Digital
                        </Badge>
                      )}
                      {tg.mode === 'A' && (
                        <Badge variant="outline" className="text-xs">
                          Analog
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">{tg.call_count?.toLocaleString() ?? '—'}</span> calls
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{tg.unit_count?.toLocaleString() ?? '—'}</span> units
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{tg.calls_1h ?? '—'}</span> /1h
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{tg.calls_24h?.toLocaleString() ?? '—'}</span> /24h
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Last active: {formatRelativeTime(tg.last_seen)}
                    </p>
                  </CardContent>
                </Card>
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
    </div>
  )
}
