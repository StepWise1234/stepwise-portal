import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isPast, isToday, addDays, isTomorrow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Calendar,
  User,
  Mail,
  Timer,
  Video,
  ExternalLink,
  MessageCircle,
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  ArrowUpRight,
  BookOpen
} from 'lucide-react'
import { useActiveReminders, useCompleteReminder, useSnoozeReminder } from '../hooks/useReminders'
import { useApplicants } from '../hooks/useApplicants'
import { useTrainings } from '../hooks/useTrainings'
import { useUpcomingCalls } from '../hooks/useCalendly'
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendar'
import { STAGE_COLORS, STAGE_LABELS, type PipelineStage } from '../lib/supabase'
import { supabase } from '../lib/supabase'

interface UnifiedEvent {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  type: 'calendly' | 'google'
  attendeeEmail?: string
  attendeeName?: string
  meetingLink?: string
  applicantId?: string
}

interface ParticipantQuestion {
  id: string
  application_id: string
  question: string
  status: string
  created_at: string
  application?: {
    id: string
    first_name: string
    last_name: string
    email: string
    preferred_name: string | null
  }
}

interface CourseDiscussion {
  id: string
  lesson_id: string
  user_id: string
  content: string
  created_at: string
  lesson?: {
    id: string
    title: string
    module?: {
      id: string
      title: string
      course?: {
        id: string
        name: string
      }
    }
  }
  application?: {
    id: string
    first_name: string
    last_name: string
    email: string
    preferred_name: string | null
  }
}

