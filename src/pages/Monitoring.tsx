import { useMemo, useState } from 'react'
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminGate, useAdmin } from '@/components/AdminGate'
import { formatDateTime, relativeTime, severityClasses, statusClasses } from '@/lib/format'
import { supabase, CONCERN_STATUSES } from '@/lib/supabase'
import type { Concern, ConcernEvent, ConcernStatus } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'
import { History, Wrench } from 'lucide-react'

type Props = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

type ConcernRow = Concern & { facilities: { name: string } | null }

export default function Monitoring({ resetKey, forceReset, unlocked }: Props) {
  const { passphrase } = useAdmin()
  const [statusFilter, setStatusFilter] = useState<ConcernStatus | 'All'>('All')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [concernRes, eventRes] = await Promise.all([
        supabase
          .from('concerns')
          .select('*,facilities(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('concern_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
      ])
      if (concernRes.error) throw new Error(concernRes.error.message)
      if (eventRes.error) throw new Error(eventRes.error.message)

      const concerns = (concernRes.data ?? []) as unknown as ConcernRow[]
      const events = (eventRes.data ?? []) as ConcernEvent[]
      const eventsByConcern: Record<string, ConcernEvent[]> = {}
      for (const e of events) {
        eventsByConcern[e.concern_id] = [...(eventsByConcern[e.concern_id] ?? []), e]
      }
      return { concerns, eventsByConcern }
    },
    [resetKey],
    { concerns: [] as ConcernRow[], eventsByConcern: {} as Record<string, ConcernEvent[]> },
  )

  const filtered = useMemo(
    () =>
      statusFilter === 'All'
        ? data.concerns
        : data.concerns.filter((c) => c.status === statusFilter),
    [data.concerns, statusFilter],
  )

  const counts = useMemo(() => {
    const out: Record<string, number> = { All: data.concerns.length }
    for (const s of CONCERN_STATUSES) {
      out[s] = data.concerns.filter((c) => c.status === s).length
    }
    return out
  }, [data.concerns])

  async function changeStatus(row: ConcernRow, next: ConcernStatus) {
    setBusyId(row.id)
    try {
      const { error: rpcError } = await supabase.rpc('set_concern_status', {
        _concern_id: row.id,
        _to_status: next,
        _admin_passphrase: passphrase,
        _note: notes[row.id]?.trim() || null,
        _actor: 'Administrator',
      })
      if (rpcError) throw new Error(rpcError.message)
      toast.success('Status updated', {
        description: `${row.facilities?.name ?? 'Concern'} → ${next}`,
      })
      setNotes((n) => ({ ...n, [row.id]: '' }))
      reload()
      forceReset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the status.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageTitle
        title="Concern Monitoring"
        subtitle="Feedback-to-action tracking. Move a concern through Reported → Under Review → For Repair → In Progress → Resolved."
      />

      <ErrorNote error={error} />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['All', ...CONCERN_STATUSES] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
          >
            {s}
            <span className="ml-1.5 rounded-full bg-black/10 px-1.5 text-xs tabular-nums">
              {counts[s] ?? 0}
            </span>
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading concerns…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-slate-500">
            No concerns in this status.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {c.facilities?.name ?? 'Unknown facility'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityClasses(c.severity)}`}
                      >
                        {c.severity}
                      </span>
                      {c.category && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {c.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-normal text-sm text-slate-700">{c.description}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Reported by {c.created_by ?? 'unknown'} · {relativeTime(c.created_at)} ·{' '}
                      {formatDateTime(c.created_at)}
                    </p>
                    {c.resolution_note && (
                      <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        <strong>Note:</strong> {c.resolution_note}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(c.status)}`}
                    >
                      {c.status}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      aria-expanded={expanded === c.id}
                    >
                      <History />
                      Timeline
                    </Button>
                  </div>
                </div>

                {unlocked && (
                  <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[220px_1fr_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">
                        Update status
                      </label>
                      <Select
                        value={c.status}
                        onValueChange={(v) => {
                          if (v != null) changeStatus(c, v as ConcernStatus)
                        }}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONCERN_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">
                        Resolution note (optional)
                      </label>
                      <Textarea
                        value={notes[c.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                        placeholder="What action was taken?"
                        className="min-h-16 text-sm"
                        disabled={busyId === c.id}
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={busyId === c.id}
                      onClick={() => changeStatus(c, c.status)}
                    >
                      <Wrench />
                      {busyId === c.id ? 'Saving…' : 'Save note'}
                    </Button>
                  </div>
                )}

                {expanded === c.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">Status history</h4>
                    {(data.eventsByConcern[c.id] ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">No history recorded.</p>
                    ) : (
                      <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
                        {(data.eventsByConcern[c.id] ?? []).map((e) => (
                          <li key={e.id} className="relative text-sm">
                            <span className="absolute -left-[22px] top-1.5 size-2.5 rounded-full bg-sky-500" />
                            <div className="font-medium text-slate-800">
                              {e.from_status ? `${e.from_status} → ${e.to_status}` : `Reported as ${e.to_status}`}
                            </div>
                            {e.note && <div className="text-slate-600">{e.note}</div>}
                            <div className="text-xs text-slate-500">
                              {formatDateTime(e.created_at)} · {e.actor ?? 'system'}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!unlocked && <div className="mt-6"><AdminGate /></div>}
    </div>
  )
}