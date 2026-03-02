import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ApplicationAccommodationInfo {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  training_id: string | null
  dietary_preferences: string[] | null
  dietary_other: string | null
  allergies: string | null
  accommodation_notes: string | null
  special_accommodations: string | null
  accommodation_choice: string | null
  meal_selections: Record<string, { lunch?: string; dinner?: string }> | null
}

// Fetch all applications with accommodation info
export function useAllApplications() {
  return useQuery({
    queryKey: ['all_applications_accommodation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, user_id, first_name, last_name, email, training_id, dietary_preferences, dietary_other, allergies, accommodation_notes, special_accommodations, accommodation_choice, meal_selections')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching applications:', error)
        throw error
      }
      return data as ApplicationAccommodationInfo[]
    },
  })
}

// Fetch applications for a specific training
export function useTrainingApplications(trainingId: string | null) {
  return useQuery({
    queryKey: ['training_applications', trainingId],
    queryFn: async () => {
      if (!trainingId) return []
      const { data, error } = await supabase
        .from('applications')
        .select('id, user_id, first_name, last_name, email, training_id, dietary_preferences, dietary_other, allergies, accommodation_notes, special_accommodations, accommodation_choice, meal_selections')
        .eq('training_id', trainingId)
        .order('last_name', { ascending: true })

      if (error) {
        console.error('Error fetching training applications:', error)
        throw error
      }
      return data as ApplicationAccommodationInfo[]
    },
    enabled: !!trainingId,
  })
}
