import {
  Armchair,
  Bath,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  Fan,
  Flame,
  GraduationCap,
  Hammer,
  HelpCircle,
  Info,
  Lightbulb,
  Monitor,
  Sparkles,
  Wifi,
  Wrench,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import type { ConcernStatus, FacilityCategory, Priority } from '@/lib/supabase'

export function getCategoryIcon(category: string, className = 'size-4') {
  switch (category?.toLowerCase()) {
    case 'computers':
      return <Monitor className={className} />
    case 'internet':
      return <Wifi className={className} />
    case 'furniture':
      return <Armchair className={className} />
    case 'lighting':
      return <Lightbulb className={className} />
    case 'ventilation':
      return <Fan className={className} />
    case 'cleanliness':
      return <Sparkles className={className} />
    case 'electrical':
      return <Zap className={className} />
    case 'structural':
      return <Building2 className={className} />
    default:
      return <HelpCircle className={className} />
  }
}

export function getFacilityCategoryIcon(category: FacilityCategory, className = 'size-4') {
  switch (category) {
    case 'Classroom':
      return <GraduationCap className={className} />
    case 'Laboratory':
      return <Cpu className={className} />
    case 'Technology':
      return <Monitor className={className} />
    case 'Library':
      return <BookOpen className={className} />
    case 'Sanitation':
      return <Bath className={className} />
    case 'Furniture':
      return <Armchair className={className} />
    default:
      return <Building2 className={className} />
  }
}

export function getStatusIcon(status: ConcernStatus, className = 'size-3.5') {
  switch (status) {
    case 'Reported':
      return <Clock className={className} />
    case 'Under Review':
      return <Eye className={className} />
    case 'For Repair':
      return <Wrench className={className} />
    case 'In Progress':
      return <Hammer className={className} />
    case 'Resolved':
      return <CheckCircle2 className={className} />
    default:
      return <Clock className={className} />
  }
}

export function getPriorityIcon(priority: Priority | string, className = 'size-3.5') {
  switch (priority) {
    case 'High':
      return <Flame className={className} />
    case 'Moderate':
      return <AlertTriangle className={className} />
    case 'Low':
      return <Info className={className} />
    default:
      return <Info className={className} />
  }
}
