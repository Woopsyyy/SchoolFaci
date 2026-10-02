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
import { useAsync } from '@/lib/useAsync'
import { Search } from 'lucide-react'

type Props = {
  resetKey: number
  forceReset: () => void
  unlocked: boolean
}

export default function Facilities({ resetKey }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FacilityCategory | 'All'>('All')

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

  return (
    <div>
      <PageTitle
        title="School Facilities"
        subtitle="Current condition status and student perception for every registered facility."
      />

      <ErrorNote error={error} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facilities…"
            className="pl-9"
            aria-label="Search facilities"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['All', ...FACILITY_CATEGORIES] as const).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? 'default' : 'outline'}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading facilities…</p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Avg rating</TableHead>
                  <TableHead className="min-w-40">Satisfaction</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.facility_id}>
                    <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.response_count}</TableCell>
                    <TableCell className="tabular-nums">{ratingText(p.avg_overall_rating)}</TableCell>
                    <TableCell>
                      <Progress
                        value={((p.avg_overall_rating ?? 0) / 5) * 100}
                        className="h-2 w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClasses(p.priority)}`}
                      >
                        {p.priority}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm text-slate-600">
                      {p.rationale}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                      No facilities match this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={reload}>
          Refresh
        </Button>
        <Badge variant="secondary">
          {filtered.length} of {data.priority.length} facilities
        </Badge>
      </div>
    </div>
  )
}