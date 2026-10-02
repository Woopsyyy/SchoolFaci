import { useCallback, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AdminProvider, useAdmin } from '@/components/AdminGate'
import { AppSidebar } from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import Dashboard from '@/pages/Dashboard'
import StudentFeedback from '@/pages/StudentFeedback'
import ReportConcern from '@/pages/ReportConcern'
import Facilities from '@/pages/Facilities'
import FacilityCondition from '@/pages/FacilityCondition'
import Monitoring from '@/pages/Monitoring'
import Reports from '@/pages/Reports'

const BUILD_YEAR = new Date().getFullYear()

function Shell() {
  const { unlocked, lock } = useAdmin()
  const [resetKey, setResetKey] = useState(0)

  /** Bumping this remounts pages so they refetch from Supabase after a write. */
  const forceReset = useCallback(() => setResetKey((k) => k + 1), [])

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
          <footer className="mt-10 border-t pt-4 text-center text-xs text-slate-500">
            TCC FacilityTrack © {BUILD_YEAR} · Proposed IT Research Output · Talisay
            City College
          </footer>
        </div>
      </div>

      {unlocked && (
        <div className="no-print fixed bottom-4 right-4 z-40">
          <Button size="sm" variant="outline" onClick={lock} className="bg-white shadow-md">
            Lock admin
          </Button>
        </div>
      )}

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