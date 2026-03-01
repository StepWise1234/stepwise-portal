import { useState, useEffect } from 'react'
import { Calendar, Check, X, ExternalLink, RefreshCw } from 'lucide-react'
import { disconnectGoogleCalendar } from '../lib/googleCalendar'

const SUPABASE_URL = 'https://ybludwecmqghoheotzzz.supabase.co'

interface CalendlyConnection {
  access_token: string
  refresh_token: string
  expires_at: number
  user_uri: string
  org_uri: string
}

interface GoogleCalendarConnection {
  access_token: string
  refresh_token: string
  expires_at: number
  email: string
}

interface EventType {
  uri: string
  name: string
  scheduling_url: string
  active: boolean
}

export function Settings() {
  const [calendlyConnection, setCalendlyConnection] = useState<CalendlyConnection | null>(null)
  const [googleConnection, setGoogleConnection] = useState<GoogleCalendarConnection | null>(null)
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loadingEventTypes, setLoadingEventTypes] = useState(false)
  const [selectedChemistryCall, setSelectedChemistryCall] = useState<string>('')
  const [selectedInterview, setSelectedInterview] = useState<string>('')

  // Check for OAuth callback params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Handle Calendly callback
    if (params.get('calendly_connected') === 'true') {
      const connection: CalendlyConnection = {
        access_token: params.get('calendly_token') || '',
        refresh_token: params.get('calendly_refresh') || '',
        expires_at: parseInt(params.get('calendly_expires') || '0'),
        user_uri: params.get('calendly_user_uri') || '',
        org_uri: params.get('calendly_org_uri') || '',
      }

      localStorage.setItem('calendly_connection', JSON.stringify(connection))
      setCalendlyConnection(connection)
      window.history.replaceState({}, '', window.location.pathname)
    } else {
      const saved = localStorage.getItem('calendly_connection')
      if (saved) {
        setCalendlyConnection(JSON.parse(saved))
      }
    }

    // Handle Google Calendar callback
    if (params.get('gcal_connected') === 'true') {
      const connection: GoogleCalendarConnection = {
        access_token: params.get('gcal_token') || '',
        refresh_token: params.get('gcal_refresh') || '',
        expires_at: parseInt(params.get('gcal_expires') || '0'),
        email: params.get('gcal_email') || '',
      }

      localStorage.setItem('google_calendar_connection', JSON.stringify(connection))
      setGoogleConnection(connection)
      window.history.replaceState({}, '', window.location.pathname)
    } else {
      const saved = localStorage.getItem('google_calendar_connection')
      if (saved) {
        setGoogleConnection(JSON.parse(saved))
      }
    }

    // Load saved event type selections
    const savedChemistry = localStorage.getItem('calendly_chemistry_call')
    const savedInterview = localStorage.getItem('calendly_interview')
    if (savedChemistry) setSelectedChemistryCall(savedChemistry)
    if (savedInterview) setSelectedInterview(savedInterview)
  }, [])

  // Fetch event types when connected
  useEffect(() => {
    if (calendlyConnection?.access_token && calendlyConnection?.user_uri) {
      fetchEventTypes()
    }
  }, [calendlyConnection])

  const fetchEventTypes = async () => {
    if (!calendlyConnection) return

    setLoadingEventTypes(true)
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/calendly-oauth/event-types?user_uri=${encodeURIComponent(calendlyConnection.user_uri)}`,
        {
          headers: {
            Authorization: `Bearer ${calendlyConnection.access_token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setEventTypes(data.collection || [])
      }
    } catch (error) {
      console.error('Failed to fetch event types:', error)
    }
    setLoadingEventTypes(false)
  }

  const connectCalendly = () => {
    const redirectUri = encodeURIComponent(window.location.origin + '/settings')
    window.location.href = `${SUPABASE_URL}/functions/v1/calendly-oauth/authorize?redirect_uri=${redirectUri}`
  }

  const disconnectCalendly = () => {
    localStorage.removeItem('calendly_connection')
    localStorage.removeItem('calendly_chemistry_call')
    localStorage.removeItem('calendly_interview')
    setCalendlyConnection(null)
    setEventTypes([])
    setSelectedChemistryCall('')
    setSelectedInterview('')
  }

  const connectGoogleCalendar = () => {
    const redirectUri = encodeURIComponent(window.location.origin + '/settings')
    window.location.href = `${SUPABASE_URL}/functions/v1/google-calendar-oauth/authorize?redirect_uri=${redirectUri}`
  }

  const handleDisconnectGoogle = () => {
    disconnectGoogleCalendar()
    setGoogleConnection(null)
  }

  const saveEventTypeSelection = (type: 'chemistry' | 'interview', url: string) => {
    if (type === 'chemistry') {
      setSelectedChemistryCall(url)
      localStorage.setItem('calendly_chemistry_call', url)
    } else {
      setSelectedInterview(url)
      localStorage.setItem('calendly_interview', url)
    }
  }

  const isCalendlyTokenExpired = calendlyConnection && calendlyConnection.expires_at < Date.now()
  const isGoogleTokenExpired = googleConnection && googleConnection.expires_at < Date.now()

  return (
    <div className="page settings">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="subtitle">Configure your admin dashboard</p>
      </header>

      {/* Google Calendar Integration */}
      <section className="card calendly-settings">
        <div className="card-header">
          <h3><Calendar size={20} /> Google Calendar</h3>
          {googleConnection && !isGoogleTokenExpired && (
            <span className="status-badge connected"><Check size={14} /> Connected</span>
          )}
        </div>

        {!googleConnection ? (
          <div className="calendly-connect">
            <p className="description">
              Connect your Google Calendar to see all your meetings in the Action Center.
            </p>
            <button onClick={connectGoogleCalendar} className="btn-primary">
              <Calendar size={16} />
              Connect Google Calendar
            </button>
          </div>
        ) : isGoogleTokenExpired ? (
          <div className="calendly-expired">
            <p className="description warning">
              Your Google Calendar connection has expired. Please reconnect.
            </p>
            <div className="button-group">
              <button onClick={connectGoogleCalendar} className="btn-primary">
                <RefreshCw size={16} />
                Reconnect
              </button>
              <button onClick={handleDisconnectGoogle} className="btn-secondary">
                <X size={16} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="calendly-connected">
            <div className="connection-info">
              <div className="field readonly">
                <label>Google Account</label>
                <span>{googleConnection.email}</span>
              </div>
              <button onClick={handleDisconnectGoogle} className="btn-danger-small">
                <X size={14} /> Disconnect
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Calendly Integration */}
      <section className="card calendly-settings">
        <div className="card-header">
          <h3><Calendar size={20} /> Calendly Integration</h3>
          {calendlyConnection && !isCalendlyTokenExpired && (
            <span className="status-badge connected"><Check size={14} /> Connected</span>
          )}
        </div>

        {!calendlyConnection ? (
          <div className="calendly-connect">
            <p className="description">
              Connect your Calendly account to schedule calls directly from the dashboard.
            </p>
            <button onClick={connectCalendly} className="btn-primary">
              <Calendar size={16} />
              Connect Calendly
            </button>
          </div>
        ) : isCalendlyTokenExpired ? (
          <div className="calendly-expired">
            <p className="description warning">
              Your Calendly connection has expired. Please reconnect.
            </p>
            <div className="button-group">
              <button onClick={connectCalendly} className="btn-primary">
                <RefreshCw size={16} />
                Reconnect
              </button>
              <button onClick={disconnectCalendly} className="btn-secondary">
                <X size={16} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="calendly-connected">
            <div className="connection-info">
              <div className="field readonly">
                <label>Calendly Account</label>
                <span>{calendlyConnection.user_uri.split('/').pop()}</span>
              </div>
              <button onClick={disconnectCalendly} className="btn-danger-small">
                <X size={14} /> Disconnect
              </button>
            </div>

            <div className="event-type-mapping">
              <h4>Map Event Types</h4>
              <p className="description">
                Select which Calendly event types to use for each booking action.
              </p>

              {loadingEventTypes ? (
                <p>Loading event types...</p>
              ) : eventTypes.length === 0 ? (
                <p className="empty">No active event types found in your Calendly account.</p>
              ) : (
                <div className="event-type-selectors">
                  <div className="field">
                    <label>Chemistry Call</label>
                    <select
                      value={selectedChemistryCall}
                      onChange={(e) => saveEventTypeSelection('chemistry', e.target.value)}
                    >
                      <option value="">Select event type...</option>
                      {eventTypes.map((et) => (
                        <option key={et.uri} value={et.scheduling_url}>
                          {et.name}
                        </option>
                      ))}
                    </select>
                    {selectedChemistryCall && (
                      <a href={selectedChemistryCall} target="_blank" rel="noopener noreferrer" className="preview-link">
                        <ExternalLink size={12} /> Preview
                      </a>
                    )}
                  </div>

                  <div className="field">
                    <label>Interview</label>
                    <select
                      value={selectedInterview}
                      onChange={(e) => saveEventTypeSelection('interview', e.target.value)}
                    >
                      <option value="">Select event type...</option>
                      {eventTypes.map((et) => (
                        <option key={et.uri} value={et.scheduling_url}>
                          {et.name}
                        </option>
                      ))}
                    </select>
                    {selectedInterview && (
                      <a href={selectedInterview} target="_blank" rel="noopener noreferrer" className="preview-link">
                        <ExternalLink size={12} /> Preview
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3>Email Settings</h3>
        <p className="description">Email is configured through Proton Mail Bridge on the server.</p>
        <div className="fields-grid">
          <div className="field readonly">
            <label>Provider</label>
            <span>Proton Mail (via IMAP/SMTP Bridge)</span>
          </div>
          <div className="field readonly">
            <label>Email Address</label>
            <span>stepwisetraining@proton.me</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Database</h3>
        <p className="description">Connected to Supabase</p>
        <div className="fields-grid">
          <div className="field readonly">
            <label>Project URL</label>
            <span>ybludwecmqghoheotzzz.supabase.co</span>
          </div>
          <div className="field readonly">
            <label>Status</label>
            <span className="status-indicator connected">Connected</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Pipeline Stages</h3>
        <p className="description">The pipeline stages used to track applicants</p>
        <ol className="stages-list">
          <li><span className="stage-dot" style={{ background: '#94a3b8' }}></span> Lead</li>
          <li><span className="stage-dot" style={{ background: '#f59e0b' }}></span> Chemistry Call</li>
          <li><span className="stage-dot" style={{ background: '#3b82f6' }}></span> Application</li>
          <li><span className="stage-dot" style={{ background: '#8b5cf6' }}></span> Interview</li>
          <li><span className="stage-dot" style={{ background: '#ec4899' }}></span> Approval</li>
          <li><span className="stage-dot" style={{ background: '#10b981' }}></span> Payment</li>
          <li><span className="stage-dot" style={{ background: '#06b6d4' }}></span> Onboarding</li>
          <li><span className="stage-dot" style={{ background: '#22c55e' }}></span> Complete</li>
        </ol>
      </section>

      <section className="card">
        <h3>About</h3>
        <p className="description">StepWise Admin Dashboard v2.0</p>
        <p className="description">Built with React + TypeScript + Supabase</p>
      </section>
    </div>
  )
}
