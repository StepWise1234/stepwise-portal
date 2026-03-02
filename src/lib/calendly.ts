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
  if (!saved) {
    console.log('Calendly: No saved connection in localStorage')
    return null
  }

  try {
    const connection = JSON.parse(saved)
    console.log('Calendly: Connection found, expires_at:', connection.expires_at, 'now:', Date.now())
    // Check if token is expired - expires_at could be in seconds or milliseconds
    const expiresAt = connection.expires_at > 9999999999 ? connection.expires_at : connection.expires_at * 1000
    if (expiresAt && expiresAt < Date.now()) {
      console.log('Calendly: Token expired')
      return null
    }
    console.log('Calendly: Token valid, user_uri:', connection.user_uri)
    return connection
  } catch (e) {
    console.error('Calendly: Error parsing connection', e)
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
  location?: {
    type: string
    location?: string
    join_url?: string
    joinUrl?: string
    data?: {
      id?: string
      password?: string
    }
  }
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

  console.log('Calendly: Fetching', endpoint)
  const response = await fetch(`https://api.calendly.com${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Calendly API error:', response.status, errorText)
    throw new Error(`Calendly API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function getUpcomingEvents(): Promise<CalendlyEvent[]> {
  const connection = getCalendlyConnection()
  if (!connection) {
    console.log('Calendly: No connection found')
    return []
  }

  console.log('Calendly: Fetching events for user:', connection.user_uri)
  const now = new Date().toISOString()
  try {
    const data = await calendlyFetch(
      `/scheduled_events?user=${connection.user_uri}&status=active&min_start_time=${now}&sort=start_time:asc&count=20`
    )
    console.log('Calendly: Raw response:', data)
    const events = data.collection || []
    // Log each event's status for debugging
    events.forEach((e: CalendlyEvent) => console.log('Calendly event:', e.name, 'status:', e.status, 'start:', e.start_time))
    // Only return truly active events
    return events.filter((e: CalendlyEvent) => e.status === 'active')
  } catch (error) {
    console.error('Calendly: Error fetching events:', error)
    return []
  }
}

export async function getEventInvitees(eventUri: string): Promise<CalendlyInvitee[]> {
  // Extract event UUID from URI
  const eventId = eventUri.split('/').pop()
  const data = await calendlyFetch(`/scheduled_events/${eventId}/invitees?status=active`)
  const invitees = data.collection || []
  // Filter to only active invitees (not canceled)
  return invitees.filter((i: CalendlyInvitee) => i.status === 'active')
}

export async function getUpcomingEventsWithInvitees(): Promise<Array<CalendlyEvent & { invitee?: CalendlyInvitee }>> {
  console.log('Calendly: getUpcomingEventsWithInvitees called')
  const events = await getUpcomingEvents()
  console.log('Calendly: Got', events.length, 'events')

  if (events.length === 0) {
    return []
  }

  // Fetch invitees for each event
  const eventsWithInvitees = await Promise.all(
    events.map(async (event) => {
      try {
        const invitees = await getEventInvitees(event.uri)
        console.log('Calendly: Event', event.name, 'has invitees:', invitees)
        return {
          ...event,
          invitee: invitees[0], // Usually 1:1 meetings have one invitee
        }
      } catch (error) {
        console.error('Calendly: Error fetching invitees for', event.name, error)
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
