import { useMemo, useState } from 'react'
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { dimensionsFor } from '@/lib/dimensions'
import { SCORE_LABELS, scoreColor } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Dimension, Facility } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'
import { CheckCircle2, GraduationCap, Send } from 'lucide-react'

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

export default function StudentFeedback() {
  const [facilityId, setFacilityId] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [year, setYear] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, loading, error: loadError } = useAsync(
    async () => {
      const [facilitiesRes, dimsRes] = await Promise.all([
        supabase.from('facilities').select('*').eq('is_active', true).order('name'),
        supabase.from('dimensions').select('*').eq('is_active', true).order('sort_order'),
      ])
      if (facilitiesRes.error) throw new Error(facilitiesRes.error.message)
      if (dimsRes.error) throw new Error(dimsRes.error.message)
      return {
        facilities: (facilitiesRes.data ?? []) as Facility[],
        dimensions: (dimsRes.data ?? []) as Dimension[],
      }
    },
    [],
    { facilities: [] as Facility[], dimensions: [] as Dimension[] },
  )

  const facility = useMemo(
    () => data.facilities.find((f) => f.id === facilityId) ?? null,
    [data.facilities, facilityId],
  )

  const indicators = useMemo(
    () => (facility ? dimensionsFor(data.dimensions, facility.category) : []),
    [data.dimensions, facility],
  )

  const answered = Object.keys(scores).length
  const total = indicators.length
  const complete = total > 0 && answered === total

  function reset() {
    setScores({})
    setComment('')
    setName('')
    setYear('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!facility) {
      setError('Please select a facility to assess.')
      return
    }
    if (!complete) {
      setError(`Please rate all ${total} indicators before submitting.`)
      return
    }

    setSubmitting(true)
    try {
      const overall = Math.round(
        Object.values(scores).reduce((a, b) => a + b, 0) / total,
      )

      const { data: inserted, error: insertError } = await supabase
        .from('assessments')
        .insert({
          facility_id: facility.id,
          respondent_name: name.trim() || null,
          respondent_year: year || null,
          overall_rating: overall,
          comment: comment.trim() || null,
        })
        .select('id')
        .single()

      if (insertError) throw new Error(insertError.message)

      const { error: ratingsError } = await supabase.from('assessment_ratings').insert(
        indicators.map((d) => ({
          assessment_id: inserted.id,
          dimension_key: d.key,
          score: scores[d.key],
        })),
      )
      if (ratingsError) throw new Error(ratingsError.message)

      toast.success('Assessment submitted', {
        description: `Thank you for rating ${facility.name}.`,
      })
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageTitle
        title="Student Facility Assessment"
        subtitle="Rate a school facility using the indicators from the study. Your feedback drives the priority recommendations."
      />

      <ErrorNote error={loadError} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="facility">Facility to assess</Label>
              <Select value={facilityId} onValueChange={(v) => (v === null ? setFacilityId('') : setFacilityId(String(v)))}>
                <SelectTrigger id="facility" className="h-10 w-full">
                  <SelectValue placeholder="Select a facility…" />
                </SelectTrigger>
                <SelectContent>
                  {data.facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {facility && (
                <p className="text-xs text-slate-500">
                  {facility.category} · {facility.location ?? 'Location not specified'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year level (optional)</Label>
              <Select value={year} onValueChange={(v) => setYear(v === null ? '' : String(v))}>
                <SelectTrigger id="year" className="h-10 w-full">
                  <SelectValue placeholder="Select year…" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Leave blank to stay anonymous"
              />
            </div>

            <Alert>
              <GraduationCap />
              <AlertDescription>
                Your name is optional. Responses are aggregated for the research and never linked
                to grades.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <form onSubmit={submit}>
          <Card>
            <CardContent className="space-y-5 pt-6">
              {loading && <p className="py-6 text-center text-sm text-slate-500">Loading indicators…</p>}

              {!loading && !facility && (
                <p className="py-10 text-center text-sm text-slate-500">
                  Select a facility to see the indicators you will rate.
                </p>
              )}

              {facility && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {answered} of {total} indicators rated
                    </p>
                    <p className="text-xs text-slate-500">1 = Very Poor · 5 = Excellent</p>
                  </div>
                  <Progress value={total ? (answered / total) * 100 : 0} className="h-2" />

                  <div className="space-y-3">
                    {indicators.map((d) => (
                      <div
                        key={d.key}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <p className="mb-3 text-sm font-medium text-slate-800">{d.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {SCORE_LABELS.map((label, i) => {
                            const score = i + 1
                            const selected = scores[d.key] === score
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setScores((s) => ({ ...s, [d.key]: score }))}
                                className={`flex-1 rounded-md border px-2 py-2 text-xs transition-colors sm:flex-none sm:px-3 ${
                                  selected
                                    ? 'border-sky-600 bg-sky-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-600 hover:border-sky-400'
                                }`}
                              >
                                <span className="block font-semibold">{score}</span>
                                <span className="hidden sm:block">{label}</span>
                              </button>
                            )
                          })}
                        </div>
                        {scores[d.key] != null && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Rated {scores[d.key]} ({scoreColor(scores[d.key]).replace('bg-', '')})
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comment">Additional comments (optional)</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What specifically stood out? What would you improve?"
                      className="min-h-24"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={submitting || !complete} className="w-full sm:w-auto">
                    <Send />
                    {submitting ? 'Submitting…' : 'Submit assessment'}
                  </Button>
                  {!complete && (
                    <p className="text-xs text-slate-500">Rate every indicator to enable submission.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}