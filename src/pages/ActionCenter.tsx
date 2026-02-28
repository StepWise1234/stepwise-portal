import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isPast, isToday, addDays } from 'date-fns'
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Calendar,
  User,
  Mail,
  Phone,
  Timer
} from 'lucide-react'
import { useActiveReminders, useCompleteReminder, useSnoozeReminder } from '../hooks/useReminders'
import { useApplicants } from '../hooks/useApplicants'
import { useTrainings } from '../hooks/useTrainings'
import { STAGE_COLORS, STAGE_LABELS, type PipelineStage } from '../lib/supabase'

export function ActionCenter() {
  const { data: reminders } = useActiveReminders()
  const { data: applicants } = useApplicants()
  const { data: trainings } = useTrainings()
  const completeReminder = useCompleteReminder()
  const snoozeReminder = useSnoozeReminder()

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

  // Find unsigned waivers
  // Upcoming trainings (next 30 days)
  const upcomingTrainings = trainings?.filter(t => {
    if (!t.start_date) return false
    const start = new Date(t.start_date)
    const daysUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return daysUntil > 0 && daysUntil <= 30
  }) || []

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
