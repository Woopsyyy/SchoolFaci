import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TriangleAlertIcon, CircleCheckIcon } from 'lucide-react'

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <Alert variant="destructive" className="mb-4">
      <TriangleAlertIcon />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="break-words">{error}</AlertDescription>
    </Alert>
  )
}

/** Shown when Supabase has not been seeded yet, so the blank page is explained. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <CircleCheckIcon className="mx-auto mb-3 size-8 text-slate-300" />
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{label}</p>
}