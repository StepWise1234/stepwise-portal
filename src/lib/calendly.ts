// Calendly API integration

// Default booking links (fallback if OAuth not connected)
// Configure these via Settings > Calendly Integration
const DEFAULT_BOOKING_LINKS = {
  chemistry_call: '',
  interview: '',
}

// Get OAuth connection from localStorage
function getCalendlyConnection(): { access_token: string; user_uri: string } | null {
  const saved = localStorage.getItem('calendly_connection')
  if (!saved) return null

  try {
    const connection = JSON.parse(saved)
    // Check if token is expired
    if (connection.expires_at && connection.expires_at < Date.now()) {
      return null
    }
    return connection
  } catch {
    return null
  }
}

// Get booking links - checks localStorage for OAuth-configured links first
export function getBookingLinks(): { chemistry_call: string; interview: string } {
  const savedChemistry = localStorage.getItem('calendly_chemistry_call')
  const savedInterview = localStorage.getItem('calendly_interview')

  return {
    chemistry_call: savedChemistry || DEFAULT_BOOKING_LINKS.chemistry_call,
    interview: savedInterview || DEFAULT_BOOKING_LINKS.interview,
  }
}

// Legacy export for backwards compatibility
export const BOOKING_LINKS = DEFAULT_BOOKING_LINKS

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
  const connection = getCalendlyConnection()

  if (!connection) {
    throw new Error('Calendly not connected. Please connect in Settings.')
  }

  const response = await fetch(`https://api.calendly.com${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Calendly API error: ${response.status}`)
  }

  return response.json()
}

export async function getUpcomingEvents(): Promise<CalendlyEvent[]> {
  const connection = getCalendlyConnection()
  if (!connection) {
    return []
  }

  const now = new Date().toISOString()
  const data = await calendlyFetch(
    `/scheduled_events?user=${connection.user_uri}&status=active&min_start_time=${now}&sort=start_time:asc&count=20`
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

// Check if Calendly is connected
export function isCalendlyConnected(): boolean {
  return getCalendlyConnection() !== null
}
