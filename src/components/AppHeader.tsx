import { useLocation } from 'react-router-dom'
import { useAdmin } from '@/components/AdminGate'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  Lock,
  MessageSquareWarning,
  Plus,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

type Props = {
  onOpenReportModal: () => void
  onOpenAdminModal: () => void
}

const ROUTE_INFO: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  '/': { label: 'Dashboard', icon: LayoutDashboard },
  '/feedback': { label: 'Student Feedback', icon: ClipboardList },
  '/report-concern': { label: 'Report Concern', icon: MessageSquareWarning },
  '/facilities': { label: 'Facilities', icon: Gauge },
  '/facilities/condition': { label: 'Facility Condition', icon: Building2 },
  '/monitoring': { label: 'Concern Monitoring', icon: Wrench },
  '/reports': { label: 'Facility Reports', icon: FileBarChart },
}

export function AppHeader({ onOpenReportModal, onOpenAdminModal }: Props) {
  const { pathname } = useLocation()
  const { unlocked } = useAdmin()

  const currentRoute = ROUTE_INFO[pathname] ?? { label: 'Overview', icon: BarChart3 }
  const Icon = currentRoute.icon

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 backdrop-blur-md transition-all">
      {/* Route Breadcrumb */}
      <div className="flex items-center gap-2.5">
        <img
          src="/images/tcc-logo.png"
          alt="TCC"
          className="size-7 rounded-full object-cover ring-1 ring-slate-200 shadow-xs hidden sm:block"
        />
        <div className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shadow-2xs">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span>TCC FacilityTrack</span>
            <span>/</span>
            <span className="text-slate-700">{currentRoute.label}</span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 leading-none mt-0.5">
            {currentRoute.label}
          </h2>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Report Issue Button */}
        <Button
          size="sm"
          onClick={onOpenReportModal}
          className="gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-xs hover:from-sky-700 hover:to-blue-700 hover:shadow-md transition-all active:scale-95 text-xs font-medium"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Report Issue</span>
          <span className="sm:hidden">Report</span>
        </Button>

        {/* Admin Status Pill / Modal Trigger */}
        <button
          type="button"
          onClick={onOpenAdminModal}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all hover:shadow-xs active:scale-95 ${
            unlocked
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
          }`}
          title={unlocked ? 'Admin active. Click to manage or lock.' : 'Click to unlock admin privileges.'}
        >
          {unlocked ? (
            <>
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Admin Active</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </>
          ) : (
            <>
              <Lock className="size-3 text-slate-400" />
              <span className="hidden sm:inline">Unlock Admin</span>
              <span className="sm:hidden">Admin</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}
