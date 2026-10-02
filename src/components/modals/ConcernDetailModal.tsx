import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCategoryIcon, getPriorityIcon, getStatusIcon } from '@/lib/icons'
import { formatDateTime, relativeTime, severityClasses, statusClasses } from '@/lib/format'
import { CONCERN_STATUSES } from '@/lib/supabase'
import type { Concern, ConcernEvent, ConcernStatus } from '@/lib/supabase'
import { Calendar, Check, History, Send, User, Wrench } from 'lucide-react'

type ConcernWithFacility = Concern & { facilities: { name: string } | null }

type Props = {
  concern: ConcernWithFacility | null
  events: ConcernEvent[]
  open: boolean
  onOpenChange: (open: boolean) => void
  unlocked: boolean
  onUpdateStatus?: (concern: ConcernWithFacility, status: ConcernStatus, note?: string) => Promise<void>
}

const STATUS_STEPS: ConcernStatus[] = [
  'Reported',
  'Under Review',
  'For Repair',
  'In Progress',
  'Resolved',
]

export function ConcernDetailModal({
  concern,
  events,
  open,
  onOpenChange,
  unlocked,
  onUpdateStatus,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<ConcernStatus | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  if (!concern) return null

  const currentStatus = selectedStatus ?? concern.status
  const currentStepIndex = STATUS_STEPS.indexOf(concern.status)

  async function handleSaveStatus() {
    if (!onUpdateStatus || !selectedStatus || !concern) return
    setSaving(true)
    try {
      await onUpdateStatus(concern, selectedStatus, note.trim() || undefined)
      setNote('')
      setSelectedStatus(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {getCategoryIcon(concern.category ?? 'Other', 'size-3.5 text-sky-600')}
              {concern.category ?? 'General'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityClasses(concern.severity)}`}>
              {getPriorityIcon(concern.severity, 'size-3.5')}
              {concern.severity} Priority
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses(concern.status)}`}>
              {getStatusIcon(concern.status, 'size-3.5')}
              {concern.status}
            </span>
          </div>

          <DialogTitle className="mt-2 text-xl font-bold text-slate-900">
            {concern.facilities?.name ?? 'School Facility Concern'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <User className="size-3.5 text-slate-400" />
              {concern.created_by || 'Anonymous Student'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5 text-slate-400" />
              {formatDateTime(concern.created_at)} ({relativeTime(concern.created_at)})
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Visual Lifecycle Stepper */}
        <div className="my-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Resolution Progress
          </div>
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex
              const isCurrent = idx === currentStepIndex

              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-sm'
                          : isPast
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPast ? <Check className="size-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`mt-1.5 text-center text-[10px] leading-tight font-medium hidden sm:block ${
                        isCurrent
                          ? 'text-sky-600 font-bold'
                          : isPast
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-1.5 rounded-full transition-colors ${
                        idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Concern Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Report Description</label>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 leading-relaxed shadow-xs">
            {concern.description}
          </div>
        </div>

        {/* Resolution Note if present */}
        {concern.resolution_note && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Check className="size-3.5" />
              Latest Action / Resolution Note
            </div>
            <p className="mt-1 text-sm text-emerald-900">{concern.resolution_note}</p>
          </div>
        )}

        {/* Status History Timeline */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <History className="size-3.5" />
            Activity Log & Timeline
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No historical status changes recorded.</p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {events.map((e) => (
                <div key={e.id} className="relative text-xs">
                  <div className="absolute -left-6 top-1 size-2.5 rounded-full bg-sky-500 ring-4 ring-white" />
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <span>
                      {e.from_status ? `${e.from_status} → ${e.to_status}` : `Reported as ${e.to_status}`}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {formatDateTime(e.created_at)}
                    </span>
                  </div>
                  {e.note && (
                    <p className="mt-0.5 text-slate-600 rounded bg-slate-50 p-2 border border-slate-100">
                      {e.note}
                    </p>
                  )}
                  <div className="mt-0.5 text-[10px] text-slate-400">by {e.actor ?? 'System'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Administrator Update Box */}
        {unlocked && onUpdateStatus && (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-800">
              <Wrench className="size-3.5" />
              Admin Status Update
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Update Status</label>
                <Select
                  value={currentStatus}
                  onValueChange={(val) => setSelectedStatus(val as ConcernStatus)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCERN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Resolution Note (optional)</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Technician deployed, replacement parts ordered…"
                  className="min-h-16 bg-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveStatus}
                disabled={saving || (selectedStatus === concern.status && !note.trim())}
                className="gap-1.5 bg-sky-600 hover:bg-sky-700"
              >
                <Send className="size-3.5" />
                {saving ? 'Updating…' : 'Apply Status Change'}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
