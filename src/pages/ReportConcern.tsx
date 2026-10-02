import { useMemo, useState } from 'react'
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { suggestSeverity } from '@/lib/format'
import { supabase, CONCERN_SEVERITIES } from '@/lib/supabase'
import type { ConcernInsert, Facility } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'
import { Send, Wand2 } from 'lucide-react'

const CATEGORIES = [
  'Computers',
  'Internet',
  'Furniture',
  'Lighting',
  'Ventilation',
  'Cleanliness',
  'Electrical',
  'Structural',
  'Other',
]

export default function ReportConcern() {
  const [facilityId, setFacilityId] = useState('')
  const [category, setCategory] = useState('Computers')
  const [severity, setSeverity] = useState<ConcernInsert['severity']>('Moderate')
  const [description, setDescription] = useState('')
  const [reporter, setReporter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, error: loadError } = useAsync(
    async () => {
      const res = await supabase.from('facilities').select('*').eq('is_active', true).order('name')
      if (res.error) throw new Error(res.error.message)
      return { facilities: (res.data ?? []) as Facility[] }
    },
    [],
    { facilities: [] as Facility[] },
  )

  const facility = useMemo(
    () => data.facilities.find((f) => f.id === facilityId) ?? null,
    [data.facilities, facilityId],
  )

  function onDescriptionChange(value: string) {
    setDescription(value)
    // Keep severity in sync with what the student typed until they override it.
    if (value.trim().length > 8) setSeverity(suggestSeverity(value))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!facility) {
      setError('Please select the facility with the problem.')
      return
    }
    if (description.trim().length < 10) {
      setError('Please describe the concern in at least 10 characters.')
      return
    }

    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('concerns').insert({
        facility_id: facility.id,
        category,
        severity,
        description: description.trim(),
        status: 'Reported',
        created_by: reporter.trim() || 'Anonymous student',
      })
      if (insertError) throw new Error(insertError.message)

      toast.success('Concern reported', {
        description: `${facility.name} · marked as ${severity} priority. Track it under Concern Monitoring.`,
      })
      setDescription('')
      setReporter('')
      setSeverity('Moderate')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the concern.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageTitle
        title="Report Facility Concern"
        subtitle="Tell the school what is broken. Reports start as “Reported” and move through review, repair, and resolution."
      />

      <ErrorNote error={loadError} />

      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="rc-facility">Facility</Label>
              <Select
                value={facilityId}
                onValueChange={(v) => (v === null ? setFacilityId('') : setFacilityId(String(v)))}
              >
                <SelectTrigger id="rc-facility" className="h-10 w-full">
                  <SelectValue placeholder="Select the affected facility…" />
                </SelectTrigger>
                <SelectContent>
                  {data.facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rc-category">Concern type</Label>
                <Select value={category} onValueChange={(v) => setCategory(v === null ? '' : String(v))}>
                  <SelectTrigger id="rc-category" className="h-10 w-full">
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rc-severity">Suggested priority</Label>
                <Select
                  value={severity ?? 'Moderate'}
                  onValueChange={(v) => setSeverity(v as ConcernInsert['severity'])}
                >
                  <SelectTrigger id="rc-severity" className="h-10 w-full">
                    <SelectValue placeholder="Select priority…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCERN_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Wand2 className="size-3" />
                  Suggested from your description; you can override it.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc-description">Describe the problem</Label>
              <Textarea
                id="rc-description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="e.g. 15 computers in Computer Laboratory 1 are not functioning."
                className="min-h-28"
              />
              <p className="text-xs text-slate-500">
                Be specific about the quantity and location of the problem.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc-reporter">Your name / section (optional)</Label>
              <Input
                id="rc-reporter"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder="Leave blank to stay anonymous"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              <Send />
              {submitting ? 'Submitting…' : 'Submit concern'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}