import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { getUnits, getActiveUnits, getSystems } from '@/api/client'
import type { Unit, System } from '@/api/types'
import { getUnitDisplayName, formatRelativeTime, getEventTypeLabel } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 50

// Helper to create unit key for links
function unitKey(sysid: string, unit_id: number): string {
  return `${sysid}:${unit_id}`
}

export default function Units() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [units, setUnits] = useState<Unit[]>([])
  const [systems, setSystems] = useState<System[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [activeView, setActiveView] = useState(searchParams.get('view') === 'active')

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('size') || String(DEFAULT_PAGE_SIZE), 10)
  const search = searchParams.get('search') || ''
  const sysidFilter = searchParams.get('sysid') || ''
  const sortBy = (searchParams.get('sort') as 'alpha_tag' | 'unit_id' | 'last_seen') || 'last_seen'
  const sortDir = (searchParams.get('dir') as 'asc' | 'desc') || 'desc'

  const offset = (page - 1) * pageSize

  // Fetch systems for filter
  useEffect(() => {
    getSystems().then((res) => setSystems(res.sites)).catch(console.error)
  }, [])

  // Fetch units
  useEffect(() => {
    setLoading(true)

    const fetchFn = activeView
      ? () =>
          getActiveUnits({
            window: 10,
            sysid: sysidFilter || undefined,
            sort: sortBy,
            sort_dir: sortDir,
            limit: pageSize,
            offset,
          })
      : () =>
          getUnits({
            sysid: sysidFilter || undefined,
            search: search || undefined,
            sort: sortBy,
            sort_dir: sortDir,
            limit: pageSize,
            offset,
          })

    fetchFn()
      .then((res) => {
        setUnits(res.units || [])
        setTotalCount(res.count)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, pageSize, search, sysidFilter, sortBy, sortDir, offset, activeView])

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

  const toggleView = () => {
    const newParams = new URLSearchParams(searchParams)
    if (activeView) {
      newParams.delete('view')
    } else {
      newParams.set('view', 'active')
    }
    newParams.set('page', '1')
    setSearchParams(newParams)
    setActiveView(!activeView)
  }

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
        <h1 className="text-2xl font-bold">Units</h1>
        <p className="text-muted-foreground">Browse radio units</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={activeView ? 'outline' : 'default'}
                size="sm"
                onClick={toggleView}
              >
                All Units
              </Button>
              <Button
                variant={activeView ? 'default' : 'outline'}
                size="sm"
                onClick={toggleView}
              >
                Active Now
              </Button>
            </div>

            {!activeView && (
              <div className="flex-1">
                <Input
                  placeholder="Search units..."
                  value={search}
                  onChange={(e) => updateParam('search', e.target.value)}
                />
              </div>
            )}

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
              <option value="last_seen:desc">Recently Active</option>
              <option value="alpha_tag:asc">Name (A-Z)</option>
              <option value="alpha_tag:desc">Name (Z-A)</option>
              <option value="unit_id:asc">Unit ID (Low-High)</option>
              <option value="unit_id:desc">Unit ID (High-Low)</option>
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
        pageSizeOptions={[50, 100, 200]}
      />

      {/* Results */}
      <div>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Loading...
          </div>
        ) : units.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No units found
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {units.map((unit) => (
              <Card key={unitKey(unit.sysid, unit.unit_id)} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <Link to={`/units/${unit.sysid}:${unit.unit_id}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold hover:underline">
                        {getUnitDisplayName(unit.unit_id, unit.alpha_tag)}
                      </h3>
                      <Badge variant="outline" className="font-mono">
                        {unit.unit_id}
                      </Badge>
                    </div>

                    {unit.last_event_type && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getEventTypeLabel(unit.last_event_type)}
                        </Badge>
                        {unit.last_event_tg_tag && (
                          <span className="text-sm text-muted-foreground">
                            {unit.last_event_tg_tag}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      Last seen: {formatRelativeTime(unit.last_seen || '')}
                    </p>

                    {unit.alpha_tag_source && (
                      <p className="text-xs text-muted-foreground">
                        Source: {unit.alpha_tag_source}
                      </p>
                    )}
                  </Link>
                </CardContent>
              </Card>
            ))}
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
        pageSizeOptions={[50, 100, 200]}
      />
    </div>
  )
}
