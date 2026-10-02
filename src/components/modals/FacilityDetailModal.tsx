import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getFacilityCategoryIcon, getPriorityIcon } from '@/lib/icons'
import { priorityClasses, ratingText } from '@/lib/format'
import type { FacilityPriority } from '@/lib/supabase'
import { Building2, CheckCircle2, ClipboardList, MapPin, MessageSquareWarning, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Props = {
  facility: FacilityPriority | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenReportModal?: (facilityId: string) => void
}

export function FacilityDetailModal({
  facility,
  open,
  onOpenChange,
  onOpenReportModal,
}: Props) {
  const navigate = useNavigate()

  if (!facility) return null

  const score = facility.avg_overall_rating ?? 0
  const satisfactionPct = facility.response_count > 0 ? (score / 5) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {getFacilityCategoryIcon(facility.category, 'size-3.5 text-sky-600')}
              {facility.category}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityClasses(
                facility.priority,
              )}`}
            >
              {getPriorityIcon(facility.priority, 'size-3 text-current')}
              {facility.priority} Priority
            </span>
          </div>

          <DialogTitle className="mt-2 text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="size-5 text-sky-600 shrink-0" />
            {facility.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="size-3.5 text-slate-400" />
            Talisay City College Campus Facility
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rating Summary Card */}
          <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-sky-50/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Student Rating Score
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {ratingText(facility.avg_overall_rating)}
                  </span>
                  <span className="text-sm font-medium text-slate-500">/ 5.0</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-5 ${
                      star <= Math.round(score)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Student Satisfaction</span>
                <span className="font-semibold">{satisfactionPct.toFixed(1)}%</span>
              </div>
              <Progress value={satisfactionPct} className="h-2" />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <ClipboardList className="size-3.5 text-slate-400" />
                {facility.response_count} student responses
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {facility.open_concerns} active concern(s)
              </span>
            </div>
          </div>

          {/* Priority & Rationale */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Priority Recommendation
            </div>
            <p className="text-sm font-medium text-slate-800 leading-snug">
              {facility.rationale}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              navigate('/feedback')
            }}
            className="gap-1.5"
          >
            <ClipboardList className="size-3.5 text-sky-600" />
            Rate This Facility
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                if (onOpenReportModal) {
                  onOpenReportModal(facility.facility_id)
                } else {
                  navigate('/report-concern')
                }
              }}
              className="gap-1.5 bg-sky-600 hover:bg-sky-700"
            >
              <MessageSquareWarning className="size-3.5" />
              Report Issue
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
