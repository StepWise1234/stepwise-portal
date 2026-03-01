// Google Calendar API integration

const SUPABASE_URL = 'https://ybludwecmqghoheotzzz.supabase.co'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus: string
  }>
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
    }>
  }
}

interface GoogleCalendarConnection {
  access_token: string
  refresh_token: string
  expires_at: number
  email: string
}

// Get Google Calendar connection from localStorage
function getGoogleCalendarConnection(): GoogleCalendarConnection | null {
  const saved = localStorage.getItem('google_calendar_connection')
  if (!saved) return null

  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}

// Check if token needs refresh
async function getValidToken(): Promise<string | null> {
  const connection = getGoogleCalendarConnection()
  if (!connection) return null

  // If token expires in less than 5 minutes, refresh it
  if (connection.expires_at < Date.now() + 5 * 60 * 1000) {
    if (!connection.refresh_token) return null

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: connection.refresh_token }),
      })

      if (!response.ok) return null

      const data = await response.json()

      // Update stored connection
      const updated = {
        ...connection,
        access_token: data.access_token,
        expires_at: data.expires_at,
      }
      localStorage.setItem('google_calendar_connection', JSON.stringify(updated))

      return data.access_token
    } catch {
      return null
    }
  }

  return connection.access_token
}

export async function getUpcomingGoogleEvents(): Promise<GoogleCalendarEvent[]> {
  const token = await getValidToken()
  if (!token) return []

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      console.error('Google Calendar API error:', await response.text())
      return []
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Failed to fetch Google Calendar events:', error)
    return []
  }
}

export function isGoogleCalendarConnected(): boolean {
  return getGoogleCalendarConnection() !== null
}

export function getGoogleCalendarEmail(): string | null {
  const connection = getGoogleCalendarConnection()
  return connection?.email || null
}

export function disconnectGoogleCalendar(): void {
  localStorage.removeItem('google_calendar_connection')
}
