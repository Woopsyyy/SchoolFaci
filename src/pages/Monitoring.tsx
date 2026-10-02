import { useMemo, useState } from 'react'
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminGate, useAdmin } from '@/components/AdminGate'
import { formatDateTime, relativeTime, severityClasses, statusClasses } from '@/lib/format'
import { getCategoryIcon, getPriorityIcon, getStatusIcon } from '@/lib/icons'
import { supabase, CONCERN_STATUSES } from '@/lib/supabase'
import type { Concern, ConcernEvent, ConcernStatus } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { ConcernDetailModal } from '@/components/modals/ConcernDetailModal'
import { toast } from 'sonner'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  History,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react'

type Props = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

type ConcernRow = Concern & { facilities: { name: string } | null }

export default function Monitoring({ resetKey, forceReset, unlocked }: Props) {
  const { passphrase } = useAdmin()
  const [statusFilter, setStatusFilter] = useState<ConcernStatus | 'All'>('All')
  const [search, setSearch] = useState('')
  const [selectedConcern, setSelectedConcern] = useState<ConcernRow | null>(null)

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
          .limit(300),
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.concerns.filter((c) => {
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter
      const matchesSearch =
        !q ||
        (c.facilities?.name ?? '').toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.category ?? '').toLowerCase().includes(q) ||
        (c.created_by ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [data.concerns, statusFilter, search])

  const counts = useMemo(() => {
    const out: Record<string, number> = { All: data.concerns.length }
    for (const s of CONCERN_STATUSES) {
      out[s] = data.concerns.filter((c) => c.status === s).length
    }
    return out
  }, [data.concerns])

  async function handleStatusUpdate(
    concern: ConcernRow,
    nextStatus: ConcernStatus,
    note?: string,
  ) {
    try {
      const { error: rpcError } = await supabase.rpc('set_concern_status', {
        _concern_id: concern.id,
        _to_status: nextStatus,
        _admin_passphrase: passphrase,
        _note: note || null,
        _actor: 'Administrator',
      })
      if (rpcError) throw new Error(rpcError.message)

      toast.success('Status updated', {
        description: `${concern.facilities?.name ?? 'Concern'} changed to ${nextStatus}`,
      })
      reload()
      forceReset()
      setSelectedConcern(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update status.')
      throw err
    }
  }

  function handleManualRefresh() {
    reload()
    forceReset()
    toast.success('Concerns refreshed')
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Concern Monitoring"
        subtitle="End-to-end audit trail tracking school facility repairs from student report to physical resolution."
        badge={`${data.concerns.length} Total Tickets`}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            className="gap-1.5 shadow-2xs hover:bg-slate-100"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <ErrorNote error={error} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between animate-fade-in-up">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by facility, issue description, or reporter…"
            className="pl-9 pr-8 bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status Count Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={statusFilter === 'All' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('All')}
            className={`gap-1.5 text-xs ${statusFilter === 'All' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-white'}`}
          >
            <Filter className="size-3" />
            All
            <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] tabular-nums font-bold">
              {counts.All ?? 0}
            </span>
          </Button>
          {CONCERN_STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
              className={`gap-1.5 text-xs ${statusFilter === s ? 'bg-sky-600 hover:bg-sky-700' : 'bg-white'}`}
            >
              {getStatusIcon(s, 'size-3')}
              <span className="hidden md:inline">{s}</span>
              <span className="md:hidden">{s.split(' ')[0]}</span>
              <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] tabular-nums font-bold">
                {counts[s] ?? 0}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Concerns List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500 animate-pulse">
          Loading concern tickets…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-slate-200/90 p-12 text-center shadow-xs">
          <CheckCircle2 className="mx-auto size-10 text-emerald-500 mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Concerns in this Filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no facility tickets matching the selected status or query.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              onClick={() => setSelectedConcern(c)}
              className="card-interactive cursor-pointer rounded-2xl border-slate-200/80 bg-white transition-all hover:border-sky-300 hover:shadow-md"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 mt-0.5">
                      {getCategoryIcon(c.category ?? 'Other', 'size-4.5')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {c.facilities?.name ?? 'Unknown Facility'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${severityClasses(
                            c.severity,
                          )}`}
                        >
                          {getPriorityIcon(c.severity, 'size-3')}
                          {c.severity} Priority
                        </span>
                        {c.category && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {c.category}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                        {c.description}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="size-3.5" />
                          {c.created_by ?? 'Anonymous student'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {relativeTime(c.created_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {formatDateTime(c.created_at)}
                        </span>
                      </div>

                      {c.resolution_note && (
                        <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-950 flex items-start gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-emerald-900">Action Taken: </span>
                            <span>{c.resolution_note}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Pill and Inspection Trigger */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
                        c.status,
                      )}`}
                    >
                      {getStatusIcon(c.status, 'size-3.5')}
                      {c.status}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs shadow-2xs hover:bg-sky-50 hover:text-sky-600 hover:border-sky-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedConcern(c)
                      }}
                    >
                      <History className="size-3.5" />
                      <span className="hidden sm:inline">Timeline & Details</span>
                      <span className="sm:hidden">Details</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Unlock Box at Bottom if locked */}
      {!unlocked && (
        <div className="mt-8">
          <AdminGate />
        </div>
      )}

      {/* Detailed Modal with Lifecycle Stepper & Admin Updating */}
      <ConcernDetailModal
        concern={selectedConcern}
        events={selectedConcern ? (data.eventsByConcern[selectedConcern.id] ?? []) : []}
        open={selectedConcern !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedConcern(null)
        }}
        unlocked={unlocked}
        onUpdateStatus={handleStatusUpdate}
      />
    </div>
  )
}