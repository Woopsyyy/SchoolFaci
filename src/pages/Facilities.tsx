import { useMemo, useState } from 'react'
import { PageTitle } from '@/components/AppSidebar'
import { ErrorNote } from '@/components/Feedback'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase, FACILITY_CATEGORIES } from '@/lib/supabase'
import type { FacilityCategory, FacilityPriority } from '@/lib/supabase'
import { priorityClasses, ratingText } from '@/lib/format'
import { getFacilityCategoryIcon, getPriorityIcon } from '@/lib/icons'
import { useAsync } from '@/lib/useAsync'
import { FacilityDetailModal } from '@/components/modals/FacilityDetailModal'
import {
  Building2,
  Eye,
  Filter,
  Flame,
  GraduationCap,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

export default function Facilities({ resetKey, forceReset }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FacilityCategory | 'All'>('All')
  const [selectedFacility, setSelectedFacility] = useState<FacilityPriority | null>(null)

  const { data, loading, error, reload } = useAsync(
    async () => {
      const res = await supabase.from('v_facility_priority').select('*')
      if (res.error) throw new Error(res.error.message)
      return { priority: (res.data ?? []) as FacilityPriority[] }
    },
    [resetKey],
    { priority: [] as FacilityPriority[] },
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.priority.filter((p) => {
      const matchesCategory = category === 'All' || p.category === category
      const matchesSearch = !q || p.name.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [data.priority, search, category])

  const highPriorityCount = useMemo(
    () => data.priority.filter((p) => p.priority === 'High').length,
    [data.priority],
  )

  function handleRefresh() {
    reload()
    forceReset()
    toast.success('Facilities refreshed', { description: 'Latest conditions loaded.' })
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="School Facilities"
        subtitle="Comprehensive register of campus spaces, real-time student satisfaction indices, and priority classifications."
        badge={`${data.priority.length} Registered`}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="gap-1.5 shadow-2xs hover:bg-slate-100"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <ErrorNote error={error} />

      {/* Quick metrics ribbon */}
      <div className="grid gap-3 sm:grid-cols-3 animate-fade-in-up">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Facilities</div>
            <div className="text-xl font-bold text-slate-900">{data.priority.length}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Rated Facilities</div>
            <div className="text-xl font-bold text-slate-900">
              {data.priority.filter((p) => p.response_count > 0).length}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex size-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <Flame className="size-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">High Priority Facilities</div>
            <div className="text-xl font-bold text-slate-900">{highPriorityCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by facility name…"
            className="pl-9 pr-8 bg-white"
            aria-label="Search facilities"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={category === 'All' ? 'default' : 'outline'}
            onClick={() => setCategory('All')}
            className={`gap-1.5 text-xs ${category === 'All' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-white'}`}
          >
            <Filter className="size-3" />
            All
          </Button>
          {FACILITY_CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? 'default' : 'outline'}
              onClick={() => setCategory(c)}
              className={`gap-1.5 text-xs ${category === c ? 'bg-sky-600 hover:bg-sky-700' : 'bg-white'}`}
            >
              {getFacilityCategoryIcon(c, 'size-3')}
              {c}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500 animate-pulse">
          Loading school facilities…
        </div>
      ) : (
        <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Facility</TableHead>
                    <TableHead className="font-bold text-slate-700">Category</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">Responses</TableHead>
                    <TableHead className="font-bold text-slate-700">Avg Rating</TableHead>
                    <TableHead className="min-w-36 font-bold text-slate-700">Satisfaction</TableHead>
                    <TableHead className="font-bold text-slate-700">Priority</TableHead>
                    <TableHead className="font-bold text-slate-700">Analysis & Recommendation</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const score = p.avg_overall_rating ?? 0
                    const satisfaction = p.response_count > 0 ? (score / 5) * 100 : 0
                    return (
                      <TableRow
                        key={p.facility_id}
                        onClick={() => setSelectedFacility(p)}
                        className="cursor-pointer transition-colors hover:bg-sky-50/40"
                      >
                        <TableCell className="font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shrink-0">
                              {getFacilityCategoryIcon(p.category, 'size-3.5')}
                            </span>
                            <span>{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {p.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-medium tabular-nums">
                          {p.response_count}
                        </TableCell>
                        <TableCell className="font-bold tabular-nums text-slate-800">
                          {ratingText(p.avg_overall_rating)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={satisfaction} className="h-2 w-24" />
                            <span className="text-[11px] text-slate-500 tabular-nums">
                              {satisfaction > 0 ? `${satisfaction.toFixed(0)}%` : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClasses(
                              p.priority,
                            )}`}
                          >
                            {getPriorityIcon(p.priority, 'size-3')}
                            {p.priority}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs whitespace-normal text-xs text-slate-600 leading-snug">
                          {p.rationale}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-400 hover:text-sky-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFacility(p)
                            }}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14 text-center text-slate-500">
                        <GraduationCap className="mx-auto size-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No facilities found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting your search query or category filter.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Status Badge */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <Badge variant="secondary" className="px-2.5 py-1">
          Showing {filtered.length} of {data.priority.length} registered campus spaces
        </Badge>
        <span className="text-[11px] text-slate-400">
          Click any row to open the facility detail inspection modal
        </span>
      </div>

      {/* Facility Inspection Modal */}
      <FacilityDetailModal
        facility={selectedFacility}
        open={selectedFacility !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFacility(null)
        }}
      />
    </div>
  )
}