import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCategoryIcon } from '@/lib/icons'
import { suggestSeverity } from '@/lib/format'
import { supabase, CONCERN_SEVERITIES } from '@/lib/supabase'
import type { ConcernInsert, Facility } from '@/lib/supabase'
import { AlertCircle, PlusCircle, Send, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

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

export function QuickReportModal({ open, onOpenChange, onSuccess }: Props) {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [facilityId, setFacilityId] = useState('')
  const [category, setCategory] = useState('Computers')
  const [severity, setSeverity] = useState<ConcernInsert['severity']>('Moderate')
  const [description, setDescription] = useState('')
  const [reporter, setReporter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && facilities.length === 0) {
      supabase
        .from('facilities')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => {
          if (data) setFacilities(data as Facility[])
        })
    }
  }, [open, facilities.length])

  function handleDescriptionChange(val: string) {
    setDescription(val)
    if (val.trim().length > 8) {
      setSeverity(suggestSeverity(val))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!facilityId) {
      setError('Please select a facility.')
      return
    }
    if (description.trim().length < 10) {
      setError('Please describe the problem in at least 10 characters.')
      return
    }

    setSubmitting(true)
    try {
      const selectedFacility = facilities.find((f) => f.id === facilityId)
      const { error: insertError } = await supabase.from('concerns').insert({
        facility_id: facilityId,
        category,
        severity,
        description: description.trim(),
        status: 'Reported',
        created_by: reporter.trim() || 'Anonymous student',
      })
      if (insertError) throw new Error(insertError.message)

      toast.success('Concern reported successfully', {
        description: `${selectedFacility?.name ?? 'Facility'} · Flagged as ${severity} priority.`,
      })

      setDescription('')
      setReporter('')
      setSeverity('Moderate')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit concern.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-600">
            <PlusCircle className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Quick Action</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Report a School Facility Issue
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Let the administration know what needs fixing or maintenance in Talisay City College.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="quick-facility" className="text-xs font-semibold text-slate-700">
              Select Facility <span className="text-red-500">*</span>
            </label>
            <Select
              value={facilityId}
              onValueChange={(val) => (val === null ? setFacilityId('') : setFacilityId(String(val)))}
            >
              <SelectTrigger id="quick-facility" className="bg-white">
                <SelectValue placeholder="Choose affected facility…" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Concern Category</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                    category === cat
                      ? 'border-sky-500 bg-sky-50 text-sky-700 font-semibold ring-1 ring-sky-400'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {getCategoryIcon(cat, 'size-3.5 shrink-0')}
                  <span className="truncate">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="quick-severity" className="text-xs font-semibold text-slate-700">
                Priority Level
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Wand2 className="size-3 text-sky-500" /> Auto-suggests as you type
              </span>
            </div>
            <Select
              value={severity ?? 'Moderate'}
              onValueChange={(val) => setSeverity(val as ConcernInsert['severity'])}
            >
              <SelectTrigger id="quick-severity" className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONCERN_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} Priority
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quick-desc" className="text-xs font-semibold text-slate-700">
              Problem Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="quick-desc"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="e.g. Broken electric fan on row 3, sparks coming from outlet, water leak…"
              className="min-h-24 bg-white text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quick-reporter" className="text-xs font-semibold text-slate-700">
              Reporter Name or Student Section (optional)
            </label>
            <Input
              id="quick-reporter"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              placeholder="Leave blank for anonymous submission"
              className="bg-white text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-1.5 bg-sky-600 hover:bg-sky-700"
            >
              <Send className="size-3.5" />
              {submitting ? 'Submitting…' : 'Submit Concern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
