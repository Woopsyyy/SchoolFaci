import type { Dimension } from './supabase'

export const METRICS: { key: string; label: string; kind: 'number' | 'text'; suffix?: string }[] = [
  { key: 'functional_computers', label: 'Functional computers', kind: 'number', suffix: 'units' },
  { key: 'defective_computers', label: 'Defective units', kind: 'number', suffix: 'units' },
  { key: 'internet_availability', label: 'Internet availability', kind: 'number', suffix: '%' },
  { key: 'ventilation', label: 'Ventilation', kind: 'number', suffix: '/ 5' },
  { key: 'lighting', label: 'Lighting', kind: 'number', suffix: '/ 5' },
  { key: 'cleanliness', label: 'Cleanliness', kind: 'number', suffix: '/ 5' },
]

/** Indicators shown for a given facility category. Mirrors the `dimensions` table. */
export function dimensionsFor(
  dimensions: Dimension[],
  category: string,
): Dimension[] {
  const shared = dimensions.filter((d) => d.category === null)
  const specific = dimensions.filter((d) => d.category === category)
  return [...specific, ...shared].sort((a, b) => a.sort_order - b.sort_order)
}