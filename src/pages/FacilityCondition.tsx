import { useMemo, useState } from 'react'
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AdminGate, useAdmin } from '@/components/AdminGate'
import { METRICS } from '@/lib/dimensions'
import { priorityClasses, ratingText } from '@/lib/format'
import { getFacilityCategoryIcon } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import type { FacilityCondition as ConditionType, FacilityScores } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'
import {
  Building2,
  Fan,
  Lightbulb,
  Lock,
  Monitor,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Wifi,
  XCircle,
} from 'lucide-react'

type Props = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

function getMetricIcon(key: string) {
  switch (key) {
    case 'functional_computers':
      return <Monitor className="size-4 text-emerald-600" />
    case 'defective_computers':
      return <XCircle className="size-4 text-rose-600" />
    case 'internet_availability':
      return <Wifi className="size-4 text-sky-600" />
    case 'ventilation':
      return <Fan className="size-4 text-teal-600" />
    case 'lighting':
      return <Lightbulb className="size-4 text-amber-500" />
    case 'cleanliness':
      return <Sparkles className="size-4 text-purple-600" />
    default:
      return <Settings2 className="size-4 text-slate-500" />
  }
}

export default function FacilityCondition({ resetKey, forceReset, unlocked }: Props) {
  const { passphrase } = useAdmin()
  const [facilityId, setFacilityId] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [scoresRes, condRes] = await Promise.all([
        supabase.from('v_facility_scores').select('*').order('name'),
        supabase.from('facility_conditions').select('*'),
      ])
      if (scoresRes.error) throw new Error(scoresRes.error.message)
      if (condRes.error) throw new Error(condRes.error.message)

      const conditions = (condRes.data ?? []) as ConditionType[]
      const byFacility: Record<string, Record<string, ConditionType>> = {}
      for (const c of conditions) {
        byFacility[c.facility_id] = { ...(byFacility[c.facility_id] ?? {}), [c.metric_key]: c }
      }
      return {
        scores: (scoresRes.data ?? []) as FacilityScores[],
        byFacility,
      }
    },
    [resetKey],
    { scores: [] as FacilityScores[], byFacility: {} as Record<string, Record<string, ConditionType>> },
  )

  const facility = useMemo(
    () => data.scores.find((s) => s.facility_id === facilityId) ?? null,
    [data.scores, facilityId],
  )
  const current = facility ? (data.byFacility[facility.facility_id] ?? {}) : {}

  function editValue(metricKey: string, value: string) {
    setDraft((d) => ({ ...d, [metricKey]: value }))
  }

  function valueOf(metricKey: string): string {
    if (metricKey in draft) return draft[metricKey]
    const v = current[metricKey]?.numeric_value
    return v == null ? '' : String(v)
  }

  const hasDraftChanges = Object.keys(draft).length > 0

  async function save() {
    if (!facility) return
    setSaving(true)
    try {
      for (const metric of METRICS) {
        const raw = valueOf(metric.key)
        if (raw === '') continue
        const numeric = Number(raw)
        if (Number.isNaN(numeric)) {
          toast.error(`${metric.label} must be a numeric value.`)
          setSaving(false)
          return
        }
        const { error: rpcError } = await supabase.rpc('update_facility_condition', {
          _facility_id: facility.facility_id,
          _metric_key: metric.key,
          _numeric_value: numeric,
          _value: `${numeric}${metric.suffix ? ' ' + metric.suffix : ''}`,
          _admin_passphrase: passphrase,
          _actor: 'Administrator',
        })
        if (rpcError) throw new Error(rpcError.message)
      }
      toast.success('Facility Condition Updated', { description: facility.name })
      setDraft({})
      reload()
      forceReset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save condition.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Facility Condition Assessment"
        subtitle="Objective condition data and physical audits recorded by staff, evaluated side-by-side with student ratings."
        badge="Audited Data"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reload()
              forceReset()
              toast.success('Condition data refreshed')
            }}
            className="gap-1.5 shadow-2xs hover:bg-slate-100"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <ErrorNote error={error} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] animate-fade-in-up">
        {/* Left Column: Selector and Facility Summary */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200/90 shadow-xs">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="fc-facility" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Facility to Inspect
                </Label>
                <Select
                  value={facilityId}
                  onValueChange={(v) => {
                    const next = v === null ? '' : String(v)
                    setFacilityId(next)
                    setDraft({})
                  }}
                >
                  <SelectTrigger id="fc-facility" className="h-11 w-full bg-white text-sm">
                    <SelectValue placeholder="Choose a facility…" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.scores.map((s) => (
                      <SelectItem key={s.facility_id} value={s.facility_id}>
                        <div className="flex items-center gap-2">
                          {getFacilityCategoryIcon(s.category, 'size-3.5 text-sky-600')}
                          <span>{s.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {facility && (
                <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-sky-50/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Student Satisfaction
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {ratingText(facility.avg_overall_rating)}
                    </span>
                  </div>

                  <Progress
                    value={((facility.avg_overall_rating ?? 0) / 5) * 100}
                    className="h-2"
                  />

                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/60 pt-2.5">
                    <span>{facility.response_count} student responses</span>
                    <span className="font-semibold text-slate-700">{facility.category}</span>
                  </div>

                  {facility.satisfaction_pct != null && (
                    <Badge variant="secondary" className="w-full justify-center py-1">
                      {Number(facility.satisfaction_pct).toFixed(1)}% Satisfied Students
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Objective Condition Editor */}
        <div className="space-y-6">
          {loading && (
            <div className="py-16 text-center text-sm text-slate-500 animate-pulse">
              Loading condition parameters…
            </div>
          )}

          {!loading && !facility && (
            <Card className="rounded-2xl border-slate-200/90 p-12 text-center shadow-xs">
              <Building2 className="mx-auto size-10 text-slate-300 mb-2" />
              <h3 className="text-base font-bold text-slate-800">Select a Facility</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select a facility from the dropdown on the left to inspect and record objective physical audit metrics.
              </p>
            </Card>
          )}

          {facility && !unlocked && (
            <div className="space-y-4">
              <Card className="rounded-2xl border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-amber-600 shrink-0" />
                  <span>Administrative privileges required to edit physical condition metrics.</span>
                </div>
              </Card>
              <AdminGate />
            </div>
          )}

          {facility && unlocked && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs">
              <CardContent className="pt-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <Settings2 className="size-4.5 text-sky-600" />
                      Physical Condition Audit — {facility.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Input latest physical inspection metrics for maintenance scheduling.
                    </p>
                  </div>
                  {hasDraftChanges && (
                    <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700">
                      Unsaved Changes
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {METRICS.map((m) => {
                    const isEdited = m.key in draft
                    return (
                      <div
                        key={m.key}
                        className={`rounded-xl border p-3.5 transition-all ${
                          isEdited
                            ? 'border-sky-400 bg-sky-50/30 ring-1 ring-sky-300'
                            : 'border-slate-200 bg-slate-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Label
                            htmlFor={`metric-${m.key}`}
                            className="text-xs font-bold text-slate-700 flex items-center gap-2"
                          >
                            {getMetricIcon(m.key)}
                            <span>{m.label}</span>
                          </Label>
                          {m.suffix && (
                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                              {m.suffix}
                            </span>
                          )}
                        </div>

                        <Input
                          id={`metric-${m.key}`}
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={valueOf(m.key)}
                          onChange={(e) => editValue(m.key, e.target.value)}
                          placeholder="Not recorded"
                          className="bg-white text-sm"
                        />
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft({})}
                    disabled={!hasDraftChanges || saving}
                    className="text-xs text-slate-500"
                  >
                    Discard Changes
                  </Button>

                  <Button
                    onClick={save}
                    disabled={saving || !hasDraftChanges}
                    className="gap-2 bg-sky-600 hover:bg-sky-700 shadow-sm"
                  >
                    <Save className="size-4" />
                    {saving ? 'Saving Metrics…' : 'Save Condition Audit'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Overview Table of All Facilities */}
          {data.scores.length > 0 && (
            <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                  <h3 className="font-bold text-sm text-slate-800">
                    All Facilities Overview & Standing
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/40">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Facility</TableHead>
                        <TableHead className="font-bold text-slate-700">Category</TableHead>
                        <TableHead className="font-bold text-slate-700">Responses</TableHead>
                        <TableHead className="font-bold text-slate-700">Avg Rating</TableHead>
                        <TableHead className="font-bold text-slate-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.scores.map((s) => (
                        <TableRow
                          key={s.facility_id}
                          className="cursor-pointer hover:bg-slate-50/80"
                          onClick={() => {
                            setFacilityId(s.facility_id)
                            setDraft({})
                          }}
                        >
                          <TableCell className="font-semibold text-slate-900">
                            {s.name}
                          </TableCell>
                          <TableCell>{s.category}</TableCell>
                          <TableCell>{s.response_count}</TableCell>
                          <TableCell className="font-bold">{ratingText(s.avg_overall_rating)}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClasses(
                                s.avg_overall_rating != null && s.avg_overall_rating < 3 ? 'High' : 'Low',
                              )}`}
                            >
                              {s.avg_overall_rating == null
                                ? 'Unrated'
                                : s.avg_overall_rating < 3
                                  ? 'Needs Work'
                                  : 'Acceptable'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}