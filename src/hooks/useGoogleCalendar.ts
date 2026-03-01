import { useQuery } from '@tanstack/react-query'
import { getUpcomingGoogleEvents, type GoogleCalendarEvent } from '../lib/googleCalendar'

export function useGoogleCalendarEvents() {
  return useQuery({
    queryKey: ['google-calendar-events'],
    queryFn: async () => {
      const events = await getUpcomingGoogleEvents()
      console.log('Google Calendar events fetched:', events)
      return events
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  })
}

export type { GoogleCalendarEvent }
