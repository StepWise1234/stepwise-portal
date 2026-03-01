import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
// Using service role key for admin app to bypass RLS
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Types based on your Supabase schema
export interface Training {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  location: string | null
  max_capacity: number | null
  status: 'Open' | 'Filling' | 'Waitlist' | 'Closed' | 'Completed' | null
  training_type: string | null
  training_level: string | null
  cohort_name: string | null
  price_cents: number | null
  spots_filled: number | null
  show_on_apply: boolean | null
  meal_selection_enabled: boolean | null
  created_at: string | null
}

export interface Applicant {
  id: string
  training_id: string | null
  name: string
  email: string | null
  phone: string | null
  address: string | null
  birth_date: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  application_date: string | null
  app_status: 'Received' | 'Under Review' | 'Interview Scheduled' | 'Interview Complete' | 'Accepted' | 'Waitlisted' | 'Declined' | 'Withdrawn' | null
  interview_date: string | null
  interview_notes: string | null
  acceptance: 'Pending' | 'Accepted' | 'Conditional' | 'Waitlisted' | 'Declined' | null
  registration_status: 'Not Started' | 'In Progress' | 'Complete' | 'Cancelled' | null
  payment_status: 'Unpaid' | 'Deposit Paid' | 'Paid in Full' | 'Payment Plan' | 'Refunded' | null
  deposit_received: boolean | null
  signed_waiver: boolean | null
  dietary_preferences: string | null
  allergies: string | null
  physical_health: string | null
  physical_medications: string | null
  mental_health_dx: string | null
  current_mental_health: string | null
  psych_medications: string | null
  // Health screening fields
  stress_level: number | null
  suicide_consideration: string | null
  life_experiences: string[] | null
  cognitive_symptoms: string[] | null
  coping_mechanisms: string[] | null
  support_network: string[] | null
  self_care: string | null
  stress_sources: string | null
  trauma_details: string | null
  journey_work_experience: string | null
  medicine_experience: string | null
  serving_experience: string | null
  training_goals: string | null
  mental_health_support: string[] | null
  psychedelic_medicine_use: string[] | null
  // Additional application fields
  physical_symptoms: string[] | null
  life_circumstances: string | null
  integration_support: string | null
  supplements: string | null
  recreational_drug_use: string | null
  strengths_hobbies: string | null
  anything_else: string | null
  notes: string | null
  pipeline_stage: string | null
  chemistry_call_date: string | null
  chemistry_call_status: string | null
  chemistry_call_notes: string | null
  interview_status: string | null
  interview_notes_detail: string | null
  approval_status: string | null
  approval_date: string | null
  stripe_payment_id: string | null
  payment_amount_cents: number | null
  payment_date: string | null
  accommodation_choice: string | null
  accommodation_confirmed: boolean | null
  online_course_access: boolean | null
  online_course_progress: number | null
  portal_signup_date: string | null
  shipping_tracking_number: string | null
  shipping_carrier: string | null
  shipping_status: string | null
  shipping_date: string | null
  course_level: string | null
  course_access: Record<string, boolean> | null
  last_email_sent_at: string | null
  email_count: number | null
  created_at: string | null
  updated_at: string | null
}

