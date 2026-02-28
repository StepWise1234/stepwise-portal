import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Applicant, type Application, type PipelineStage } from '../lib/supabase'

// Fetch all applicants with optional filters
export function useApplicants(filters?: {
  training_id?: string
  pipeline_stage?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['applicants', filters],
    queryFn: async () => {
      let query = supabase
        .from('applicants')
        .select('*, trainings(name, start_date)')
        .order('created_at', { ascending: false })

      if (filters?.training_id) {
        query = query.eq('training_id', filters.training_id)
      }
      if (filters?.pipeline_stage) {
        query = query.eq('pipeline_stage', filters.pipeline_stage)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as (Applicant & { trainings: { name: string; start_date: string } | null })[]
    },
  })
}

// Fetch single applicant with full details
export function useApplicant(id: string) {
  return useQuery({
    queryKey: ['applicant', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applicants')
        .select('*, trainings(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Applicant & { trainings: any }
    },
    enabled: !!id,
  })
}

// Fetch application data linked by email
export function useApplication(email: string | null) {
  return useQuery({
    queryKey: ['application', email],
    queryFn: async () => {
      if (!email) return null
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (error) throw error
      return data as Application | null
    },
    enabled: !!email,
  })
}

// Update applicant
export function useUpdateApplicant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Applicant> }) => {
      const { data, error } = await supabase
        .from('applicants')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
      queryClient.invalidateQueries({ queryKey: ['applicant', data.id] })
    },
  })
}

// Update application
export function useUpdateApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Application> }) => {
      const { data, error } = await supabase
        .from('applications')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['application', data.email] })
    },
  })
}

// Move applicant to next/previous pipeline stage
export function useMoveStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: PipelineStage }) => {
      const { data, error } = await supabase
        .from('applicants')
        .update({
          pipeline_stage: stage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
    },
  })
}

// Get applicants grouped by pipeline stage
export function useApplicantsByStage() {
  return useQuery({
    queryKey: ['applicants-by-stage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applicants')
        .select('*, trainings(name)')
        .order('updated_at', { ascending: false })

      if (error) throw error

      const grouped: Record<PipelineStage, typeof data> = {
        lead: [],
        chemistry_call: [],
        application: [],
        interview: [],
        approval: [],
        payment: [],
        onboarding: [],
        complete: [],
      }

      for (const applicant of data || []) {
        const stage = (applicant.pipeline_stage || 'lead') as PipelineStage
        if (grouped[stage]) {
          grouped[stage].push(applicant)
        }
      }

      return grouped
    },
  })
}
