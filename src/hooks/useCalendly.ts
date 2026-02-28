import { useQuery } from '@tanstack/react-query'
import { getUpcomingEventsWithInvitees, filterPipelineEvents, type CalendlyEvent, type CalendlyInvitee } from '../lib/calendly'

export type EventWithInvitee = CalendlyEvent & { invitee?: CalendlyInvitee }

export function useUpcomingCalls() {
  return useQuery({
    queryKey: ['calendly-events'],
    queryFn: async () => {
      const events = await getUpcomingEventsWithInvitees()
      return filterPipelineEvents(events) as EventWithInvitee[]
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
