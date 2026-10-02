import type { ConcernSeverity, ConcernStatus } from './supabase'

export const SCORE_LABELS = ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] as const

export function scoreLabel(score: number): string {
  return SCORE_LABELS[score - 1] ?? '—'
}

export function scoreColor(score: number | null): string {
  if (score == null) return 'bg-slate-300'
  if (score < 2.5) return 'bg-red-500'
  if (score < 3.5) return 'bg-orange-500'
  if (score < 4.2) return 'bg-amber-400'
  return 'bg-emerald-500'
}

export function pctColor(pct: number | null): string {
  if (pct == null) return 'text-muted-foreground'
  if (pct < 50) return 'text-red-600'
  if (pct < 70) return 'text-orange-600'
  return 'text-emerald-600'
}

export function priorityClasses(priority: string): string {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-800'
    case 'Moderate':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-emerald-100 text-emerald-800'
  }
}

export function severityClasses(severity: ConcernSeverity): string {
  switch (severity) {
    case 'High':
      return 'bg-red-100 text-red-800'
    case 'Moderate':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function statusClasses(status: ConcernStatus): string {
  switch (status) {
    case 'Resolved':
      return 'bg-emerald-100 text-emerald-800'
    case 'In Progress':
    case 'For Repair':
      return 'bg-blue-100 text-blue-800'
    case 'Under Review':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-slate-200 text-slate-800'
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

export function ratingText(avg: number | null): string {
  return avg == null ? 'No data' : `${avg.toFixed(2)} / 5`
}

/** Suggest a severity from the number of keywords that indicate urgency. */
export function suggestSeverity(description: string): ConcernSeverity {
  const high = /(not? working|defective|broken|damage|crash|leak|fire|electrical|unstable|no internet|unavailable|impossible|danger|unsafe|collapse)/i
  const low = /(minor|small|slight|paint|clean|cosmetic|peeling)/i
  if (high.test(description)) return 'High'
  if (low.test(description)) return 'Low'
  return 'Moderate'
}