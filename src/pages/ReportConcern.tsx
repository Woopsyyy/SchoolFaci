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
import { getCategoryIcon, getFacilityCategoryIcon } from '@/lib/icons'
import { supabase, CONCERN_SEVERITIES } from '@/lib/supabase'
import type { ConcernInsert, Facility } from '@/lib/supabase'
import { useAsync } from '@/lib/useAsync'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Flame,
  Info,
  MapPin,
  Send,
  User,
  Wand2,
} from 'lucide-react'

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

const SEVERITY_INFO: Record<
  string,
  { icon: React.ReactNode; text: string; bg: string; border: string; desc: string }
> = {
  Low: {
    icon: <Info className="size-4 text-emerald-600" />,
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    desc: 'Minor issue; does not halt classes or facility use.',
  },
  Moderate: {
    icon: <AlertTriangle className="size-4 text-amber-600" />,
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    desc: 'Noticeable inconvenience affecting students or equipment.',
  },
  High: {
    icon: <Flame className="size-4 text-rose-600" />,
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    desc: 'Critical failure or safety concern requiring urgent intervention.',
  },
}

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
    if (value.trim().length > 8) {
      setSeverity(suggestSeverity(value))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!facility) {
      setError('Please select the affected facility.')
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

      toast.success('Concern logged successfully', {
        description: `${facility.name} · Marked as ${severity} priority. Track progress under Concern Monitoring.`,
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
    <div className="space-y-6">
      <PageTitle
        title="Report Facility Concern"
        subtitle="Promptly notify school administration of defective, missing, or damaged facilities at Talisay City College."
        badge="Direct Ticketing"
      />

      <ErrorNote error={loadError} />

      {/* Campus Photo Banner */}
      <div className="relative rounded-2xl overflow-hidden h-28 animate-fade-in-up stagger-1">
        <img
          src="/images/tcc-academic-building.jpg"
          alt="TCC Academic Building"
          className="w-full h-full object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/75 via-slate-800/50 to-transparent" />
        <div className="absolute inset-0 flex items-center px-5 gap-3">
          <img src="/images/tcc-logo.png" alt="TCC" className="size-9 rounded-full ring-2 ring-white/25 shrink-0" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-sky-300">TCC Facility Management</div>
            <div className="text-sm font-bold text-white">Report a Campus Concern</div>
          </div>
        </div>
      </div>

      <Card className="mx-auto max-w-3xl rounded-2xl border-slate-200/90 shadow-xs animate-fade-in-up stagger-2">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-6">
            {/* Facility Selector */}
            <div className="space-y-2">
              <Label htmlFor="rc-facility" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Facility with the Problem <span className="text-red-500">*</span>
              </Label>
              <Select
                value={facilityId}
                onValueChange={(v) => (v === null ? setFacilityId('') : setFacilityId(String(v)))}
              >
                <SelectTrigger id="rc-facility" className="h-11 w-full bg-white text-sm">
                  <SelectValue placeholder="Select affected facility…" />
                </SelectTrigger>
                <SelectContent>
                  {data.facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        {getFacilityCategoryIcon(f.category, 'size-3.5 text-sky-600')}
                        <span>{f.name}</span>
                        <span className="text-xs text-slate-400">({f.category})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {facility && (
                <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 text-xs text-sky-900 mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Building2 className="size-4 text-sky-600" />
                    {facility.name} ({facility.category})
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin className="size-3 text-slate-400" />
                    {facility.location ?? 'Campus Building'}
                  </span>
                </div>
              )}
            </div>

            {/* Concern Type: Visual Icon Grid */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Type of Issue
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {CATEGORIES.map((c) => {
                  const selected = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all duration-150 ${
                        selected
                          ? 'border-sky-600 bg-sky-50/80 text-sky-700 font-bold shadow-xs ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`mb-1.5 flex size-8 items-center justify-center rounded-lg ${selected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {getCategoryIcon(c, 'size-4')}
                      </div>
                      <span className="text-xs truncate w-full">{c}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Priority Selection with Auto-suggest Wand */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rc-severity" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Priority Level
                </Label>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <Wand2 className="size-3 text-sky-500" />
                  Auto-detected from description
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                {CONCERN_SEVERITIES.map((sev) => {
                  const selected = (severity ?? 'Moderate') === sev
                  const info = SEVERITY_INFO[sev]
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                        selected
                          ? `${info.bg} ${info.border} ring-2 ring-sky-500 shadow-xs`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">{info.icon}</div>
                      <div>
                        <div className={`text-xs font-bold ${info.text}`}>{sev} Priority</div>
                        <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                          {info.desc}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rc-description" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Describe the Issue <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  {description.length} character(s)
                </span>
              </div>
              <Textarea
                id="rc-description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="e.g. 12 desktop units in Computer Laboratory 1 cannot boot up; power outlet on the right wall has a loose connection."
                className="min-h-28 bg-white text-sm leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                Please be specific regarding quantity, exact location, or hardware involved.
              </p>
            </div>

            {/* Reporter Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="rc-reporter" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="size-3.5 text-slate-400" />
                Your Name / Student Section (optional)
              </Label>
              <Input
                id="rc-reporter"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder="e.g. BSIT 3-A or leave blank to stay anonymous"
                className="bg-white text-sm"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Ticket moves directly to "Reported" in Monitoring</span>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto gap-2 bg-sky-600 hover:bg-sky-700 shadow-md active:scale-98"
              >
                <Send className="size-4" />
                {submitting ? 'Logging Concern…' : 'Submit Concern Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}