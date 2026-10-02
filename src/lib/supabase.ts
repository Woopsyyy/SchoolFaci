import type { Database, Json } from './database.types'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Row = Database['public']['Tables']['facilities']['Row']

export type Facility = Row
export type FacilityInsert = Database['public']['Tables']['facilities']['Insert']
export type FacilityUpdate = Database['public']['Tables']['facilities']['Update']
export type Dimension = Database['public']['Tables']['dimensions']['Row']
export type Assessment = Database['public']['Tables']['assessments']['Row']
export type AssessmentInsert = Database['public']['Tables']['assessments']['Insert']
export type AssessmentRating = Database['public']['Tables']['assessment_ratings']['Row']
export type FacilityCondition = Database['public']['Tables']['facility_conditions']['Row']
export type Concern = Database['public']['Tables']['concerns']['Row']
export type ConcernInsert = Database['public']['Tables']['concerns']['Insert']
export type ConcernEvent = Database['public']['Tables']['concern_events']['Row']

export type FacilityPriority = Database['public']['Views']['v_facility_priority']['Row']
export type FacilityScores = Database['public']['Views']['v_facility_scores']['Row']
export type DimensionScores = Database['public']['Views']['v_dimension_scores']['Row']
export type ConcernSummary = Database['public']['Views']['v_concern_summary']['Row']

export type FacilityCategory = Database['public']['Enums']['facility_category']
export type ConcernSeverity = Database['public']['Enums']['concern_severity']
export type ConcernStatus = Database['public']['Enums']['concern_status']

export const CONCERN_STATUSES: ConcernStatus[] = [
  'Reported',
  'Under Review',
  'For Repair',
  'In Progress',
  'Resolved',
]

export const CONCERN_SEVERITIES: ConcernSeverity[] = ['Low', 'Moderate', 'High']
export const FACILITY_CATEGORIES: FacilityCategory[] = [
  'Classroom',
  'Laboratory',
  'Technology',
  'Library',
  'Sanitation',
  'Furniture',
]

export type Priority = 'High' | 'Moderate' | 'Low'

export function isConcernStatus(v: string): v is ConcernStatus {
  return (CONCERN_STATUSES as string[]).includes(v)
}

export function isConcernSeverity(v: string): v is ConcernSeverity {
  return (CONCERN_SEVERITIES as string[]).includes(v)
}

export type { Json }