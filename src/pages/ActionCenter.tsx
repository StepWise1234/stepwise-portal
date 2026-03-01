import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isPast, isToday, addDays, isTomorrow } from 'date-fns'
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Calendar,
  User,
  Mail,
  Phone,
  Timer,
  Video,
  ExternalLink
} from 'lucide-react'
import { useActiveReminders, useCompleteReminder, useSnoozeReminder } from '../hooks/useReminders'
import { useApplicants } from '../hooks/useApplicants'
import { useTrainings } from '../hooks/useTrainings'
import { useUpcomingCalls } from '../hooks/useCalendly'
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendar'
import { STAGE_COLORS, STAGE_LABELS, type PipelineStage } from '../lib/supabase'

interface UnifiedEvent {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  type: 'calendly' | 'google'
  attendeeEmail?: string
  attendeeName?: string
  meetingLink?: string
}

export function ActionCenter() {
  const { data: reminders } = useActiveReminders()
  const { data: applicants } = useApplicants()
  const { data: trainings } = useTrainings()
  const { data: calendlyCalls } = useUpcomingCalls()
  const { data: googleEvents } = useGoogleCalendarEvents()
  const completeReminder = useCompleteReminder()
  const snoozeReminder = useSnoozeReminder()

  // Merge Calendly and Google Calendar events
  const allEvents: UnifiedEvent[] = [
    // Calendly events
    ...(calendlyCalls?.map(call => ({
      id: call.uri,
      title: call.name,
      startTime: new Date(call.start_time),
      endTime: new Date(call.end_time),
      type: 'calendly' as const,
      attendeeEmail: call.invitee?.email,
      attendeeName: call.invitee?.name,
    })) || []),
    // Google Calendar events
    ...(googleEvents?.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled',
      startTime: new Date(event.start.dateTime || event.start.date || ''),
      endTime: event.end.dateTime ? new Date(event.end.dateTime) : undefined,
      type: 'google' as const,
      attendeeEmail: event.attendees?.[0]?.email,
      attendeeName: event.attendees?.[0]?.displayName,
      meetingLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
    })) || []),
  ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Calculate urgent items
  const overdueReminders = reminders?.filter(r => isPast(new Date(r.due_date))) || []
  const todayReminders = reminders?.filter(r => isToday(new Date(r.due_date))) || []
  const upcomingReminders = reminders?.filter(r => !isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date))) || []

  // Find stale leads (in lead stage for more than 7 days)
  const staleLeads = applicants?.filter(a => {
    if (a.pipeline_stage !== 'lead') return false
    const created = new Date(a.created_at || '')
    const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 7
  }) || []

  // Find unpaid accepted applicants
  const unpaidAccepted = applicants?.filter(a =>
    a.pipeline_stage === 'payment' && a.payment_status === 'Unpaid'
  ) || []

  // Upcoming trainings (next 30 days)
  const upcomingTrainings = trainings?.filter(t => {
    if (!t.start_date) return false
    const start = new Date(t.start_date)
    const daysUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return daysUntil > 0 && daysUntil <= 30
  }) || []

  // Split events into today/tomorrow and upcoming
  const todayEvents = allEvents.filter(e => isToday(e.startTime))
  const tomorrowEvents = allEvents.filter(e => isTomorrow(e.startTime))
  const laterEvents = allEvents.filter(e => !isToday(e.startTime) && !isTomorrow(e.startTime))

  // Match attendees to applicants
  const findApplicantByEmail = (email?: string) => {
    if (!email || !applicants) return null
    return applicants.find(a => a.email?.toLowerCase() === email.toLowerCase())
  }

  const handleComplete = (id: string) => {
    completeReminder.mutate(id)
  }

  const handleSnooze = (id: string, days: number) => {
    snoozeReminder.mutate({ id, until: addDays(new Date(), days) })
  }

  return (
    <div className="page action-center">
      <header className="page-header">
        <h1>Action Center</h1>
        <p className="subtitle">Items requiring your attention</p>
      </header>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <section className="calls-section today">
          <h2 className="section-title">
            <Video className="icon today" />
            Today's Meetings
          </h2>
          <div className="calls-list">
            {todayEvents.map(event => {
              const matchedApplicant = findApplicantByEmail(event.attendeeEmail)
              return (
                <div key={event.id} className="call-card today">
                  <div className="call-time">
                    <span className="time-display">{format(event.startTime, 'h:mm a')}</span>
                    <span className={`call-type ${event.type}`}>
                      {event.type === 'calendly' ? '📅' : '🗓️'} {event.title}
                    </span>
                  </div>
                  <div className="call-info">
                    <h3>{event.attendeeName || event.title}</h3>
                    {event.attendeeEmail && (
                      <span className="email"><Mail size={12} /> {event.attendeeEmail}</span>
                    )}
                  </div>
                  <div className="call-actions">
                    {event.meetingLink && (
                      <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-join">
                        Join <ExternalLink size={12} />
                      </a>
                    )}
                    {matchedApplicant ? (
                      <Link to={`/people/${matchedApplicant.id}`} className="btn-link">
                        View profile <ChevronRight size={14} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Tomorrow's Events */}
      {tomorrowEvents.length > 0 && (
        <section className="calls-section tomorrow">
          <h2 className="section-title">
            <Calendar className="icon" />
            Tomorrow's Meetings
          </h2>
          <div className="calls-list">
            {tomorrowEvents.map(event => {
              const matchedApplicant = findApplicantByEmail(event.attendeeEmail)
              return (
                <div key={event.id} className="call-card">
                  <div className="call-time">
                    <span className="time-display">{format(event.startTime, 'h:mm a')}</span>
                    <span className={`call-type ${event.type}`}>
                      {event.type === 'calendly' ? '📅' : '🗓️'} {event.title}
                    </span>
                  </div>
                  <div className="call-info">
                    <h3>{event.attendeeName || event.title}</h3>
                    {event.attendeeEmail && (
                      <span className="email"><Mail size={12} /> {event.attendeeEmail}</span>
                    )}
                  </div>
                  <div className="call-actions">
                    {matchedApplicant ? (
                      <Link to={`/people/${matchedApplicant.id}`} className="btn-link">
                        View profile <ChevronRight size={14} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Urgent Section */}
      {(overdueReminders.length > 0 || staleLeads.length > 0 || unpaidAccepted.length > 0) && (
        <section className="urgent-section">
          <h2 className="section-title">
            <AlertCircle className="icon urgent" />
            Urgent
          </h2>
          <div className="card-grid">
            {overdueReminders.map(reminder => (
              <div key={reminder.id} className="action-card urgent">
                <div className="card-header">
                  <span className="badge urgent">Overdue</span>
                  <span className="time">{formatDistanceToNow(new Date(reminder.due_date))} ago</span>
                </div>
                <h3>{reminder.title}</h3>
                {reminder.applicants && (
                  <Link to={`/people/${reminder.applicant_id}`} className="person-link">
                    <User size={14} />
                    {reminder.applicants.name}
                  </Link>
                )}
                <p className="description">{reminder.description}</p>
                <div className="card-actions">
                  <button onClick={() => handleComplete(reminder.id)} className="btn-complete">
                    <CheckCircle2 size={16} /> Done
                  </button>
                  <button onClick={() => handleSnooze(reminder.id, 1)} className="btn-snooze">
                    <Timer size={16} /> +1 day
                  </button>
                </div>
              </div>
            ))}

            {staleLeads.slice(0, 3).map(lead => (
              <div key={lead.id} className="action-card warning">
                <div className="card-header">
                  <span className="badge warning">Stale Lead</span>
                  <span className="time">{formatDistanceToNow(new Date(lead.created_at || ''))} old</span>
                </div>
                <h3>{lead.name}</h3>
                <div className="contact-info">
                  {lead.email && <span><Mail size={14} /> {lead.email}</span>}
                  {lead.phone && <span><Phone size={14} /> {lead.phone}</span>}
                </div>
                <Link to={`/people/${lead.id}`} className="btn-link">
                  View profile <ChevronRight size={16} />
                </Link>
              </div>
            ))}

            {unpaidAccepted.slice(0, 3).map(applicant => (
              <div key={applicant.id} className="action-card warning">
                <div className="card-header">
                  <span className="badge warning">Payment Pending</span>
                </div>
                <h3>{applicant.name}</h3>
                <p className="description">Accepted but hasn't paid yet</p>
                <Link to={`/people/${applicant.id}`} className="btn-link">
                  View profile <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today Section */}
      {todayReminders.length > 0 && (
        <section className="today-section">
          <h2 className="section-title">
            <Clock className="icon today" />
            Today
          </h2>
          <div className="card-grid">
            {todayReminders.map(reminder => (
              <div key={reminder.id} className="action-card today">
                <div className="card-header">
                  <span className="badge today">{reminder.reminder_type}</span>
                  <span className="time">{format(new Date(reminder.due_date), 'h:mm a')}</span>
                </div>
                <h3>{reminder.title}</h3>
                {reminder.applicants && (
                  <Link to={`/people/${reminder.applicant_id}`} className="person-link">
                    <User size={14} />
                    {reminder.applicants.name}
                  </Link>
                )}
                <p className="description">{reminder.description}</p>
                <div className="card-actions">
                  <button onClick={() => handleComplete(reminder.id)} className="btn-complete">
                    <CheckCircle2 size={16} /> Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {laterEvents.length > 0 && (
        <section className="calls-section upcoming">
          <h2 className="section-title">
            <Video className="icon" />
            Upcoming Meetings
          </h2>
          <div className="calls-list compact">
            {laterEvents.slice(0, 10).map(event => {
              const matchedApplicant = findApplicantByEmail(event.attendeeEmail)
              return (
                <div key={event.id} className="call-card compact">
                  <div className="call-date">
                    {format(event.startTime, 'MMM d')}
                  </div>
                  <div className="call-time-compact">
                    {format(event.startTime, 'h:mm a')}
                  </div>
                  <div className="call-info">
                    <span className="name">{event.attendeeName || event.title}</span>
                    <span className="type">{event.type === 'calendly' ? '📅' : '🗓️'} {event.title}</span>
                  </div>
                  {matchedApplicant && (
                    <Link to={`/people/${matchedApplicant.id}`} className="profile-link">
                      <User size={14} />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      <section className="upcoming-section">
        <h2 className="section-title">
          <Calendar className="icon" />
          Upcoming
        </h2>
        <div className="card-grid">
          {upcomingReminders.slice(0, 6).map(reminder => (
            <div key={reminder.id} className="action-card">
              <div className="card-header">
                <span className="badge">{reminder.reminder_type}</span>
                <span className="time">{format(new Date(reminder.due_date), 'MMM d')}</span>
              </div>
              <h3>{reminder.title}</h3>
              {reminder.applicants && (
                <Link to={`/people/${reminder.applicant_id}`} className="person-link">
                  <User size={14} />
                  {reminder.applicants.name}
                </Link>
              )}
            </div>
          ))}

          {upcomingTrainings.map(training => (
            <div key={training.id} className="action-card training">
              <div className="card-header">
                <span className="badge training">Training</span>
                <span className="time">{format(new Date(training.start_date!), 'MMM d')}</span>
              </div>
              <h3>{training.name}</h3>
              <p className="description">
                {training.spots_filled || 0} / {training.max_capacity} enrolled
              </p>
              <Link to={`/trainings`} className="btn-link">
                View training <ChevronRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="stats-section">
        <h2 className="section-title">Pipeline Overview</h2>
        <div className="stats-grid">
          {(['lead', 'chemistry_call', 'application', 'interview', 'approval', 'payment', 'onboarding', 'complete'] as PipelineStage[]).map(stage => {
            const count = applicants?.filter(a => a.pipeline_stage === stage).length || 0
            return (
              <Link to={`/pipeline`} key={stage} className="stat-card" style={{ borderColor: STAGE_COLORS[stage] }}>
                <span className="stat-number" style={{ color: STAGE_COLORS[stage] }}>{count}</span>
                <span className="stat-label">{STAGE_LABELS[stage]}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
