import { useCallback, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AdminProvider, useAdmin } from '@/components/AdminGate'
import { AppSidebar } from '@/components/AppSidebar'
import { AppHeader } from '@/components/AppHeader'
import { BackToTop } from '@/components/BackToTop'
import { AdminAuthModal } from '@/components/modals/AdminAuthModal'
import { QuickReportModal } from '@/components/modals/QuickReportModal'
import Dashboard from '@/pages/Dashboard'
import StudentFeedback from '@/pages/StudentFeedback'
import ReportConcern from '@/pages/ReportConcern'
import Facilities from '@/pages/Facilities'
import FacilityCondition from '@/pages/FacilityCondition'
import Monitoring from '@/pages/Monitoring'
import Reports from '@/pages/Reports'

const BUILD_YEAR = new Date().getFullYear()

function Shell() {
  const { unlocked } = useAdmin()
  const [resetKey, setResetKey] = useState(0)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  /** Bumping this remounts pages so they refetch from Supabase after a write. */
  const forceReset = useCallback(() => setResetKey((k) => k + 1), [])

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 antialiased">
      {/* Sidebar navigation */}
      <AppSidebar onOpenAdminModal={() => setAdminModalOpen(true)} />

      <div className="lg:pl-64 flex min-h-screen flex-col">
        {/* Modern sticky top header */}
        <AppHeader
          onOpenReportModal={() => setReportModalOpen(true)}
          onOpenAdminModal={() => setAdminModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 sm:px-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route
              path="/"
              element={<Dashboard resetKey={resetKey} forceReset={forceReset} unlocked={unlocked} />}
            />
            <Route path="/feedback" element={<StudentFeedback />} />
            <Route path="/report-concern" element={<ReportConcern />} />
            <Route
              path="/facilities"
              element={<Facilities resetKey={resetKey} forceReset={forceReset} unlocked={unlocked} />}
            />
            <Route
              path="/facilities/condition"
              element={<FacilityCondition resetKey={resetKey} forceReset={forceReset} unlocked={unlocked} />}
            />
            <Route
              path="/monitoring"
              element={<Monitoring resetKey={resetKey} forceReset={forceReset} unlocked={unlocked} />}
            />
            <Route path="/reports" element={<Reports resetKey={resetKey} forceReset={forceReset} />} />
          </Routes>
        </main>

        {/* Global Footer */}
        <footer className="no-print border-t border-slate-200/80 bg-white/50 py-5 text-center text-xs text-slate-500 backdrop-blur-xs">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/tcc-logo.png"
                alt="Talisay City College"
                className="size-7 rounded-full object-cover opacity-90"
              />
              <div className="text-left">
                <span className="font-semibold text-slate-700">TCC FacilityTrack</span>
                <span className="text-slate-400"> © {BUILD_YEAR} · Talisay City College</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center sm:text-right">
              Information Technology Research Output · Facility Assessment &amp; Condition Monitoring
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Back to Top Button */}
      <BackToTop />

      {/* Admin Authorization Dialog Modal */}
      <AdminAuthModal open={adminModalOpen} onOpenChange={setAdminModalOpen} />

      {/* Global Quick Report Issue Modal */}
      <QuickReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        onSuccess={forceReset}
      />

      {/* Global Notifications */}
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <AdminProvider>
      <Shell />
    </AdminProvider>
  )
}