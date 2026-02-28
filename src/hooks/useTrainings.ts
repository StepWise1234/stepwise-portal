import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Training } from '../lib/supabase'

export function useTrainings() {
  return useQuery({
    queryKey: ['trainings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) throw error
      return data as Training[]
    },
  })
}

export function useTraining(id: string) {
  return useQuery({
    queryKey: ['training', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, applicants(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Training> }) => {
      const { data, error } = await supabase
        .from('trainings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainings'] })
    },
  })
}
