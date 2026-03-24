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