export interface Application {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  birth_date: string | null
  email: string
  phone: string | null
  signal_handle: string | null
  emergency_first_name: string | null
  emergency_last_name: string | null
  emergency_phone: string | null
  street_address: string | null
  street_address_2: string | null
  city: string | null
  state_province: string | null
  postal_code: string | null
  country: string | null
  journey_work_experience: string | null
  medicine_experience: string | null
  serving_experience: string | null
  life_circumstances: string | null
  integration_support: string | null
  physical_health_issues: string | null
  physical_medications: string | null
  supplements: string | null
  allergies: string | null
  physical_symptoms: string[] | null
  dietary_preferences: string[] | null
  dsm_diagnosis: string | null
  mental_health_issues: string | null
  psych_medications: string | null
  recreational_drug_use: string | null
  suicide_consideration: string | null
  mental_health_professional: string | null
  stress_level: number | null
  life_experiences: string[] | null
  stress_sources: string | null
  cognitive_symptoms: string[] | null
  coping_mechanisms: string[] | null
  trauma_details: string | null
  self_care: string | null
  support_network: string[] | null
  strengths_hobbies: string | null
  training_goals: string | null
  anything_else: string | null
  retreat_id: string | null
  status: string | null
  admin_notes: string | null
  user_id: string | null
  psychedelic_medicine_use: string[] | null
  mental_health_support: string[] | null
  accommodation_notes: string | null
  special_accommodations: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Reminder {
  id: string
  applicant_id: string | null
  training_id: string | null
  title: string
  description: string | null
  reminder_type: 'follow_up' | 'deadline' | 'interview' | 'payment' | 'waiver' | 'registration' | 'custom' | null
  due_date: string
  completed: boolean | null
  snoozed_until: string | null
  created_at: string | null
}

export interface EmailTemplate {
  id: string
  stage: string
  template_name: string
  subject: string
  body: string
  variables: string[] | null
  is_default: boolean | null
}

// Pipeline stages in order
export const PIPELINE_STAGES = [
  'lead',
  'chemistry_call',
  'application',
  'interview',
  'approval',
  'payment',
  'onboarding',
  'complete'
] as const

export type PipelineStage = typeof PIPELINE_STAGES[number]

export const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: 'Lead',
  chemistry_call: 'Chemistry Call',
  application: 'Application',
  interview: 'Interview',
  approval: 'Approval',
  payment: 'Payment',
  onboarding: 'Onboarding',
  complete: 'Complete'
}

// Warm to cool gradient across pipeline stages
export const STAGE_COLORS: Record<PipelineStage, string> = {
  lead: '#EF4444',        // Red (warmest)
  chemistry_call: '#F97316', // Orange
  application: '#F59E0B',    // Amber
  interview: '#84CC16',      // Lime
  approval: '#22C55E',       // Green
  payment: '#14B8A6',        // Teal
  onboarding: '#0EA5E9',     // Sky blue
  complete: '#6366F1'        // Indigo (coolest)
}

// Training colors - distinct colors for each training cohort
export const TRAINING_COLORS: Record<string, string> = {
  '1952aca4-ef44-4294-bd63-a467cd800497': '#8B5CF6', // March 30 - April 2, 2026 - Purple
  'c626109f-11a4-4549-991e-022727300feb': '#F59E0B', // March 13 - 16, 2026 - Amber
  '9175fc79-e6ae-43b3-9b69-31b863133ebd': '#10B981', // February 17 - 20, 2026 - Green
  '8b277bc1-b8ca-43e7-a924-6f64c073016c': '#3B82F6', // January 20 - 23, 2026 - Blue
  '9d937387-e9e1-4720-9149-aaedaec3fcc8': '#EC4899', // October 27 - 30, 2025 - Pink
}

// Fallback color for trainings not in the map
export const DEFAULT_TRAINING_COLOR = '#94A3B8'

export function getTrainingColor(trainingId: string | null): string {
  if (!trainingId) return DEFAULT_TRAINING_COLOR
  return TRAINING_COLORS[trainingId] || DEFAULT_TRAINING_COLOR
}

// Course Management Types
export interface Course {
  id: string
  slug: string
  name: string
  description: string | null
  color: string | null
  sort_order: number
  is_default: boolean
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
  lessons?: CourseLesson[]
  resources?: CourseResource[]
}

export interface CourseLesson {
  id: string
  module_id: string
  title: string
  description: string | null
  vimeo_id: string | null
  duration_minutes: number | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface CourseResource {
  id: string
  module_id: string
  title: string
  file_path: string
  resource_type: string
  sort_order: number
  created_at: string
}

export interface UserCourseAccess {
  id: string
  user_id: string
  course_id: string
  granted_at: string
  granted_by: string | null
}

export interface CourseDiscussion {
  id: string
  lesson_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string
}
