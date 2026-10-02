import { useMemo } from 'react'
import { Link } from 'react-router-dom'
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
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Concern, FacilityPriority, FacilityScores, Priority } from '@/lib/supabase'
import { priorityClasses, ratingText, statusClasses } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { AlertTriangle, Building2, ClipboardList, Flame, TrendingUp } from 'lucide-react'

const PRIORITY_FILL: Record<Priority, string> = {
  High: '#dc2626',
  Moderate: '#f97316',
  Low: '#16a34a',
}

type DashboardProps = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

export default function Dashboard({ resetKey, forceReset, unlocked }: DashboardProps) {
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [priorityRes, scoresRes, concernRes] = await Promise.all([
        supabase.from('v_facility_priority').select('*'),
        supabase.from('v_facility_scores').select('*'),
        supabase
          .from('concerns')
          .select('id,severity,status,created_at,facility_id,facilities(name)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])
      if (priorityRes.error) throw new Error(priorityRes.error.message)
      if (scoresRes.error) throw new Error(scoresRes.error.message)
      if (concernRes.error) throw new Error(concernRes.error.message)

      const priority = (priorityRes.data ?? []) as FacilityPriority[]
      const scores = (scoresRes.data ?? []) as FacilityScores[]

      const recent = (concernRes.data ?? []) as (Concern & { facilities: { name: string } | null })[]
      const openAll = await supabase
        .from('concerns')
        .select('id,severity,status')
        .neq('status', 'Resolved')

      return {
        priority,
        scores,
        recent,
        openCount: (openAll.data ?? []).length,
        highOpenCount: (openAll.data ?? []).filter(
          (c) => c.severity === 'High' && c.status !== 'Resolved',
        ).length,
      }
    },
    [resetKey],
    {
      priority: [] as FacilityPriority[],
      scores: [] as FacilityScores[],
      recent: [] as (Concern & { facilities: { name: string } | null })[],
      openCount: 0,
      highOpenCount: 0,
    },
  )

  const totalResponses = useMemo(
    () => data.scores.reduce((sum, s) => sum + (s.response_count ?? 0), 0),
    [data.scores],
  )

  const rated = useMemo(
    () => data.priority.filter((p) => p.response_count > 0).length,
    [data.priority],
  )

  const chartData = useMemo(
    () =>
      [...data.priority]
        .filter((p) => p.response_count > 0)
        .sort((a, b) => (a.avg_overall_rating ?? 0) - (b.avg_overall_rating ?? 0))
        .map((p) => ({
          name: p.name.replace(/^(Classroom|Computer Laboratory|Library|Male|Female) /, ''),
          fullName: p.name,
          score: Number(p.avg_overall_rating ?? 0),
          responses: p.response_count,
          priority: p.priority,
        })),
    [data.priority],
  )

  const highPriority = useMemo(
    () => data.priority.filter((p) => p.priority === 'High').slice(0, 6),
    [data.priority],
  )

  if (loading) {
    return (
      <div>
        <PageTitle title="Facility Dashboard" />
        <p className="py-16 text-center text-sm text-slate-500">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div>
      <PageTitle
        title="Facility Dashboard"
        subtitle="Summarised student perceptions and facility concerns. Ratings are on a 1–5 scale."
      />

      <ErrorNote error={error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 />}
          label="Registered facilities"
          value={String(data.scores.length)}
          hint="Active facilities tracked"
          accent="border-l-sky-600"
        />
        <StatCard
          icon={<ClipboardList />}
          label="Student assessments"
          value={String(totalResponses)}
          hint={`${rated} of ${data.scores.length} facilities rated`}
          accent="border-l-emerald-600"
        />
        <StatCard
          icon={<AlertTriangle />}
          label="Open concerns"
          value={String(data.openCount)}
          hint="Not yet resolved"
          accent="border-l-orange-500"
        />
        <StatCard
          icon={<Flame />}
          label="High priority"
          value={String(highPriority.length)}
          hint="Requires immediate action"
          accent="border-l-red-600"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average rating by facility</CardTitle>
            <p className="text-sm text-slate-600">
              Lowest first. Hover a bar for the exact score.
            </p>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No assessments yet. Submit one from Student Feedback to populate this chart.
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload as (typeof chartData)[number]
                        return (
                          <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
                            <div className="font-semibold">{d.fullName}</div>
                            <div className="mt-1">
                              Average: <strong>{d.score.toFixed(2)} / 5</strong>
                            </div>
                            <div>Responses: {d.responses}</div>
                            <div>Priority: {d.priority}</div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {chartData.map((d) => (
                        <Cell key={d.fullName} fill={PRIORITY_FILL[d.priority]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-4 border-t pt-3 text-xs text-slate-600">
              <LegendSwatch color="#dc2626" label="High priority" />
              <LegendSwatch color="#f97316" label="Moderate" />
              <LegendSwatch color="#16a34a" label="Low" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-red-600" />
              Priority recommendations
            </CardTitle>
            <p className="text-sm text-slate-600">
              Facilities the system flagged as needing attention first.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {highPriority.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No high-priority facilities. All rated facilities scored at or above 3.0 with no
                open high-severity concerns.
              </p>
            ) : (
              highPriority.map((p) => (
                <div key={p.facility_id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.rationale}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClasses(p.priority)}`}
                    >
                      {p.priority}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress
                      value={((p.avg_overall_rating ?? 0) / 5) * 100}
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-medium tabular-nums text-slate-600">
                      {ratingText(p.avg_overall_rating)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent reported concerns</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No concerns reported yet.
            </p>
          ) : (
            <ul className="divide-y">
              {data.recent.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">
                      {c.facilities?.name ?? 'Unknown facility'}
                    </div>
                    <div className="truncate text-sm text-slate-600">{c.description}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(c.status)}`}>
                      {c.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('en-PH')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <Button size="sm" variant="outline" onClick={reload}>
              Refresh data
            </Button>
            <Button size="sm" variant="outline" onClick={forceReset}>
              Reload dashboard
            </Button>
            <Link
              to="/reports"
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-slate-100"
            >
              Generate reports
            </Link>
            {!unlocked && (
              <span className="ml-auto self-center text-xs text-slate-500">
                Admin editing unlocks via the Lock admin bar after entering the passphrase.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  accent: string
}) {
  return (
    <div className={`rounded-xl border border-l-4 bg-white p-5 shadow-sm ${accent}`}>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="text-slate-400 [&_svg]:size-4">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}
