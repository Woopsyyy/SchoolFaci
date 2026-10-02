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
  Download,
  FileSpreadsheet,
  Printer,
  Target,
  TrendingDown,
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
  High: 'Immediate action: assign a maintenance team and set a target resolution date.',
  Moderate: 'Schedule repair within the current term and include in the next budget cycle.',
  Low: 'Routine maintenance. Re-assess next term to confirm the condition is stable.',
}

const GENERATED_ON = new Date().toISOString()

export default function Reports({ resetKey }: Props) {
  const { data, loading, error } = useAsync(
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
    const all = data.priority.flatMap((p) => [
      p.avg_overall_rating ?? 0,
    ]).filter((v) => v > 0)
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
    toast.success('Assessment summary downloaded')
  }

  function exportIndicatorBreakdown() {
    downloadCsv(
      `tcc-facilitytrack-indicator-breakdown-${date}`,
      ['Indicator', 'Average score (1-5)', 'Total ratings'],
      data.indicators.map((d) => [d.label, d.avg, d.n]),
    )
    toast.success('Indicator breakdown downloaded')
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
    toast.success('Concern report downloaded')
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
    toast.success('Priority list downloaded')
  }

  if (loading) {
    return (
      <div>
        <PageTitle title="Facility Reports" />
        <p className="py-16 text-center text-sm text-slate-500">Preparing reports…</p>
      </div>
    )
  }

  return (
    <div>
      <PageTitle
        title="Facility Reports"
        subtitle="Downloadable summaries for planning and facility improvement. Use Print / Save as PDF for a formatted document."
      />

      <ErrorNote error={error} />

      <div className="no-print mb-6 flex flex-wrap gap-2">
        <Button onClick={exportAssessmentSummary}>
          <Download />
          Assessment summary (CSV)
        </Button>
        <Button onClick={exportIndicatorBreakdown} variant="secondary">
          <Download />
          Indicator breakdown (CSV)
        </Button>
        <Button onClick={exportConcerns} variant="secondary">
          <Download />
          Concern report (CSV)
        </Button>
        <Button onClick={exportPriority} variant="secondary">
          <Download />
          Priority list (CSV)
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Print / Save as PDF
        </Button>
      </div>

      <div className="print-area space-y-6">
        <div className="print-only hidden" />

        <div className="grid gap-4 sm:grid-cols-4">
          <SummaryTile label="Total responses" value={String(totals.responses)} />
          <SummaryTile label="Mean rating" value={`${totals.mean} / 5`} />
          <SummaryTile label="High priority facilities" value={String(totals.high)} />
          <SummaryTile label="Open concerns" value={String(totals.open)} />
        </div>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4 text-orange-600" />
              Indicator breakdown
            </CardTitle>
            <p className="text-sm text-slate-600">
              The indicators with the lowest averages are the strongest candidates for improvement.
            </p>
          </CardHeader>
          <CardContent>
            {data.indicators.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No ratings recorded yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.indicators}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={140}
                      tick={{ fontSize: 11, fill: '#475569' }}
                    />
                    <Tooltip
                      formatter={(v) => [`${String(v)} / 5`, 'Average']}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="avg" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {data.indicators.map((d) => (
                        <Cell
                          key={d.key}
                          fill={d.avg < 2.5 ? '#dc2626' : d.avg < 3.5 ? '#f97316' : '#16a34a'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">1. Facility assessment summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((p) => (
                  <TableRow key={p.facility_id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.response_count}</TableCell>
                    <TableCell className="tabular-nums">
                      {ratingText(p.avg_overall_rating)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClasses(p.priority)}`}
                      >
                        {p.priority}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-red-600" />
              2. Priority list and recommended actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>Recommended action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((p) => (
                  <TableRow key={p.facility_id}>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClasses(p.priority)}`}
                      >
                        {p.priority}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal font-medium">{p.name}</TableCell>
                    <TableCell className="whitespace-normal text-sm text-slate-600">
                      {p.rationale}
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm text-slate-600">
                      {RECOMMENDATION[p.priority] ?? ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="size-4 text-sky-600" />
              3. Concern report ({data.concerns.length} total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.concerns.slice(0, 40).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
                    <TableCell>{c.facilities?.name ?? '—'}</TableCell>
                    <TableCell>{c.severity}</TableCell>
                    <TableCell>{c.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.concerns.length > 40 && (
              <p className="mt-2 text-xs text-slate-500">
                Showing the 40 most recent. Export the CSV for the full list.
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          TCC FacilityTrack · Talisay City College · Generated {formatDate(GENERATED_ON)}
        </p>
      </div>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 text-center shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  )
}