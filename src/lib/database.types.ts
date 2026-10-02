export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string
          code: string
          name: string
          category: Database['public']['Enums']['facility_category']
          location: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          category: Database['public']['Enums']['facility_category']
          location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          category?: Database['public']['Enums']['facility_category']
          location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      dimensions: {
        Row: {
          key: string
          label: string
          sort_order: number
          category: Database['public']['Enums']['facility_category'] | null
          description: string | null
          is_active: boolean
        }
        Insert: {
          key: string
          label: string
          sort_order: number
          category?: Database['public']['Enums']['facility_category'] | null
          description?: string | null
          is_active?: boolean
        }
        Update: {
          key?: string
          label?: string
          sort_order?: number
          category?: Database['public']['Enums']['facility_category'] | null
          description?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      facility_conditions: {
        Row: {
          id: string
          facility_id: string
          metric_key: string
          value: string | null
          numeric_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          metric_key: string
          value?: string | null
          numeric_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          metric_key?: string
          value?: string | null
          numeric_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          id: string
          facility_id: string
          respondent_name: string | null
          respondent_year: string | null
          overall_rating: number | null
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          respondent_name?: string | null
          respondent_year?: string | null
          overall_rating?: number | null
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          respondent_name?: string | null
          respondent_year?: string | null
          overall_rating?: number | null
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
      assessment_ratings: {
        Row: {
          assessment_id: string
          dimension_key: string
          score: number
        }
        Insert: {
          assessment_id: string
          dimension_key: string
          score: number
        }
        Update: {
          assessment_id?: string
          dimension_key?: string
          score?: number
        }
        Relationships: []
      }
      concerns: {
        Row: {
          id: string
          facility_id: string
          category: string | null
          severity: Database['public']['Enums']['concern_severity']
          description: string
          status: Database['public']['Enums']['concern_status']
          resolution_note: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          category?: string | null
          severity?: Database['public']['Enums']['concern_severity']
          description: string
          status?: Database['public']['Enums']['concern_status']
          resolution_note?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          category?: string | null
          severity?: Database['public']['Enums']['concern_severity']
          description?: string
          status?: Database['public']['Enums']['concern_status']
          resolution_note?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'concerns_facility_id_fkey'
            columns: ['facility_id']
            isOneToOne: false
            referencedRelation: 'facilities'
            referencedColumns: ['id']
          },
        ]
      }
      concern_events: {
        Row: {
          id: string
          concern_id: string
          from_status: Database['public']['Enums']['concern_status'] | null
          to_status: Database['public']['Enums']['concern_status']
          note: string | null
          actor: string | null
          created_at: string
        }
        Insert: {
          id?: string
          concern_id: string
          from_status?: Database['public']['Enums']['concern_status'] | null
          to_status: Database['public']['Enums']['concern_status']
          note?: string | null
          actor?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          concern_id?: string
          from_status?: Database['public']['Enums']['concern_status'] | null
          to_status?: Database['public']['Enums']['concern_status']
          note?: string | null
          actor?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_facility_scores: {
        Row: {
          facility_id: string
          code: string
          name: string
          category: Database['public']['Enums']['facility_category']
          location: string | null
          response_count: number
          avg_overall_rating: number | null
          satisfaction_pct: number | null
        }
        Relationships: []
      }
      v_dimension_scores: {
        Row: {
          facility_id: string
          facility_name: string
          dimension_key: string | null
          label: string | null
          sort_order: number | null
          rating_count: number
          avg_score: number | null
        }
        Relationships: []
      }
      v_concern_summary: {
        Row: {
          facility_id: string
          name: string
          total_concerns: number
          open_concerns: number
          high_open_concerns: number
          resolved_concerns: number
          latest_concern_at: string | null
        }
        Relationships: []
      }
      v_facility_priority: {
        Row: {
          facility_id: string
          name: string
          category: Database['public']['Enums']['facility_category']
          avg_overall_rating: number | null
          response_count: number
          open_concerns: number
          high_open_concerns: number
          priority: 'High' | 'Moderate' | 'Low'
          rationale: string
        }
        Relationships: []
      }
    }
    Functions: {
      set_concern_status: {
        Args: {
          _concern_id: string
          _to_status: Database['public']['Enums']['concern_status']
          _admin_passphrase: string
          _note?: string | null
          _actor?: string
        }
        Returns: Database['public']['Tables']['concerns']['Row']
      }
      update_facility_condition: {
        Args: {
          _facility_id: string
          _metric_key: string
          _numeric_value: number | null
          _value: string | null
          _admin_passphrase: string
          _actor?: string
        }
        Returns: Database['public']['Tables']['facility_conditions']['Row']
      }
    }
    Enums: {
      facility_category: 'Classroom' | 'Laboratory' | 'Technology' | 'Library' | 'Sanitation' | 'Furniture'
      concern_severity: 'Low' | 'Moderate' | 'High'
      concern_status: 'Reported' | 'Under Review' | 'For Repair' | 'In Progress' | 'Resolved'
    }
    CompositeTypes: Record<string, never>
  }
}