export function ActionCenter() {
  const { data: reminders } = useActiveReminders()
  const { data: applicants } = useApplicants()
  const { data: trainings } = useTrainings()
  const { data: calendlyCalls } = useUpcomingCalls()
  const { data: googleEvents } = useGoogleCalendarEvents()
  const completeReminder = useCompleteReminder()
  const snoozeReminder = useSnoozeReminder()

  // Fetch pending questions from portal
  const { data: pendingQuestions } = useQuery({
    queryKey: ['pending_questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participant_questions')
        .select(`
          *,
          application:applications(id, first_name, last_name, email, preferred_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as ParticipantQuestion[]
    },
  })

  // Fetch recent course discussions
  const { data: recentDiscussions } = useQuery({
    queryKey: ['recent_discussions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_discussions')
        .select(`
          id,
          lesson_id,
          user_id,
          content,
          created_at,
          lesson:course_lessons(
            id,
            title,
            module:course_modules(
              id,
              title,
              course:courses(id, name)
            )
          )
        `)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error

      // Get applications for user IDs
      const userIds = data.map(d => d.user_id).filter(Boolean)
      const { data: apps } = await supabase
        .from('applications')
        .select('id, first_name, last_name, email, preferred_name, user_id')
        .in('user_id', userIds)

      return data.map(d => {
        const lessonData = Array.isArray(d.lesson) ? d.lesson[0] : d.lesson
        const moduleData = lessonData?.module ? (Array.isArray(lessonData.module) ? lessonData.module[0] : lessonData.module) : undefined
        const courseData = moduleData?.course ? (Array.isArray(moduleData.course) ? moduleData.course[0] : moduleData.course) : undefined
        return {
          id: d.id,
          lesson_id: d.lesson_id,
          user_id: d.user_id,
          content: d.content,
          created_at: d.created_at,
          lesson: lessonData ? {
            id: lessonData.id,
            title: lessonData.title,
            module: moduleData ? {
              id: moduleData.id,
              title: moduleData.title,
              course: courseData ? { id: courseData.id, name: courseData.name } : undefined
            } : undefined
          } : undefined,
          application: apps?.find(a => a.user_id === d.user_id)
        }
      }) as CourseDiscussion[]
    },
  })

  // Merge Calendly and Google Calendar events with applicant matching
  const findApplicantByEmail = (email?: string) => {
    if (!email || !applicants) return null
    return applicants.find(a => a.email?.toLowerCase() === email.toLowerCase())
  }

  const findApplicantByName = (name?: string) => {
    if (!name || !applicants) return null
    const nameLower = name.toLowerCase()
    return applicants.find(a => a.name?.toLowerCase() === nameLower)
  }

  // Build events list, preferring Calendly data (has better invitee info) over Google Calendar duplicates
  const calendlyEvents: UnifiedEvent[] = (calendlyCalls?.map(call => {
    const matched = findApplicantByEmail(call.invitee?.email) || findApplicantByName(call.invitee?.name)
    // Get Zoom/meeting link from Calendly location - check multiple possible structures
    const loc = call.location as any
    const meetingLink = loc?.join_url || loc?.joinUrl || loc?.data?.join_url || loc?.location
    console.log('Calendly call:', call.name, 'location:', JSON.stringify(loc), 'extracted meetingLink:', meetingLink)
    return {
      id: call.uri,
      title: call.name,
      startTime: new Date(call.start_time),
      endTime: new Date(call.end_time),
      type: 'calendly' as const,
      attendeeEmail: call.invitee?.email,
      attendeeName: call.invitee?.name,
      meetingLink,
      applicantId: matched?.id,
    }
  }) || [])

  // Create a set of Calendly event start times (rounded to minute) for deduplication
  // Calendly syncs to Google Calendar, so we dedupe by matching start times
  const calendlyStartTimes = new Set(calendlyEvents.map(e =>
    Math.floor(e.startTime.getTime() / 60000) // Round to minute
  ))

  const googleOnlyEvents: UnifiedEvent[] = (googleEvents || [])
    .filter(event => {
      // Skip events with "Canceled" in the title (Calendly marks canceled events this way)
      if (event.summary?.toLowerCase().includes('canceled')) {
        console.log('Skipping Canceled event:', event.summary)
        return false
      }

      const startTime = new Date(event.start.dateTime || event.start.date || '')
      const startMinute = Math.floor(startTime.getTime() / 60000)

      // Skip if a Calendly event starts at the same minute (likely a sync)
      if (calendlyStartTimes.has(startMinute)) {
        console.log('Deduping Google event (matches Calendly time):', event.summary, startTime)
        return false
      }
      return true
    })
    .map(event => {
      const externalAttendee = event.attendees?.find(a =>
        a.responseStatus !== 'organizer' && !a.email?.includes('laelaml')
      )
      const attendeeEmail = externalAttendee?.email || event.attendees?.[0]?.email
      const attendeeName = externalAttendee?.displayName || event.attendees?.[0]?.displayName || event.summary
      const matched = findApplicantByEmail(attendeeEmail) || findApplicantByName(attendeeName)
      return {
        id: event.id,
        title: event.summary || 'Untitled',
        startTime: new Date(event.start.dateTime || event.start.date || ''),
        endTime: event.end.dateTime ? new Date(event.end.dateTime) : undefined,
        type: 'google' as const,
        attendeeEmail: attendeeEmail,
        attendeeName: attendeeName,
        meetingLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
        applicantId: matched?.id,
      }
    })

  const allEvents = [...calendlyEvents, ...googleOnlyEvents]
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Calculate metrics
  const overdueReminders = reminders?.filter(r => isPast(new Date(r.due_date))) || []
  const todayReminders = reminders?.filter(r => isToday(new Date(r.due_date))) || []
  const upcomingReminders = reminders?.filter(r => !isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date))) || []

  const staleLeads = applicants?.filter(a => {
    if (a.pipeline_stage !== 'lead') return false
    const created = new Date(a.created_at || '')
    const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 7
  }) || []

  const unpaidAccepted = applicants?.filter(a =>
    a.pipeline_stage === 'payment' && a.payment_status === 'Unpaid'
  ) || []

  // Get next 3 upcoming trainings (future start dates)
  const upcomingTrainings = trainings?.filter(t => {
    if (!t.start_date) return false
    const start = new Date(t.start_date)
    return start.getTime() > Date.now()
  }).slice(0, 3) || []

  // Calculate actual enrollment counts from applicants assigned to each training
  const getEnrollmentCount = (trainingId: string) => {
    if (!applicants) return 0
    return applicants.filter(a =>
      a.training_id === trainingId &&
      ['payment', 'onboarding', 'complete'].includes(a.pipeline_stage || '')
    ).length
  }

  const todayEvents = allEvents.filter(e => isToday(e.startTime))
  const tomorrowEvents = allEvents.filter(e => isTomorrow(e.startTime))
  const laterEvents = allEvents.filter(e => !isToday(e.startTime) && !isTomorrow(e.startTime))

  const handleComplete = (id: string) => {
    completeReminder.mutate(id)
  }

  const handleSnooze = (id: string, days: number) => {
    snoozeReminder.mutate({ id, until: addDays(new Date(), days) })
  }

  // Calculate pipeline stats
  const pipelineStats = (['lead', 'chemistry_call', 'application', 'interview', 'approval', 'payment', 'onboarding', 'complete'] as PipelineStage[]).map(stage => ({
    stage,
    count: applicants?.filter(a => a.pipeline_stage === stage).length || 0
  }))

  const totalActive = pipelineStats.slice(0, -1).reduce((acc, s) => acc + s.count, 0)

  // Combine all urgent items and limit to 6
  const allUrgentItems = [
    ...overdueReminders.map(r => ({ type: 'overdue' as const, item: r })),
    ...staleLeads.map(l => ({ type: 'stale' as const, item: l })),
    ...unpaidAccepted.map(a => ({ type: 'payment' as const, item: a })),
  ].slice(0, 6)

  const urgentCount = overdueReminders.length + staleLeads.length + unpaidAccepted.length + (pendingQuestions?.length || 0)

  return (
    <div className="action-center-redesign">
      {/* Hero Stats Bar */}
      <div className="stats-hero">
        <div className="stat-hero-item">
          <div className="stat-icon urgent">
            <Zap size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{urgentCount}</span>
            <span className="stat-label">Needs Attention</span>
          </div>
        </div>
        <div className="stat-hero-item">
          <div className="stat-icon meetings">
            <Video size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{todayEvents.length}</span>
            <span className="stat-label">Today's Calls</span>
          </div>
        </div>
        <div className="stat-hero-item">
          <div className="stat-icon pipeline">
            <Users size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalActive}</span>
            <span className="stat-label">Active Pipeline</span>
          </div>
        </div>
        <div className="stat-hero-item">
          <div className="stat-icon revenue">
            <DollarSign size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{unpaidAccepted.length}</span>
            <span className="stat-label">Pending Payments</span>
          </div>
        </div>
      </div>

      <div className="action-grid">
        {/* Left Column - Priority Items */}
        <div className="priority-column">
          {/* Today's Meetings */}
          {todayEvents.length > 0 && (
            <section className="action-section meetings-today">
              <div className="section-header">
                <div className="header-left">
                  <Video className="section-icon" size={18} />
                  <h2>Today's Meetings</h2>
                </div>
                <span className="count-badge green">{todayEvents.length}</span>
              </div>
              <div className="meeting-list">
                {todayEvents.map(event => (
                  <div key={event.id} className="meeting-item">
                    <div className="meeting-time">
                      {format(event.startTime, 'h:mm a')}
                    </div>
                    <div className="meeting-details">
                      <span className="meeting-name">{event.attendeeName || event.title}</span>
                      <span className="meeting-type">{event.title}</span>
                    </div>
                    <div className="meeting-actions">
                      {event.meetingLink && (
                        <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-join">
                          Join <ExternalLink size={12} />
                        </a>
                      )}
                      {event.applicantId && (
                        <Link to={`/people/${event.applicantId}`} className="btn-profile">
                          <User size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Needs Attention - Compact */}
          {allUrgentItems.length > 0 && (
            <section className="action-section urgent-section">
              <div className="section-header">
                <div className="header-left">
                  <AlertCircle className="section-icon urgent" size={18} />
                  <h2>Needs Attention</h2>
                </div>
                <span className="count-badge red">{overdueReminders.length + staleLeads.length + unpaidAccepted.length}</span>
              </div>
              <div className="urgent-list-compact">
                {allUrgentItems.map((entry) => {
                  if (entry.type === 'overdue') {
                    const reminder = entry.item as typeof overdueReminders[0]
                    return (
                      <div key={`overdue-${reminder.id}`} className="urgent-row overdue">
                        <span className="urgent-tag">Overdue</span>
                        <span className="urgent-name">{reminder.title}</span>
                        <span className="urgent-meta">{formatDistanceToNow(new Date(reminder.due_date))} ago</span>
                        <div className="urgent-row-actions">
                          <button onClick={() => handleComplete(reminder.id)} className="btn-mini done"><CheckCircle2 size={12} /></button>
                          <button onClick={() => handleSnooze(reminder.id, 1)} className="btn-mini snooze"><Timer size={12} /></button>
                        </div>
                      </div>
                    )
                  } else if (entry.type === 'stale') {
                    const lead = entry.item as typeof staleLeads[0]
                    return (
                      <div key={`stale-${lead.id}`} className="urgent-row stale">
                        <span className="urgent-tag stale">Stale</span>
                        <Link to={`/people/${lead.id}`} className="urgent-name link">{lead.name}</Link>
                        <span className="urgent-meta">{formatDistanceToNow(new Date(lead.created_at || ''))} old</span>
                        <div className="urgent-row-actions">
                          {lead.email && <a href={`mailto:${lead.email}`} className="btn-mini"><Mail size={12} /></a>}
                          <Link to={`/people/${lead.id}`} className="btn-mini"><ChevronRight size={12} /></Link>
                        </div>
                      </div>
                    )
                  } else {
                    const applicant = entry.item as typeof unpaidAccepted[0]
                    return (
                      <div key={`payment-${applicant.id}`} className="urgent-row payment">
                        <span className="urgent-tag payment">Payment</span>
                        <Link to={`/people/${applicant.id}`} className="urgent-name link">{applicant.name}</Link>
                        <span className="urgent-meta">Awaiting payment</span>
                        <div className="urgent-row-actions">
                          <Link to={`/people/${applicant.id}`} className="btn-mini"><ChevronRight size={12} /></Link>
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            </section>
          )}

          {/* Coming Up - Integrated with users */}
          <section className="action-section schedule-section">
            <div className="section-header">
              <div className="header-left">
                <Calendar className="section-icon" size={18} />
                <h2>Coming Up</h2>
              </div>
            </div>
            <div className="schedule-list-integrated">
              {tomorrowEvents.length > 0 && (
                <div className="schedule-group">
                  <span className="schedule-day">Tomorrow</span>
                  {tomorrowEvents.slice(0, 4).map(event => (
                    <div key={event.id} className="schedule-row">
                      <span className="schedule-time">{format(event.startTime, 'h:mm a')}</span>
                      <span className="schedule-name">{event.attendeeName || event.title}</span>
                      <div className="schedule-actions">
                        {event.meetingLink && (
                          <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="schedule-join-btn">
                            <Video size={12} />
                          </a>
                        )}
                        {event.applicantId && (
                          <Link to={`/people/${event.applicantId}`} className="schedule-user-link">
                            <User size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {laterEvents.length > 0 && (
                <div className="schedule-group">
                  <span className="schedule-day">This Week</span>
                  {laterEvents.slice(0, 5).map(event => (
                    <div key={event.id} className="schedule-row">
                      <span className="schedule-date">{format(event.startTime, 'EEE, MMM d')}</span>
                      <span className="schedule-name">{event.attendeeName || event.title}</span>
                      <div className="schedule-actions">
                        {event.meetingLink && (
                          <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="schedule-join-btn">
                            <Video size={12} />
                          </a>
                        )}
                        {event.applicantId && (
                          <Link to={`/people/${event.applicantId}`} className="schedule-user-link">
                            <User size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {upcomingReminders.length > 0 && (
                <div className="schedule-group">
                  <span className="schedule-day">Reminders</span>
                  {upcomingReminders.slice(0, 4).map(reminder => (
                    <div key={reminder.id} className="schedule-row reminder">
                      <span className="schedule-date">{format(new Date(reminder.due_date), 'MMM d')}</span>
                      <span className="schedule-name">{reminder.title}</span>
                      {reminder.applicant_id && (
                        <Link to={`/people/${reminder.applicant_id}`} className="schedule-user-link">
                          <User size={12} />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {tomorrowEvents.length === 0 && laterEvents.length === 0 && upcomingReminders.length === 0 && (
                <div className="empty-schedule">
                  <Calendar size={24} />
                  <span>No upcoming events</span>
                </div>
              )}
            </div>
          </section>

          {/* Today's Reminders */}
          {todayReminders.length > 0 && (
            <section className="action-section today-section">
              <div className="section-header">
                <div className="header-left">
                  <Clock className="section-icon" size={18} />
                  <h2>Today's Tasks</h2>
                </div>
                <span className="count-badge">{todayReminders.length}</span>
              </div>
              <div className="reminder-list">
                {todayReminders.map(reminder => (
                  <div key={reminder.id} className="reminder-item">
                    <div className="reminder-type">{reminder.reminder_type}</div>
                    <div className="reminder-content">
                      <h4>{reminder.title}</h4>
                      {reminder.applicants && (
                        <Link to={`/people/${reminder.applicant_id}`} className="person-link">
                          <User size={12} /> {reminder.applicants.name}
                        </Link>
                      )}
                    </div>
                    <button onClick={() => handleComplete(reminder.id)} className="btn-check">
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Messages & Overview */}
        <div className="overview-column">
          {/* Portal Questions */}
          {pendingQuestions && pendingQuestions.length > 0 && (
            <section className="action-section questions-section">
              <div className="section-header">
                <div className="header-left">
                  <MessageCircle className="section-icon" size={18} />
                  <h2>Portal Questions</h2>
                </div>
                <Link to="/questions" className="view-all">
                  View all <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="questions-list">
                {pendingQuestions.map(q => (
                  <div key={q.id} className="question-item">
                    <div className="question-meta">
                      <Link to={`/people/${q.application_id}`} className="question-author">
                        {q.application?.preferred_name || q.application?.first_name} {q.application?.last_name}
                      </Link>
                      <span className="question-time">
                        {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="question-text">{q.question}</p>
                    <a
                      href={`mailto:${q.application?.email}?subject=Re: Your StepWise Question&body=Hi ${q.application?.preferred_name || q.application?.first_name},\n\n`}
                      className="btn-reply"
                    >
                      <Mail size={14} /> Reply
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Course Discussions */}
          {recentDiscussions && recentDiscussions.length > 0 && (
            <section className="action-section discussions-section">
              <div className="section-header">
                <div className="header-left">
                  <BookOpen className="section-icon" size={18} />
                  <h2>Course Discussions</h2>
                </div>
                <span className="count-badge">{recentDiscussions.length}</span>
              </div>
              <div className="discussions-list">
                {recentDiscussions.map(d => (
                  <div key={d.id} className="discussion-item">
                    <div className="discussion-meta">
                      {d.application ? (
                        <Link to={`/people/${d.application.id}`} className="discussion-author">
                          {d.application.preferred_name || d.application.first_name} {d.application.last_name}
                        </Link>
                      ) : (
                        <span className="discussion-author">Anonymous</span>
                      )}
                      <span className="discussion-time">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="discussion-text">{d.content}</p>
                    <span className="discussion-lesson">
                      {d.lesson?.module?.course?.name} / {d.lesson?.title}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pipeline Overview */}
          <section className="action-section pipeline-overview">
            <div className="section-header">
              <div className="header-left">
                <TrendingUp className="section-icon" size={18} />
                <h2>Pipeline</h2>
              </div>
              <Link to="/pipeline" className="view-all">
                Open <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="pipeline-bars">
              {pipelineStats.map(({ stage, count }) => (
                <Link to="/pipeline" key={stage} className="pipeline-bar-row">
                  <span className="stage-name">{STAGE_LABELS[stage]}</span>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.min((count / Math.max(...pipelineStats.map(s => s.count), 1)) * 100, 100)}%`,
                        backgroundColor: STAGE_COLORS[stage]
                      }}
                    />
                  </div>
                  <span className="stage-count" style={{ color: STAGE_COLORS[stage] }}>{count}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Upcoming Trainings */}
          {upcomingTrainings.length > 0 && (
            <section className="action-section trainings-section">
              <div className="section-header">
                <div className="header-left">
                  <Users className="section-icon" size={18} />
                  <h2>Upcoming Trainings</h2>
                </div>
                <Link to="/trainings" className="view-all">
                  All <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="trainings-list">
                {upcomingTrainings.map(training => {
                  const startDate = new Date(training.start_date!)
                  const daysUntil = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  const urgencyClass = daysUntil <= 14 ? 'urgent' : daysUntil <= 30 ? 'soon' : 'later'
                  const urgencyLabel = daysUntil <= 14 ? `${daysUntil}d` : daysUntil <= 30 ? `${Math.ceil(daysUntil / 7)}w` : ''

                  return (
                    <div key={training.id} className={`training-item ${urgencyClass}`}>
                      <div className={`training-date ${urgencyClass}`}>
                        <span className="month">{format(startDate, 'MMM')}</span>
                        <span className="day">{format(startDate, 'd')}</span>
                        {urgencyLabel && <span className="urgency-badge">{urgencyLabel}</span>}
                      </div>
                      <div className="training-info">
                        <h4>{training.name}</h4>
                        <div className="training-meta">
                          <span className="capacity">
                            {getEnrollmentCount(training.id)} / {training.max_capacity || 6} enrolled
                          </span>
                          <span className={`status-pill ${urgencyClass}`}>
                            {daysUntil <= 14 ? 'Imminent' : daysUntil <= 30 ? 'Upcoming' : 'Scheduled'}
                          </span>
                        </div>
                      </div>
                      <div className={`urgency-indicator ${urgencyClass}`} />
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      <style>{`
        .action-center-redesign {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Hero Stats */
        .stats-hero {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-hero-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          border: 1px solid #eee;
        }

        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.urgent { background: #FEE2E2; color: #DC2626; }
        .stat-icon.meetings { background: #DBEAFE; color: #2563EB; }
        .stat-icon.pipeline { background: #D1FAE5; color: #059669; }
        .stat-icon.revenue { background: #FEF3C7; color: #D97706; }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1;
        }

        .stat-label {
          font-size: 13px;
          color: #666;
          margin-top: 4px;
        }

        /* Grid Layout */
        .action-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }

        .priority-column, .overview-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Sections */
        .action-section {
          background: white;
          border-radius: 12px;
          border: 1px solid #eee;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid #f5f5f5;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-left h2 {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .section-icon {
          color: #666;
        }

        .section-icon.urgent {
          color: #DC2626;
        }

        .count-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 10px;
          background: #f5f5f5;
          color: #666;
        }

        .count-badge.red { background: #FEE2E2; color: #DC2626; }
        .count-badge.green { background: #D1FAE5; color: #059669; }

        .view-all {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #7c3aed;
          text-decoration: none;
        }

        .view-all:hover {
          color: #6d28d9;
        }

        /* Meetings */
        .meeting-list {
          padding: 6px;
        }

        .meeting-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .meeting-item:hover {
          background: #f9f9f9;
        }

        .meeting-time {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          min-width: 70px;
        }

        .meeting-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .meeting-name {
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .meeting-type {
          font-size: 11px;
          color: #888;
        }

        .meeting-actions {
          display: flex;
          gap: 6px;
        }

        .btn-join {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          background: #7c3aed;
          color: white;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          text-decoration: none;
        }

        .btn-profile {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          border-radius: 6px;
          color: #666;
          text-decoration: none;
        }

        .btn-profile:hover {
          background: #eee;
        }

        /* Compact Urgent List */
        .urgent-list-compact {
          padding: 6px;
        }

        .urgent-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 6px;
          margin-bottom: 4px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
        }

        .urgent-row:last-child {
          margin-bottom: 0;
        }

        .urgent-row.stale {
          background: #FFFBEB;
          border-color: #FDE68A;
        }

        .urgent-row.payment {
          background: #FEF3C7;
          border-color: #FCD34D;
        }

        .urgent-tag {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 3px;
          background: #DC2626;
          color: white;
          flex-shrink: 0;
        }

        .urgent-tag.stale {
          background: #F59E0B;
        }

        .urgent-tag.payment {
          background: #D97706;
        }

        .urgent-name {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .urgent-name.link {
          text-decoration: none;
        }

        .urgent-name.link:hover {
          color: #7c3aed;
        }

        .urgent-meta {
          font-size: 11px;
          color: #888;
          flex-shrink: 0;
        }

        .urgent-row-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .btn-mini {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          background: white;
          color: #666;
          text-decoration: none;
        }

        .btn-mini:hover {
          background: #f0f0f0;
        }

        .btn-mini.done:hover {
          background: #D1FAE5;
          color: #059669;
        }

        .btn-mini.snooze:hover {
          background: #E0E7FF;
          color: #4F46E5;
        }

        /* Schedule Integrated */
        .schedule-list-integrated {
          padding: 12px;
        }

        .schedule-group {
          margin-bottom: 14px;
        }

        .schedule-group:last-child {
          margin-bottom: 0;
        }

        .schedule-day {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 6px;
          display: block;
        }

        .schedule-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }

        .schedule-row.reminder {
          opacity: 0.7;
        }

        .schedule-time, .schedule-date {
          font-size: 11px;
          font-weight: 500;
          color: #666;
          min-width: 80px;
        }

        .schedule-name {
          flex: 1;
          font-size: 13px;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .schedule-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
        }

        .schedule-join-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #7c3aed;
          border-radius: 6px;
          color: white;
          text-decoration: none;
          transition: all 0.15s;
        }

        .schedule-join-btn:hover {
          background: #6d28d9;
          transform: scale(1.05);
        }

        .schedule-user-link {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FEEBC8;
          border-radius: 50%;
          color: #DD6B20;
          text-decoration: none;
          transition: all 0.15s;
        }

        .schedule-user-link:hover {
          background: #FBD38D;
          transform: scale(1.05);
        }

        .schedule-no-user {
          width: 22px;
        }

        .empty-schedule {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          color: #ccc;
          gap: 8px;
        }

        .empty-schedule span {
          font-size: 12px;
        }

        /* Questions */
        .questions-list {
          padding: 10px;
        }

        .question-item {
          padding: 12px;
          background: #FEFCE8;
          border-radius: 8px;
          margin-bottom: 8px;
          border: 1px solid #FEF08A;
        }

        .question-item:last-child {
          margin-bottom: 0;
        }

        .question-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .question-author {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          text-decoration: none;
        }

        .question-author:hover {
          color: #7c3aed;
        }

        .question-time {
          font-size: 11px;
          color: #888;
        }

        .question-text {
          font-size: 13px;
          color: #333;
          margin: 0 0 10px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .btn-reply {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          background: #1a1a1a;
          color: white;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 500;
          text-decoration: none;
        }

        .btn-reply:hover {
          background: #333;
        }

        /* Discussions */
        .discussions-list {
          padding: 10px;
        }

        .discussion-item {
          padding: 12px;
          background: #F0F9FF;
          border-radius: 8px;
          margin-bottom: 8px;
          border: 1px solid #BAE6FD;
        }

        .discussion-item:last-child {
          margin-bottom: 0;
        }

        .discussion-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .discussion-author {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          text-decoration: none;
        }

        .discussion-author:hover {
          color: #7c3aed;
        }

        .discussion-time {
          font-size: 11px;
          color: #888;
        }

        .discussion-text {
          font-size: 13px;
          color: #333;
          margin: 0 0 8px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .discussion-lesson {
          font-size: 10px;
          color: #0369A1;
          background: #E0F2FE;
          padding: 3px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        /* Reminders */
        .reminder-list {
          padding: 6px;
        }

        .reminder-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .reminder-item:hover {
          background: #f9f9f9;
        }

        .reminder-type {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 3px 6px;
          border-radius: 4px;
          background: #E0E7FF;
          color: #4F46E5;
        }

        .reminder-content {
          flex: 1;
        }

        .reminder-content h4 {
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
          margin: 0 0 2px 0;
        }

        .person-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #666;
          text-decoration: none;
        }

        .person-link:hover {
          color: #7c3aed;
        }

        .btn-check {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: #f5f5f5;
          color: #666;
          transition: all 0.15s;
        }

        .btn-check:hover {
          background: #D1FAE5;
          color: #059669;
        }

        /* Pipeline */
        .pipeline-bars {
          padding: 12px;
        }

        .pipeline-bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          text-decoration: none;
        }

        .pipeline-bar-row:hover .stage-name {
          color: #7c3aed;
        }

        .stage-name {
          font-size: 11px;
          color: #666;
          width: 80px;
          flex-shrink: 0;
        }

        .bar-container {
          flex: 1;
          height: 6px;
          background: #f5f5f5;
          border-radius: 3px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }

        .stage-count {
          font-size: 12px;
          font-weight: 600;
          width: 24px;
          text-align: right;
        }

        /* Trainings - StepWise Brand Colors */
        .trainings-list {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .training-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          transition: all 0.2s ease;
          background: #fafafa;
          border: 1px solid #eee;
          position: relative;
          overflow: hidden;
        }

        .training-item:hover {
          background: #f5f5f5;
          transform: translateX(2px);
        }

        .training-item.urgent {
          background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
          border-color: #fed7d7;
        }

        .training-item.soon {
          background: linear-gradient(135deg, #fffaf0 0%, #fff 100%);
          border-color: #feebc8;
        }

        .training-item.later {
          background: linear-gradient(135deg, #faf5ff 0%, #fff 100%);
          border-color: #e9d8fd;
        }

        .training-date {
          width: 52px;
          height: 52px;
          background: #7c3aed;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        /* StepWise brand colors for urgency */
        .training-date.urgent {
          background: linear-gradient(135deg, #E53E3E 0%, #C53030 100%);
          box-shadow: 0 2px 8px rgba(229, 62, 62, 0.4);
        }

        .training-date.soon {
          background: linear-gradient(135deg, #ED8936 0%, #DD6B20 100%);
          box-shadow: 0 2px 8px rgba(237, 137, 54, 0.4);
        }

        .training-date.later {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        .training-date .month {
          font-size: 9px;
          text-transform: uppercase;
          opacity: 0.9;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .training-date .day {
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
        }

        .training-date .urgency-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: white;
          color: inherit;
          font-size: 8px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .training-date.urgent .urgency-badge {
          color: #E53E3E;
        }

        .training-date.soon .urgency-badge {
          color: #ED8936;
        }

        .training-info {
          flex: 1;
          min-width: 0;
        }

        .training-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 6px 0;
        }

        .training-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .training-info .capacity {
          font-size: 12px;
          color: #666;
        }

        .status-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .status-pill.urgent {
          background: #FED7D7;
          color: #C53030;
        }

        .status-pill.soon {
          background: #FEEBC8;
          color: #C05621;
        }

        .status-pill.later {
          background: #E9D8FD;
          color: #6B46C1;
        }

        .urgency-indicator {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          border-radius: 0 12px 12px 0;
        }

        .urgency-indicator.urgent {
          background: linear-gradient(180deg, #E53E3E 0%, #C53030 100%);
        }

        .urgency-indicator.soon {
          background: linear-gradient(180deg, #ED8936 0%, #DD6B20 100%);
        }

        .urgency-indicator.later {
          background: linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%);
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .action-grid {
            grid-template-columns: 1fr;
          }

          .stats-hero {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .stats-hero {
            grid-template-columns: 1fr;
          }

          .action-center-redesign {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}
