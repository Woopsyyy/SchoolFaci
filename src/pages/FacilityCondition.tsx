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
import { supabase } from '@/lib/supabase'
import type { FacilityCondition, FacilityScores } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'
import { Save, Settings2 } from 'lucide-react'

type Props = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

export default function FacilityCondition({ resetKey, forceReset, unlocked }: Props) {
  const { passphrase } = useAdmin()
  const [facilityId, setFacilityId] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data, loading, error } = useAsync(
    async () => {
      const [scoresRes, condRes] = await Promise.all([
        supabase.from('v_facility_scores').select('*').order('name'),
        supabase.from('facility_conditions').select('*'),
      ])
      if (scoresRes.error) throw new Error(scoresRes.error.message)
      if (condRes.error) throw new Error(condRes.error.message)

      const conditions = (condRes.data ?? []) as FacilityCondition[]
      const byFacility: Record<string, Record<string, FacilityCondition>> = {}
      for (const c of conditions) {
        byFacility[c.facility_id] = { ...(byFacility[c.facility_id] ?? {}), [c.metric_key]: c }
      }
      return {
        scores: (scoresRes.data ?? []) as FacilityScores[],
        byFacility,
      }
    },
    [resetKey],
    { scores: [] as FacilityScores[], byFacility: {} as Record<string, Record<string, FacilityCondition>> },
  )

  const facility = useMemo(() => data.scores.find((s) => s.facility_id === facilityId) ?? null, [data.scores, facilityId])
  const current = facility ? (data.byFacility[facility.facility_id] ?? {}) : {}

  function editValue(metricKey: string, value: string) {
    setDraft((d) => ({ ...d, [metricKey]: value }))
  }

  function valueOf(metricKey: string): string {
    if (metricKey in draft) return draft[metricKey]
    const v = current[metricKey]?.numeric_value
    return v == null ? '' : String(v)
  }

  async function save() {
    if (!facility) return
    setSaving(true)
    try {
      for (const metric of METRICS) {
        const raw = valueOf(metric.key)
        if (raw === '') continue
        const numeric = Number(raw)
        if (Number.isNaN(numeric)) {
          toast.error(`${metric.label} must be a number.`)
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
      toast.success('Facility condition updated', { description: facility.name })
      setDraft({})
      forceReset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the condition.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageTitle
        title="Facility Condition Assessment"
        subtitle="Objective condition data recorded by staff, shown alongside student perception scores."
      />

      <ErrorNote error={error} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="fc-facility">Select facility</Label>
              <Select
                value={facilityId}
                onValueChange={(v) => {
                  const next = v === null ? '' : String(v)
                  setFacilityId(next)
                  setDraft({})
                }}
              >
                <SelectTrigger id="fc-facility" className="h-10 w-full">
                  <SelectValue placeholder="Select a facility…" />
                </SelectTrigger>
                <SelectContent>
                  {data.scores.map((s) => (
                    <SelectItem key={s.facility_id} value={s.facility_id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {facility && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Student rating</span>
                  <span className="text-sm font-bold text-slate-800">
                    {ratingText(facility.avg_overall_rating)}
                  </span>
                </div>
                <Progress
                  value={((facility.avg_overall_rating ?? 0) / 5) * 100}
                  className="mt-2 h-2"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{facility.response_count} responses</span>
                  <span>{facility.category}</span>
                </div>
                {facility.satisfaction_pct != null && (
                  <Badge variant="secondary" className="mt-3">
                    {Number(facility.satisfaction_pct).toFixed(1)}% satisfaction
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          {loading && <p className="py-10 text-center text-sm text-slate-500">Loading…</p>}

          {!loading && !facility && (
            <Card>
              <CardContent className="py-14 text-center text-sm text-slate-500">
                Select a facility to view and update its condition metrics.
              </CardContent>
            </Card>
          )}

          {facility && !unlocked && <AdminGate />}

          {facility && unlocked && (
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-800">
                    <Settings2 className="size-4 text-sky-600" />
                    Condition metrics — {facility.name}
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {METRICS.map((m) => (
                    <div key={m.key} className="space-y-2">
                      <Label htmlFor={`metric-${m.key}`} className="text-sm">
                        {m.label}
                        {m.suffix && <span className="ml-1 text-xs text-slate-500">({m.suffix})</span>}
                      </Label>
                      <Input
                        id={`metric-${m.key}`}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={valueOf(m.key)}
                        onChange={(e) => editValue(m.key, e.target.value)}
                        placeholder="Not recorded"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <Button onClick={save} disabled={saving}>
                    <Save />
                    {saving ? 'Saving…' : 'Save condition'}
                  </Button>
                  <Button variant="ghost" onClick={() => setDraft({})} disabled={saving}>
                    Discard changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {data.scores.length > 0 && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <h2 className="mb-3 font-semibold text-slate-800">All facilities at a glance</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facility</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Responses</TableHead>
                      <TableHead>Avg rating</TableHead>
                      <TableHead>Condition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.scores.map((s) => (
                      <TableRow key={s.facility_id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.category}</TableCell>
                        <TableCell>{s.response_count}</TableCell>
                        <TableCell>{ratingText(s.avg_overall_rating)}</TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClasses(
                              s.avg_overall_rating != null && s.avg_overall_rating < 3 ? 'High' : 'Low',
                            )}`}
                          >
                            {s.avg_overall_rating == null
                              ? 'Unrated'
                              : s.avg_overall_rating < 3
                                ? 'Needs work'
                                : 'Acceptable'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}