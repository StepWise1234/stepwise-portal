import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Reminder } from '../lib/supabase'

// Fetch active reminders (not completed, not snoozed past now)
export function useActiveReminders() {
  return useQuery({
    queryKey: ['reminders', 'active'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('reminders')
        .select('*, applicants(name, email), trainings(name)')
        .eq('completed', false)
        .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data as (Reminder & {
        applicants: { name: string; email: string } | null
        trainings: { name: string } | null
      })[]
    },
  })
}

// Fetch overdue reminders
export function useOverdueReminders() {
  return useQuery({
    queryKey: ['reminders', 'overdue'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('reminders')
        .select('*, applicants(name, email), trainings(name)')
        .eq('completed', false)
        .lt('due_date', now)
        .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
        .order('due_date', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

// Create reminder
export function useCreateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('reminders')
        .insert(reminder)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })
}

// Complete reminder
export function useCompleteReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({ completed: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })
}

// Snooze reminder
export function useSnoozeReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, until }: { id: string; until: Date }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({ snoozed_until: until.toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })
}
