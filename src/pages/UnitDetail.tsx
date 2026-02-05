import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CallList } from '@/components/calls/CallList'
import { getUnit, getUnitEvents, getUnitCalls } from '@/api/client'
import type { Unit, UnitEvent, Call } from '@/api/types'
import { useTalkgroupCache } from '@/stores/useTalkgroupCache'
import {
  formatDateTime,
  formatRelativeTime,
  getEventTypeLabel,
  getEventTypeColor,
  getTalkgroupDisplayName,
} from '@/lib/utils'

export default function UnitDetail() {
  const { id } = useParams<{ id: string }>()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [events, setEvents] = useState<UnitEvent[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const getAlphaTag = useTalkgroupCache((s) => s.getAlphaTag)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError(null)

    // id is now in format "sysid:unit_id" or plain "unit_id"
    Promise.all([
      getUnit(id),
      getUnitEvents(id, { limit: 50 }),
      getUnitCalls(id, { limit: 20 }),
    ])
      .then(([unitRes, eventsRes, callsRes]) => {
        setUnit(unitRes)
        setEvents(eventsRes.events)
        setCalls(callsRes.calls)
      })
      .catch((err) => {
        console.error(err)
        if (err.status === 409) {
          setError('This unit ID exists in multiple systems. Please use the format sysid:unit_id.')
        } else {
          setError('Failed to load unit details')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="space-y-4">
        <div className="flex h-64 items-center justify-center text-destructive">
          {error || 'Unit not found'}
        </div>
        <div className="text-center">
          <Link to="/units" className="text-primary hover:underline">
            ← Back to units
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2">
          <Link to="/units" className="text-sm text-muted-foreground hover:underline">
            ← Back to units
          </Link>
        </div>
        <h1 className="text-2xl font-bold">
          {unit.alpha_tag || `Unit ${unit.unit_id}`}
        </h1>
        <p className="text-muted-foreground">Radio Unit ID: {unit.unit_id}</p>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-mono text-base">
          {unit.unit_id}
        </Badge>
        {unit.alpha_tag_source && (
          <Badge variant="secondary">Source: {unit.alpha_tag_source}</Badge>
        )}
      </div>

      {/* Details card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">First Seen</p>
              <p>{formatDateTime(unit.first_seen || '')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Seen</p>
              <p>{formatDateTime(unit.last_seen || '')}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(unit.last_seen || '')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">System ID</p>
              <p className="font-mono">{unit.sysid}</p>
            </div>
            {unit.last_event_type && (
              <div>
                <p className="text-sm text-muted-foreground">Last Activity</p>
                <p>{getEventTypeLabel(unit.last_event_type)}</p>
                {unit.last_event_tg_tag && (
                  <p className="text-xs text-muted-foreground">{unit.last_event_tg_tag}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground">No events recorded</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {events.map((event) => {
                  // Look up alpha tag from cache
                  const alphaTag = event.tg_sysid
                    ? getAlphaTag(event.tg_sysid, event.tgid)
                    : undefined
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border bg-card p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {getEventTypeLabel(event.event_type)}
                          </Badge>
                          {event.tg_sysid ? (
                            <Link
                              to={`/talkgroups/${event.tg_sysid}:${event.tgid}`}
                              className={`${getEventTypeColor(event.event_type)} hover:underline`}
                            >
                              {getTalkgroupDisplayName(event.tgid, alphaTag)}
                            </Link>
                          ) : (
                            <span className={getEventTypeColor(event.event_type)}>
                              {getTalkgroupDisplayName(event.tgid, alphaTag)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(event.time)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(event.time)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent calls */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls ({calls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <p className="text-muted-foreground">No calls recorded</p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <CallList calls={calls} compact emptyMessage="No calls found" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
