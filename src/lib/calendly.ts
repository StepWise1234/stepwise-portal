// Calendly API integration
const CALENDLY_API_KEY = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzcyMjcyMTE4LCJqdGkiOiJjNTVlNTJhMy0yMDI1LTQ5MmUtOWE4Yy05NzU1YzZlODExZGUiLCJ1c2VyX3V1aWQiOiJjYjRhYjRjOC0wMzg2LTQ4NjMtOGE5Yi0wYTdmZGZmMWY1MzQifQ.Kq58evyx1NZpYD_bFztn3EaUKzPHi5f-fRmMw9FCv4QsX-2srUH-9DWUgh8hQ6DPZxuK34SfKdGNp_c-xJZDbw'
const CALENDLY_USER_URI = 'https://api.calendly.com/users/cb4ab4c8-0386-4863-8a9b-0a7fdff1f534'

export const BOOKING_LINKS = {
  chemistry_call: 'https://calendly.com/laela-coaching/chemistry-call',
  interview: 'https://calendly.com/laela-coaching/stepwise-training-interview',
}

export interface CalendlyEvent {
  uri: string
  name: string
  start_time: string
  end_time: string
  event_type: string
  status: string
  invitees_counter: {
    active: number
    limit: number
    total: number
  }
}

export interface CalendlyInvitee {
  uri: string
  email: string
  name: string
  status: string
  created_at: string
}

async function calendlyFetch(endpoint: string): Promise<any> {
  const response = await fetch(`https://api.calendly.com${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${CALENDLY_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Calendly API error: ${response.status}`)
  }

  return response.json()
}

export async function getUpcomingEvents(): Promise<CalendlyEvent[]> {
  const now = new Date().toISOString()
  const data = await calendlyFetch(
    `/scheduled_events?user=${CALENDLY_USER_URI}&status=active&min_start_time=${now}&sort=start_time:asc&count=20`
  )
  return data.collection || []
}

export async function getEventInvitees(eventUri: string): Promise<CalendlyInvitee[]> {
  // Extract event UUID from URI
  const eventId = eventUri.split('/').pop()
  const data = await calendlyFetch(`/scheduled_events/${eventId}/invitees`)
  return data.collection || []
}

export async function getUpcomingEventsWithInvitees(): Promise<Array<CalendlyEvent & { invitee?: CalendlyInvitee }>> {
  const events = await getUpcomingEvents()

  // Fetch invitees for each event
  const eventsWithInvitees = await Promise.all(
    events.map(async (event) => {
      try {
        const invitees = await getEventInvitees(event.uri)
        return {
          ...event,
          invitee: invitees[0], // Usually 1:1 meetings have one invitee
        }
      } catch {
        return { ...event, invitee: undefined }
      }
    })
  )

  return eventsWithInvitees
}

// Filter events that match our pipeline stages
export function filterPipelineEvents(events: CalendlyEvent[]): CalendlyEvent[] {
  const relevantTypes = ['Chemistry Call', 'Training Interview']
  return events.filter(e => relevantTypes.some(t => e.name.includes(t)))
}
