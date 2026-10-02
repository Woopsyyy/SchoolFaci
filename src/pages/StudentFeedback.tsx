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
import { SCORE_LABELS } from '@/lib/format'
import { getFacilityCategoryIcon } from '@/lib/icons'
import { supabase } from '@/lib/supabase'
import type { Dimension, Facility } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'
import {
  CheckCircle2,
  GraduationCap,
  MapPin,
  Send,
  Star,
  User,
} from 'lucide-react'

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

const SCORE_STYLES: Record<
  number,
  { active: string; hover: string; text: string; label: string }
> = {
  1: {
    active: 'bg-rose-600 text-white border-rose-600 shadow-xs shadow-rose-600/30',
    hover: 'hover:border-rose-400 hover:bg-rose-50/50',
    text: 'text-rose-600',
    label: 'Very Poor',
  },
  2: {
    active: 'bg-orange-500 text-white border-orange-500 shadow-xs shadow-orange-500/30',
    hover: 'hover:border-orange-400 hover:bg-orange-50/50',
    text: 'text-orange-600',
    label: 'Poor',
  },
  3: {
    active: 'bg-amber-500 text-white border-amber-500 shadow-xs shadow-amber-500/30',
    hover: 'hover:border-amber-400 hover:bg-amber-50/50',
    text: 'text-amber-600',
    label: 'Fair',
  },
  4: {
    active: 'bg-sky-600 text-white border-sky-600 shadow-xs shadow-sky-600/30',
    hover: 'hover:border-sky-400 hover:bg-sky-50/50',
    text: 'text-sky-600',
    label: 'Good',
  },
  5: {
    active: 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-600/30',
    hover: 'hover:border-emerald-400 hover:bg-emerald-50/50',
    text: 'text-emerald-600',
    label: 'Excellent',
  },
}

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
  const percentComplete = total > 0 ? Math.round((answered / total) * 100) : 0

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

      toast.success('Assessment Submitted!', {
        description: `Thank you for rating ${facility.name}. Your evaluation directly updates priority recommendations.`,
      })
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Student Facility Assessment"
        subtitle="Evaluate school facilities using research-backed indicators. Your anonymous responses drive maintenance prioritisation."
        badge="Anonymous Survey"
      />

      <ErrorNote error={loadError} />

      {/* Campus Photo Banner */}
      <div className="relative rounded-2xl overflow-hidden h-28 animate-fade-in-up stagger-1">
        <img
          src="/images/tcc-campus-main.jpg"
          alt="TCC Campus"
          className="w-full h-full object-cover object-[center_60%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-800/55 to-transparent" />
        <div className="absolute inset-0 flex items-center px-5 gap-3">
          <img src="/images/tcc-logo.png" alt="TCC" className="size-9 rounded-full ring-2 ring-white/25 shrink-0" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">Student Survey</div>
            <div className="text-sm font-bold text-white">Facility Assessment Form</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] animate-fade-in-up stagger-2">
        {/* Left Column: Facility & Respondent Information */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200/90 shadow-xs">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="facility" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Facility
                </Label>
                <Select
                  value={facilityId}
                  onValueChange={(v) => {
                    setFacilityId(v === null ? '' : String(v))
                    setScores({})
                  }}
                >
                  <SelectTrigger id="facility" className="h-11 w-full bg-white text-sm">
                    <SelectValue placeholder="Choose a facility to rate…" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <div className="flex items-center gap-2">
                          {getFacilityCategoryIcon(f.category, 'size-3.5 text-sky-600')}
                          <span>{f.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {facility && (
                  <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 text-xs text-sky-900 mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      {getFacilityCategoryIcon(facility.category, 'size-3.5 text-sky-600')}
                      <span>{facility.category} Facility</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="size-3 text-slate-400" />
                      <span>{facility.location ?? 'Campus premises'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="year" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-slate-400" />
                  Year Level (optional)
                </Label>
                <Select value={year} onValueChange={(v) => setYear(v === null ? '' : String(v))}>
                  <SelectTrigger id="year" className="h-10 w-full bg-white text-sm">
                    <SelectValue placeholder="Select year level…" />
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
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <User className="size-3.5 text-slate-400" />
                  Your Name (optional)
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Leave empty to stay anonymous"
                  className="bg-white text-sm"
                />
              </div>

              <Alert className="bg-slate-50 border-slate-200">
                <GraduationCap className="size-4 text-sky-600" />
                <AlertDescription className="text-xs text-slate-600">
                  Your identity is optional. All data is aggregated for academic research and campus facility enhancement.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Rating Assessment Form */}
        <form onSubmit={submit}>
          <Card className="rounded-2xl border-slate-200/90 shadow-xs">
            <CardContent className="space-y-6 pt-6">
              {loading && (
                <div className="py-16 text-center text-sm text-slate-500 animate-pulse">
                  Loading evaluation indicators…
                </div>
              )}

              {!loading && !facility && (
                <div className="py-16 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-3">
                    <Star className="size-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Select a Facility to Start</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    Pick a classroom, laboratory, library, or restroom on the left to reveal its specific evaluation indicators.
                  </p>
                </div>
              )}

              {facility && (
                <>
                  {/* Progress Header */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Assessment Progress
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                          {answered} of {total} rated ({percentComplete}%)
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 hidden sm:inline">
                        1 = Very Poor · 5 = Excellent
                      </span>
                    </div>

                    <Progress value={percentComplete} className="h-2.5 mt-2.5" />

                    {complete && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        All indicators rated! Ready to submit below.
                      </div>
                    )}
                  </div>

                  {/* Indicator Questions */}
                  <div className="space-y-4">
                    {indicators.map((d, index) => {
                      const userRating = scores[d.key]
                      return (
                        <div
                          key={d.key}
                          className={`rounded-xl border p-4 transition-all duration-200 ${
                            userRating != null
                              ? 'border-slate-300 bg-white shadow-2xs'
                              : 'border-slate-200/80 bg-slate-50/50 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-start gap-2.5">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 mt-0.5">
                                {index + 1}
                              </span>
                              <p className="text-sm font-semibold text-slate-900 leading-snug">
                                {d.label}
                              </p>
                            </div>
                            {userRating != null && (
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  SCORE_STYLES[userRating]?.text
                                } bg-slate-100`}
                              >
                                {SCORE_STYLES[userRating]?.label}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-2">
                            {SCORE_LABELS.map((label, i) => {
                              const score = i + 1
                              const selected = userRating === score
                              const style = SCORE_STYLES[score]

                              return (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() =>
                                    setScores((s) => ({ ...s, [d.key]: score }))
                                  }
                                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all duration-150 ${
                                    selected
                                      ? style.active
                                      : `border-slate-200 bg-white text-slate-700 ${style.hover}`
                                  }`}
                                >
                                  <span className="text-base font-extrabold">{score}</span>
                                  <span className="text-[10px] font-medium leading-none mt-1 hidden sm:block">
                                    {label}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Feedback Comment */}
                  <div className="space-y-2">
                    <Label htmlFor="comment" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Additional Qualitative Feedback (optional)
                    </Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What specifically stood out during your classes? Any suggestions for this facility?"
                      className="min-h-24 bg-white text-sm"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">
                      {!complete
                        ? `Please complete ${total - answered} remaining indicator(s).`
                        : 'Review complete. Submit your ratings.'}
                    </p>

                    <Button
                      type="submit"
                      disabled={submitting || !complete}
                      className="w-full sm:w-auto gap-2 bg-sky-600 hover:bg-sky-700 shadow-md active:scale-98"
                    >
                      <Send className="size-4" />
                      {submitting ? 'Submitting Assessment…' : 'Submit Assessment'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}