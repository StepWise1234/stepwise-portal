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
    // Optimistic update - immediately move the card in the UI
    onMutate: async ({ id, stage }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['applicants-by-stage'] })

      // Snapshot the previous value
      type ApplicantWithTraining = Applicant & { trainings?: { name: string } | null }
      type StageData = Record<PipelineStage, ApplicantWithTraining[]>

      const previousData = queryClient.getQueryData<StageData>(['applicants-by-stage'])
      console.log('onMutate called', { id, stage, hasPreviousData: !!previousData })

      if (previousData) {
        // Deep clone via JSON to ensure completely new references
        const newData: StageData = JSON.parse(JSON.stringify(previousData))

        // Find the applicant in any stage
        let movedApplicant: ApplicantWithTraining | undefined
        let fromStage: PipelineStage | undefined

        for (const stageKey of Object.keys(newData) as PipelineStage[]) {
          const idx = newData[stageKey].findIndex((a: ApplicantWithTraining) => a.id === id)
          if (idx !== -1) {
            fromStage = stageKey
            movedApplicant = { ...newData[stageKey][idx], pipeline_stage: stage }
            newData[stageKey].splice(idx, 1)
            console.log('Found applicant in stage', fromStage, 'moving to', stage)
            break
          }
        }

        // Add to the new stage
        if (movedApplicant && fromStage !== stage) {
          newData[stage].unshift(movedApplicant)
          console.log('Setting new query data')
          queryClient.setQueryData(['applicants-by-stage'], newData)
        }
      }

      return { previousData }
    },
    // If mutation fails, roll back to the previous value
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['applicants-by-stage'], context.previousData)
      }
    },
    // Refetch after success to ensure data is in sync (with small delay to not race)
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['applicants-by-stage'] })
        queryClient.invalidateQueries({ queryKey: ['applicants'] })
      }, 500)
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
