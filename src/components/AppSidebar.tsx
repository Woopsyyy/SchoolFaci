import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  MessageSquareWarning,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feedback', label: 'Student Feedback', icon: ClipboardList },
  { to: '/report-concern', label: 'Report Concern', icon: MessageSquareWarning },
  { to: '/facilities', label: 'Facilities', icon: Gauge },
  { to: '/monitoring', label: 'Concern Monitoring', icon: Wrench },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
]

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/feedback', label: 'Feedback', icon: ClipboardList },
  { to: '/report-concern', label: 'Report', icon: MessageSquareWarning },
  { to: '/monitoring', label: 'Monitor', icon: Wrench },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-linear-to-b from-slate-900 to-blue-950 text-white lg:flex">
        <div className="px-4 py-6 text-center">
          <div className="text-4xl">🏫</div>
          <div className="mt-2 text-lg font-bold tracking-tight text-sky-400">FacilityTrack</div>
          <div className="text-[11px] text-slate-300">Talisay City College</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-sky-600 font-medium text-white'
                    : 'text-slate-200 hover:bg-sky-800/60',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-4 text-[11px] text-slate-400">
          Proposed IT Research Output
        </div>
      </aside>

      {/* Mobile top nav */}
      <nav className="sticky top-0 z-30 flex justify-around border-b bg-white/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]',
                active ? 'text-sky-600' : 'text-slate-500',
              )}
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
        <BarChart3 className="size-6 text-sky-600" />
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    </header>
  )
}