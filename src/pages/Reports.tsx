import { useMemo } from 'react'
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Flame,
  Printer,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  Wrench,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { downloadCsv, timestampSlug } from '@/lib/csv'
import { formatDate, priorityClasses, ratingText } from '@/lib/format'
import { getFacilityCategoryIcon, getPriorityIcon, getStatusIcon } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import type {
  Concern,
  DimensionScores,
  FacilityPriority,
} from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'

type Props = {
  resetKey: number
  forceReset: () => void
}

const RECOMMENDATION: Record<string, string> = {
  High: 'Immediate action: dispatch maintenance unit, allocate urgent repair budget.',
  Moderate: 'Schedule maintenance within the current term; procure required hardware.',
  Low: 'Routine periodic check. Re-assess next cycle to confirm condition stability.',
}

const GENERATED_ON = new Date().toISOString()

export default function Reports({ resetKey, forceReset }: Props) {
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [priorityRes, dimRes, concernRes] = await Promise.all([
        supabase.from('v_facility_priority').select('*'),
        supabase.from('v_dimension_scores').select('*'),
        supabase.from('concerns').select('*,facilities(name)').order('created_at', {
          ascending: false,
        }),
      ])
      if (priorityRes.error) throw new Error(priorityRes.error.message)
      if (dimRes.error) throw new Error(dimRes.error.message)
      if (concernRes.error) throw new Error(concernRes.error.message)

      // The dimension view is per facility x indicator; roll it up per indicator.
      const byIndicator = new Map<string, { label: string; total: number; count: number }>()
      for (const row of dimRes.data as DimensionScores[]) {
        if (!row.dimension_key || !row.label || row.avg_score == null) continue
        const entry = byIndicator.get(row.dimension_key) ?? {
          label: row.label,
          total: 0,
          count: 0,
        }
        entry.total += row.avg_score * row.rating_count
        entry.count += row.rating_count
        byIndicator.set(row.dimension_key, entry)
      }

      return {
        priority: (priorityRes.data ?? []) as FacilityPriority[],
        indicators: [...byIndicator.entries()]
          .map(([key, v]) => ({
            key,
            label: v.label,
            avg: v.count ? Number((v.total / v.count).toFixed(2)) : 0,
            n: v.count,
          }))
          .sort((a, b) => a.avg - b.avg),
        concerns: (concernRes.data ?? []) as unknown as (Concern & { facilities: { name: string } | null })[],
      }
    },
    [resetKey],
    {
      priority: [] as FacilityPriority[],
      indicators: [] as { key: string; label: string; avg: number; n: number }[],
      concerns: [] as (Concern & { facilities: { name: string } | null })[],
    },
  )

  const date = timestampSlug()

  const ranked = useMemo(
    () =>
      [...data.priority]
        .filter((p) => p.response_count > 0)
        .sort((a, b) => (a.avg_overall_rating ?? 0) - (b.avg_overall_rating ?? 0)),
    [data.priority],
  )

  const totals = useMemo(() => {
    const all = data.priority
      .flatMap((p) => [p.avg_overall_rating ?? 0])
      .filter((v) => v > 0)
    return {
      responses: data.priority.reduce((s, p) => s + p.response_count, 0),
      mean: all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : '—',
      high: data.priority.filter((p) => p.priority === 'High').length,
      open: data.concerns.filter((c) => c.status !== 'Resolved').length,
    }
  }, [data.priority, data.concerns])

  function exportAssessmentSummary() {
    downloadCsv(
      `tcc-facilitytrack-assessment-summary-${date}`,
      ['Facility', 'Category', 'Responses', 'Average rating (1-5)', 'Satisfaction %', 'Priority'],
      ranked.map((p) => [
        p.name,
        p.category,
        p.response_count,
        p.avg_overall_rating ?? '',
        p.response_count ? Number(((p.avg_overall_rating ?? 0) / 5) * 100).toFixed(1) : '',
        p.priority,
      ]),
    )
    toast.success('Assessment Summary Exported', { description: 'CSV file downloaded.' })
  }

  function exportIndicatorBreakdown() {
    downloadCsv(
      `tcc-facilitytrack-indicator-breakdown-${date}`,
      ['Indicator', 'Average score (1-5)', 'Total ratings'],
      data.indicators.map((d) => [d.label, d.avg, d.n]),
    )
    toast.success('Indicator Breakdown Exported', { description: 'CSV file downloaded.' })
  }

  function exportConcerns() {
    downloadCsv(
      `tcc-facilitytrack-concern-report-${date}`,
      ['Reported', 'Facility', 'Category', 'Severity', 'Description', 'Status', 'Resolution note'],
      data.concerns.map((c) => [
        formatDate(c.created_at),
        c.facilities?.name ?? '',
        c.category ?? '',
        c.severity,
        c.description,
        c.status,
        c.resolution_note ?? '',
      ]),
    )
    toast.success('Concern Report Exported', { description: 'CSV file downloaded.' })
  }

  function exportPriority() {
    downloadCsv(
      `tcc-facilitytrack-priority-list-${date}`,
      ['Priority', 'Facility', 'Average rating', 'Open concerns', 'High-severity open', 'Rationale', 'Recommended action'],
      ranked.map((p) => [
        p.priority,
        p.name,
        p.avg_overall_rating ?? '',
        p.open_concerns,
        p.high_open_concerns,
        p.rationale,
        RECOMMENDATION[p.priority] ?? '',
      ]),
    )
    toast.success('Priority List Exported', { description: 'CSV file downloaded.' })
  }

  function handleRefresh() {
    reload()
    forceReset()
    toast.success('Reports updated with latest database state')
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-500 animate-pulse">
        Compiling institutional facility reports…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Facility Reports & Analytics"
        subtitle="Exportable summaries, indicator breakdowns, and priority rosters for administration planning and IT research reporting."
        badge="Official Records"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="gap-1.5 shadow-2xs hover:bg-slate-100"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <ErrorNote error={error} />

      {/* Action Toolbar for Exports */}
      <div className="no-print flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs animate-fade-in-up">
        <Button
          onClick={exportAssessmentSummary}
          size="sm"
          className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-xs shadow-xs"
        >
          <FileSpreadsheet className="size-3.5" />
          Assessment Summary (CSV)
        </Button>
        <Button
          onClick={exportIndicatorBreakdown}
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs"
        >
          <Download className="size-3.5" />
          Indicator Breakdown (CSV)
        </Button>
        <Button
          onClick={exportConcerns}
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs"
        >
          <Download className="size-3.5" />
          Concern Report (CSV)
        </Button>
        <Button
          onClick={exportPriority}
          variant="secondary"
          size="sm"
          className="gap-1.5 text-xs"
        >
          <Download className="size-3.5" />
          Priority List (CSV)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="gap-1.5 ml-auto text-xs"
        >
          <Printer className="size-3.5" />
          Print / Save PDF
        </Button>
      </div>

      <div className="print-area space-y-6">
        {/* Print Cover Header */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <h1 className="text-xl font-bold text-slate-900">Talisay City College</h1>
          <h2 className="text-base font-semibold text-slate-700">TCC FacilityTrack · Institutional Facility Report</h2>
          <p className="text-xs text-slate-500">Generated: {formatDate(GENERATED_ON)} · Academic Term Assessment</p>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid gap-4 sm:grid-cols-4 animate-fade-in-up">
          <SummaryTile
            icon={<ClipboardList className="size-4.5 text-sky-600" />}
            label="Total Responses"
            value={String(totals.responses)}
            hint="Aggregated evaluations"
          />
          <SummaryTile
            icon={<Sparkles className="size-4.5 text-emerald-600" />}
            label="Mean Campus Rating"
            value={`${totals.mean} / 5`}
            hint="Across all rated facilities"
          />
          <SummaryTile
            icon={<Flame className="size-4.5 text-rose-600" />}
            label="High Priority Spaces"
            value={String(totals.high)}
            hint="Urgent intervention needed"
          />
          <SummaryTile
            icon={<Wrench className="size-4.5 text-amber-600" />}
            label="Active Concerns"
            value={String(totals.open)}
            hint="Under review or in repair"
          />
        </div>

        {/* Horizontal Bar Chart: Indicator Breakdown */}
        <Card className="break-inside-avoid rounded-2xl border-slate-200/90 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <TrendingDown className="size-4 text-orange-600" />
                Indicator Breakdown & Satisfaction Deficits
              </CardTitle>
              <span className="text-xs font-semibold text-slate-500">Lowest scores first</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies which specific facility dimensions (e.g. ventilation, lighting, computer health) have lowest averages.
            </p>
          </CardHeader>
          <CardContent>
            {data.indicators.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No ratings recorded yet.</p>
            ) : (
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.indicators}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={140}
                      tick={{ fontSize: 11, fill: '#334155' }}
                    />
                    <Tooltip
                      formatter={(v) => [`${String(v)} / 5.0`, 'Average Score']}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="avg" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {data.indicators.map((d) => (
                        <Cell
                          key={d.key}
                          fill={d.avg < 2.5 ? '#ef4444' : d.avg < 3.5 ? '#f97316' : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 1. Facility Assessment Summary */}
        <Card className="break-inside-avoid rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
          <CardHeader className="bg-slate-50/50 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="size-4 text-sky-600" />
              1. Facility Assessment Summary Table
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Facility</TableHead>
                    <TableHead className="font-bold text-slate-700">Category</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Responses</TableHead>
                    <TableHead className="font-bold text-slate-700">Average Rating</TableHead>
                    <TableHead className="font-bold text-slate-700">Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((p) => (
                    <TableRow key={p.facility_id} className="hover:bg-slate-50/60">
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-md bg-sky-50 text-sky-600">
                            {getFacilityCategoryIcon(p.category, 'size-3')}
                          </span>
                          <span>{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell className="text-center tabular-nums">{p.response_count}</TableCell>
                      <TableCell className="font-bold tabular-nums">
                        {ratingText(p.avg_overall_rating)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityClasses(
                            p.priority,
                          )}`}
                        >
                          {getPriorityIcon(p.priority, 'size-3')}
                          {p.priority}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 2. Priority List & Recommendations */}
        <Card className="break-inside-avoid rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
          <CardHeader className="bg-slate-50/50 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Target className="size-4 text-rose-600" />
              2. Priority Roster & Action Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Priority</TableHead>
                    <TableHead className="font-bold text-slate-700">Facility</TableHead>
                    <TableHead className="font-bold text-slate-700">Analytical Basis</TableHead>
                    <TableHead className="font-bold text-slate-700">Recommended Next Steps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((p) => (
                    <TableRow key={p.facility_id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityClasses(
                            p.priority,
                          )}`}
                        >
                          {getPriorityIcon(p.priority, 'size-3')}
                          {p.priority}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 whitespace-normal">
                        {p.name}
                      </TableCell>
                      <TableCell className="whitespace-normal text-xs text-slate-600">
                        {p.rationale}
                      </TableCell>
                      <TableCell className="whitespace-normal text-xs text-slate-700 font-medium">
                        {RECOMMENDATION[p.priority] ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Concern Tickets Roster */}
        <Card className="break-inside-avoid rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
          <CardHeader className="bg-slate-50/50 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-sky-600" />
              3. Concern Log ({data.concerns.length} Recorded Tickets)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Reported</TableHead>
                    <TableHead className="font-bold text-slate-700">Facility</TableHead>
                    <TableHead className="font-bold text-slate-700">Category</TableHead>
                    <TableHead className="font-bold text-slate-700">Severity</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.concerns.slice(0, 30).map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/60 text-xs">
                      <TableCell>{formatDate(c.created_at)}</TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {c.facilities?.name ?? '—'}
                      </TableCell>
                      <TableCell>{c.category ?? 'Other'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClasses(
                            c.severity,
                          )}`}
                        >
                          {getPriorityIcon(c.severity, 'size-3')}
                          {c.severity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClasses(
                            c.status === 'Resolved' ? 'Low' : c.status === 'Reported' ? 'Moderate' : 'High',
                          )}`}
                        >
                          {getStatusIcon(c.status, 'size-3')}
                          {c.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.concerns.length > 30 && (
              <div className="p-3 text-center text-xs text-slate-400 border-t bg-slate-50/40">
                Displaying 30 most recent tickets. Use the "Concern Report (CSV)" button above for complete historical export.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Print document footer */}
        <p className="text-center text-xs text-slate-400 print:text-black">
          TCC FacilityTrack · Talisay City College · Campus Facility Report · {formatDate(GENERATED_ON)}
        </p>
      </div>
    </div>
  )
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wider text-[11px]">{label}</span>
        <div className="flex size-7 items-center justify-center rounded-lg bg-slate-50">
          {icon}
        </div>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] text-slate-400 font-medium">{hint}</div>
    </div>
  )
}