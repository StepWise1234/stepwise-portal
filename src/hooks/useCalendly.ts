import { useQuery } from '@tanstack/react-query'
import { getUpcomingEventsWithInvitees, type CalendlyEvent, type CalendlyInvitee } from '../lib/calendly'

export type EventWithInvitee = CalendlyEvent & { invitee?: CalendlyInvitee }

export function useUpcomingCalls() {
  return useQuery({
    queryKey: ['calendly-events'],
    queryFn: async () => {
      try {
        const events = await getUpcomingEventsWithInvitees()
        console.log('Calendly events fetched:', events)
        return events as EventWithInvitee[]
      } catch (error) {
        console.error('Calendly fetch error:', error)
        return []
      }
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  })
}

export function useAllUpcomingEvents() {
  return useQuery({
    queryKey: ['calendly-all-events'],
    queryFn: getUpcomingEventsWithInvitees,
    refetchInterval: 60000,
    staleTime: 30000,
  })
}
