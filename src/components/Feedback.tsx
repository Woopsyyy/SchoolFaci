import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, FolderOpen, Loader2 } from 'lucide-react'

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <Alert variant="destructive" className="mb-4 animate-fade-in-scale">
      <AlertCircle className="size-4" />
      <AlertTitle>Notice / Error</AlertTitle>
      <AlertDescription className="break-words text-xs">{error}</AlertDescription>
    </Alert>
  )
}

/** Shown when Supabase has not been seeded yet or list is empty. */
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-xs">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <FolderOpen className="size-6" />
      </div>
      <h3 className="font-bold text-slate-800 text-base">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 leading-relaxed">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
      <Loader2 className="size-6 animate-spin text-sky-600" />
      <p className="text-xs font-medium">{label}</p>
    </div>
  )
}