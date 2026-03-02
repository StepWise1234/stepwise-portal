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

      // Fetch applications to get signal_handle
      const emails = data?.map(a => a.email).filter(Boolean) || []
      let applicationMap: Record<string, { signal_handle: string | null }> = {}

      if (emails.length > 0) {
        const { data: applications } = await supabase
          .from('applications')
          .select('email, signal_handle')
          .in('email', emails)

        applicationMap = (applications || []).reduce((acc, app) => {
          acc[app.email] = { signal_handle: app.signal_handle }
          return acc
        }, {} as Record<string, { signal_handle: string | null }>)
      }

      // Merge application data into applicants
      const enrichedData = data?.map(applicant => ({
        ...applicant,
        signal_handle: applicant.email ? applicationMap[applicant.email]?.signal_handle || null : null
      }))

      return enrichedData as (Applicant & {
        trainings: { name: string; start_date: string } | null
        signal_handle: string | null
      })[]
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
      // First, get the current applicant to check their email and current stage
      const { data: currentApplicant, error: fetchError } = await supabase
        .from('applicants')
        .select('email, pipeline_stage')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Update the stage
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

      // If moving TO payment stage (from a prior stage), auto-grant Beginning course
      const priorStages: PipelineStage[] = ['lead', 'chemistry_call', 'application', 'interview']
      const fromStage = currentApplicant.pipeline_stage as PipelineStage

      if (stage === 'payment' && priorStages.includes(fromStage) && currentApplicant.email) {
        try {
          // Find the user_id from applications table
          const { data: application } = await supabase
            .from('applications')
            .select('user_id')
            .eq('email', currentApplicant.email)
            .maybeSingle()

          if (application?.user_id) {
            // Find the Beginning course
            const { data: beginningCourse } = await supabase
              .from('courses')
              .select('id')
              .eq('slug', 'beginning')
              .single()

            if (beginningCourse) {
              // Grant access to Beginning course
              await supabase
                .from('user_course_access')
                .upsert({
                  user_id: application.user_id,
                  course_id: beginningCourse.id,
                  granted_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id,course_id'
                })

              console.log('Auto-granted Beginning course access for', currentApplicant.email)

              // Send email notification via Supabase Edge Function
              try {
                await supabase.functions.invoke('send-course-access-email', {
                  body: {
                    user_id: application.user_id,
                    email: currentApplicant.email,
                    course_name: 'Beginning'
                  }
                })
                console.log('Course access email sent to', currentApplicant.email)
              } catch (emailError) {
                console.error('Failed to send course access email:', emailError)
              }
            }
          }
        } catch (courseError) {
          console.error('Failed to auto-grant course access:', courseError)
          // Don't throw - the stage move succeeded, course access is secondary
        }
      }

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

// Delete applicant
export function useDeleteApplicant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the applicant to find their email
      const { data: applicant, error: fetchError } = await supabase
        .from('applicants')
        .select('email, training_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Delete related data in order (respecting foreign keys)
      if (applicant.email) {
        // Delete room reservations (by finding their application first)
        const { data: application } = await supabase
          .from('applications')
          .select('id, user_id')
          .eq('email', applicant.email)
          .maybeSingle()

        if (application) {
          // Delete room reservations
          await supabase
            .from('room_reservations')
            .delete()
            .eq('application_id', application.id)

          // Delete meal selections
          await supabase
            .from('meal_selections')
            .delete()
            .eq('user_id', application.user_id)

          // Delete course access
          await supabase
            .from('user_course_access')
            .delete()
            .eq('user_id', application.user_id)

          // Delete the application
          await supabase
            .from('applications')
            .delete()
            .eq('id', application.id)
        }
      }

      // Finally delete the applicant
      const { error } = await supabase
        .from('applicants')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] })
      queryClient.invalidateQueries({ queryKey: ['applicants-by-stage'] })
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
