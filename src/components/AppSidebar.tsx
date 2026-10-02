import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  Lock,
  MessageSquareWarning,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdmin } from '@/components/AdminGate'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feedback', label: 'Student Feedback', icon: ClipboardList },
  { to: '/report-concern', label: 'Report Concern', icon: MessageSquareWarning },
  { to: '/facilities', label: 'Facilities', icon: Gauge },
  { to: '/facilities/condition', label: 'Facility Condition', icon: Building2 },
  { to: '/monitoring', label: 'Concern Monitoring', icon: Wrench },
  { to: '/reports', label: 'Reports & Analytics', icon: FileBarChart },
]

const MOBILE_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feedback', label: 'Feedback', icon: ClipboardList },
  { to: '/report-concern', label: 'Report', icon: MessageSquareWarning },
  { to: '/facilities', label: 'Facilities', icon: Gauge },
  { to: '/monitoring', label: 'Monitoring', icon: Wrench },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
]

type AppSidebarProps = {
  onOpenAdminModal?: () => void
}

export function AppSidebar({ onOpenAdminModal }: AppSidebarProps) {
  const { pathname } = useLocation()
  const { unlocked } = useAdmin()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white shadow-xl lg:flex">
        {/* Branding header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {/* TCC Official Logo */}
            <div className="relative shrink-0">
              <img
                src="/images/tcc-logo.png"
                alt="Talisay City College Logo"
                className="size-11 rounded-full object-cover ring-2 ring-sky-400/60 shadow-lg shadow-sky-500/30"
              />
              <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-white leading-tight">FacilityTrack</span>
                <span className="rounded bg-sky-500/20 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-sky-300">
                  PRO
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-400 truncate">Talisay City College</div>
            </div>
          </div>
        </div>

        {/* Main navigation */}
        <div className="px-3 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400/80">
          Main Menu
        </div>
        <nav className="flex-1 space-y-1.5 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white hover:translate-x-1',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                      isActive ? 'text-white' : 'text-sky-400/80 group-hover:text-sky-300',
                    )}
                  />
                  <span className="flex-1">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin Quick Action Card in Sidebar */}
        <div className="p-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                {unlocked ? (
                  <ShieldCheck className="size-4 text-emerald-400" />
                ) : (
                  <Lock className="size-4 text-slate-400" />
                )}
                Admin Control
              </span>
              <span
                className={cn(
                  'size-2 rounded-full',
                  unlocked ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500',
                )}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {unlocked ? 'Session authenticated. Status updates unlocked.' : 'Admin features locked for demonstration.'}
            </p>
            {onOpenAdminModal && (
              <button
                type="button"
                onClick={onOpenAdminModal}
                className="mt-2.5 w-full rounded-lg bg-white/10 py-1.5 text-center text-xs font-medium text-slate-200 hover:bg-white/20 hover:text-white transition-all active:scale-98"
              >
                {unlocked ? 'Manage Admin Session' : 'Enter Admin Passphrase'}
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-white/10 px-4 py-3 text-[11px] text-slate-400 flex items-center justify-between">
          <span>IT Research Output</span>
          <span className="flex items-center gap-1 text-[10px] text-sky-400">
            <Sparkles className="size-3" /> v2.4
          </span>
        </div>
      </aside>

      {/* Mobile top navigation bar */}
      <nav className="no-print sticky top-0 z-30 flex items-center justify-around border-b border-slate-200 bg-white/95 px-2 py-1 backdrop-blur-md lg:hidden shadow-xs">
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-medium transition-all rounded-lg',
                active
                  ? 'text-sky-600 font-bold bg-sky-50/80 scale-105'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-sky-600' : 'text-slate-400')} />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}

export function PageTitle({
  title,
  subtitle,
  badge,
  action,
}: {
  title: string
  subtitle?: string
  badge?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/20">
            <BarChart3 className="size-5" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {badge && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-500 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </header>
  )
}