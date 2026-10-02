import { useMemo, useState } from 'react'
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
import type { Concern, ConcernEvent, FacilityPriority, FacilityScores, Priority } from '@/lib/supabase'
import { priorityClasses, ratingText, statusClasses } from '@/lib/format'
import { getCategoryIcon, getStatusIcon } from '@/lib/icons'
import { useAsync } from '@/lib/useAsync'
import { FacilityDetailModal } from '@/components/modals/FacilityDetailModal'
import { ConcernDetailModal } from '@/components/modals/ConcernDetailModal'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileBarChart,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

const PRIORITY_FILL: Record<Priority, string> = {
  High: '#ef4444',
  Moderate: '#f97316',
  Low: '#10b981',
}

type DashboardProps = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

type ConcernWithFacility = Concern & { facilities: { name: string } | null }

export default function Dashboard({ resetKey, forceReset, unlocked }: DashboardProps) {
  const [selectedFacility, setSelectedFacility] = useState<FacilityPriority | null>(null)
  const [selectedConcern, setSelectedConcern] = useState<ConcernWithFacility | null>(null)
  const [concernEvents, setConcernEvents] = useState<ConcernEvent[]>([])

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [priorityRes, scoresRes, concernRes] = await Promise.all([
        supabase.from('v_facility_priority').select('*'),
        supabase.from('v_facility_scores').select('*'),
        supabase
          .from('concerns')
          .select('id,facility_id,category,severity,description,status,created_by,created_at,updated_at,resolution_note,facilities(name)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])
      if (priorityRes.error) throw new Error(priorityRes.error.message)
      if (scoresRes.error) throw new Error(scoresRes.error.message)
      if (concernRes.error) throw new Error(concernRes.error.message)

      const priority = (priorityRes.data ?? []) as FacilityPriority[]
      const scores = (scoresRes.data ?? []) as FacilityScores[]
      const recent = (concernRes.data ?? []) as ConcernWithFacility[]

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
      recent: [] as ConcernWithFacility[],
      openCount: 0,
      highOpenCount: 0,
    },
  )

  const totalResponses = useMemo(
    () => data.scores.reduce((sum, s) => sum + (s.response_count ?? 0), 0),
    [data.scores],
  )

  const ratedCount = useMemo(
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
          raw: p,
        })),
    [data.priority],
  )

  const highPriority = useMemo(
    () => data.priority.filter((p) => p.priority === 'High').slice(0, 6),
    [data.priority],
  )

  async function handleOpenConcernModal(concern: ConcernWithFacility) {
    setSelectedConcern(concern)
    try {
      const { data: events } = await supabase
        .from('concern_events')
        .select('*')
        .eq('concern_id', concern.id)
        .order('created_at', { ascending: false })
      setConcernEvents((events ?? []) as ConcernEvent[])
    } catch {
      setConcernEvents([])
    }
  }

  function handleManualRefresh() {
    reload()
    forceReset()
    toast.success('Dashboard refreshed', { description: 'Fetched latest responses and concerns.' })
  }

  if (loading) {
    return (
      <div className="py-12">
        <PageTitle title="Facility Dashboard" subtitle="Loading metrics and statistics…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Facility Dashboard"
        subtitle="Real-time student perception, condition ratings, and unresolved school facility issues at Talisay City College."
        badge="Active Term"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualRefresh}
              className="gap-1.5 shadow-2xs hover:bg-slate-100"
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Link to="/feedback">
              <Button size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700 shadow-xs">
                <Plus className="size-3.5" />
                Submit Rating
              </Button>
            </Link>
          </div>
        }
      />

      <ErrorNote error={error} />

      {/* TCC Campus Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden h-40 sm:h-52 animate-fade-in-up stagger-1">
        <img
          src="/images/tcc-campus-main.jpg"
          alt="Talisay City College Main Building"
          className="w-full h-full object-cover object-center"
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-transparent" />
        {/* Content over banner */}
        <div className="absolute inset-0 flex items-center px-6 sm:px-8">
          <div className="flex items-center gap-4">
            <img
              src="/images/tcc-logo.png"
              alt="TCC Logo"
              className="size-14 sm:size-18 rounded-full ring-2 ring-white/30 shadow-xl shrink-0 hidden sm:block"
            />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-300 mb-0.5">Talisay City College</div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                Campus Facility Assessment System
              </h2>
              <p className="text-xs text-white/70 mt-1 max-w-md hidden sm:block">
                Monitoring and evaluating school facilities for continuous quality improvement.
              </p>
            </div>
          </div>
        </div>
        {/* Floating badge top-right */}
        <div className="absolute top-3 right-3">
          <span className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-semibold text-white">
            A.Y. {new Date().getFullYear()}
          </span>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up stagger-2">
        <StatCard
          icon={<Building2 className="size-5 text-sky-600" />}
          iconBg="bg-sky-50 text-sky-600 ring-4 ring-sky-50/60"
          label="Registered Facilities"
          value={String(data.scores.length)}
          hint={`${ratedCount} facilities rated by students`}
          accentGradient="from-sky-500 to-blue-600"
        />
        <StatCard
          icon={<ClipboardList className="size-5 text-emerald-600" />}
          iconBg="bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60"
          label="Student Assessments"
          value={String(totalResponses)}
          hint="Total student rating submissions"
          accentGradient="from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={<AlertTriangle className="size-5 text-amber-600" />}
          iconBg="bg-amber-50 text-amber-600 ring-4 ring-amber-50/60"
          label="Open Concerns"
          value={String(data.openCount)}
          hint={`${data.highOpenCount} high-severity active`}
          accentGradient="from-amber-500 to-orange-600"
        />
        <StatCard
          icon={<Flame className="size-5 text-rose-600" />}
          iconBg="bg-rose-50 text-rose-600 ring-4 ring-rose-50/60"
          label="High Priority Facilities"
          value={String(highPriority.length)}
          hint="Requires immediate intervention"
          accentGradient="from-rose-500 to-red-600"
        />
      </div>

      {/* Main Grid: Chart & Recommendations */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Rating Chart */}
        <Card className="card-interactive rounded-2xl border-slate-200/90 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="size-4 text-sky-600" />
                  Average Rating by Facility
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  1.0 to 5.0 Likert scale (sorted lowest satisfaction first). Click any bar to inspect.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {chartData.length} Rated
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {chartData.length === 0 ? (
              <div className="py-14 text-center">
                <ClipboardList className="mx-auto size-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No student assessments yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Submit ratings from the Student Feedback form to populate this chart.
                </p>
                <Link to="/feedback" className="inline-block mt-3">
                  <Button size="sm" variant="outline">
                    Go to Student Feedback
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="h-80 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 65 }}
                    onClick={(state: any) => {
                      if (state && state.activePayload && state.activePayload.length) {
                        const clicked = state.activePayload[0].payload as (typeof chartData)[number]
                        setSelectedFacility(clicked.raw)
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={65}
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload as (typeof chartData)[number]
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md">
                            <div className="font-bold text-slate-900">{d.fullName}</div>
                            <div className="mt-2 flex items-center justify-between gap-4">
                              <span className="text-slate-500">Average Rating:</span>
                              <span className="font-bold text-slate-900">
                                {d.score.toFixed(2)} / 5.0
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 mt-1">
                              <span className="text-slate-500">Total Responses:</span>
                              <span className="font-medium text-slate-700">{d.responses}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 mt-1">
                              <span className="text-slate-500">Priority:</span>
                              <span className={`font-semibold ${priorityClasses(d.priority)} rounded-sm px-1.5 py-0.5`}>
                                {d.priority}
                              </span>
                            </div>
                            <div className="mt-2 text-[10px] text-sky-600 font-medium border-t pt-1.5">
                              Click bar to inspect facility details →
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="score"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                      className="cursor-pointer transition-all hover:opacity-85"
                    >
                      {chartData.map((d) => (
                        <Cell key={d.fullName} fill={PRIORITY_FILL[d.priority]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="flex items-center gap-4">
                <LegendSwatch color="#ef4444" label="High Priority (< 3.0)" />
                <LegendSwatch color="#f97316" label="Moderate (3.0 – 3.7)" />
                <LegendSwatch color="#10b981" label="Low / Good (≥ 3.8)" />
              </div>
              <span className="text-[11px] text-slate-400">Click bar to view full metrics</span>
            </div>
          </CardContent>
        </Card>

        {/* Priority Recommendations */}
        <Card className="card-interactive rounded-2xl border-slate-200/90 shadow-xs flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="size-4 text-rose-600" />
                Priority Recommendations
              </CardTitle>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 border border-rose-200">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Facilities identified by the study algorithm requiring immediate repair or resources.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {highPriority.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                  <CheckCircle2 className="size-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">All facilities are in good standing</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  No rated facility has scored below 3.0 or contains open high-severity issues.
                </p>
              </div>
            ) : (
              highPriority.map((p) => (
                <div
                  key={p.facility_id}
                  onClick={() => setSelectedFacility(p)}
                  className="group cursor-pointer rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-all hover:border-sky-300 hover:bg-sky-50/40 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.rationale}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityClasses(
                        p.priority,
                      )}`}
                    >
                      {p.priority}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Progress
                      value={((p.avg_overall_rating ?? 0) / 5) * 100}
                      className="h-1.5 flex-1"
                    />
                    <span className="text-xs font-bold tabular-nums text-slate-700">
                      {ratingText(p.avg_overall_rating)}
                    </span>
                    <Eye className="size-3.5 text-slate-400 group-hover:text-sky-600" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Concerns Section */}
      <Card className="card-interactive rounded-2xl border-slate-200/90 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Recent Reported Concerns
            </CardTitle>
            <Link
              to="/monitoring"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              <span>View All Monitoring</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest facility issues flagged by students and faculty.
          </p>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No concerns reported yet. You can report one with the top button.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recent.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleOpenConcernModal(c)}
                  className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3.5 px-2 rounded-xl transition-colors hover:bg-slate-50/80 cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors mt-0.5">
                      {getCategoryIcon(c.category ?? 'Other', 'size-4')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {c.facilities?.name ?? 'Unknown facility'}
                        </span>
                        <span className="text-[11px] text-slate-400">· {c.category}</span>
                      </div>
                      <p className="truncate text-xs text-slate-600 mt-0.5 max-w-xl">
                        {c.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(
                        c.status,
                      )}`}
                    >
                      {getStatusIcon(c.status, 'size-3')}
                      {c.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <Button variant="ghost" size="sm" className="size-7 p-0 text-slate-400 group-hover:text-sky-600">
                      <Eye className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleManualRefresh} className="gap-1.5 text-xs">
                <RefreshCw className="size-3" />
                Refresh Data
              </Button>
              <Link to="/reports">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <FileBarChart className="size-3 text-sky-600" />
                  Generate Reports & Analytics
                </Button>
              </Link>
            </div>
            {!unlocked && (
              <span className="text-[11px] text-slate-400">
                Administrative actions unlock with passphrase.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Facility Inspection Modal */}
      <FacilityDetailModal
        facility={selectedFacility}
        open={selectedFacility !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFacility(null)
        }}
      />

      {/* Concern Detail & Timeline Modal */}
      <ConcernDetailModal
        concern={selectedConcern}
        events={concernEvents}
        open={selectedConcern !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedConcern(null)
        }}
        unlocked={unlocked}
      />
    </div>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  hint,
  accentGradient,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  hint: string
  accentGradient: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Top accent gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient}`} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`flex size-10 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-slate-500 font-medium">{hint}</div>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
