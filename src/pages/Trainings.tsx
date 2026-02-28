import { useState } from 'react'
import { format, isPast } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Users,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { useTrainings, useUpdateTraining } from '../hooks/useTrainings'
import { useApplicants } from '../hooks/useApplicants'
import { STAGE_COLORS, STAGE_LABELS, type PipelineStage } from '../lib/supabase'

// Stages that count toward enrollment (past approval)
const ENROLLED_STAGES: PipelineStage[] = ['payment', 'onboarding', 'complete']

// Get status based on capacity
function getComputedStatus(enrolledCount: number, maxCapacity: number, isPastTraining: boolean): string {
  if (isPastTraining) return 'Completed'
  if (enrolledCount >= maxCapacity) return 'Full'
  if (enrolledCount >= maxCapacity - 2) return 'Filling'
  return 'Open'
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Open': return '#22C55E'
    case 'Filling': return '#F59E0B'
    case 'Full': return '#EF4444'
    case 'Completed': return '#94A3B8'
    default: return '#94A3B8'
  }
}

export function Trainings() {
  const { data: trainings, isLoading } = useTrainings()
  const updateTraining = useUpdateTraining()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string | number>('')

  const { data: allApplicants } = useApplicants()

  const startEdit = (id: string, field: string, value: string | number | null) => {
    setEditing({ id, field })
    setEditValue(value || '')
  }

  const saveEdit = () => {
    if (editing) {
      updateTraining.mutate({ id: editing.id, updates: { [editing.field]: editValue } })
      setEditing(null)
    }
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditValue('')
  }

  if (isLoading) {
    return <div className="page loading">Loading trainings...</div>
  }

  // Sort trainings: upcoming/active first, past at bottom
  const sortedTrainings = [...(trainings || [])].sort((a, b) => {
    const aIsPast = a.end_date ? isPast(new Date(a.end_date)) : false
    const bIsPast = b.end_date ? isPast(new Date(b.end_date)) : false

    if (aIsPast && !bIsPast) return 1
    if (!aIsPast && bIsPast) return -1

    // Both past or both future: sort by start date descending
    const aDate = a.start_date ? new Date(a.start_date).getTime() : 0
    const bDate = b.start_date ? new Date(b.start_date).getTime() : 0
    return bDate - aDate
  })

  const activeTrainings = sortedTrainings.filter(t => !t.end_date || !isPast(new Date(t.end_date)))
  const pastTrainings = sortedTrainings.filter(t => t.end_date && isPast(new Date(t.end_date)))

  return (
    <div className="page trainings">
      <header className="page-header">
        <h1>Trainings</h1>
        <p className="subtitle">{activeTrainings.length} active, {pastTrainings.length} completed</p>
      </header>

      {/* Active Trainings */}
      <section className="trainings-section">
        <h2 className="section-title">Upcoming & Active</h2>
        <div className="trainings-list">
          {activeTrainings.map(training => {
            const isExpanded = expandedId === training.id
            const trainingApplicants = allApplicants?.filter(a => a.training_id === training.id) || []
            const maxCapacity = training.max_capacity || 6
            const enrolledCount = trainingApplicants.filter(a =>
              ENROLLED_STAGES.includes(a.pipeline_stage as PipelineStage)
            ).length
            const inPipelineCount = trainingApplicants.filter(a =>
              !ENROLLED_STAGES.includes(a.pipeline_stage as PipelineStage)
            ).length
            const computedStatus = getComputedStatus(enrolledCount, maxCapacity, false)
            const spotsRemaining = maxCapacity - enrolledCount

            return (
              <div key={training.id} className={`training-card active ${isExpanded ? 'expanded' : ''}`}>
                <div
                  className="training-header"
                  onClick={() => setExpandedId(isExpanded ? null : training.id)}
                >
                  <div className="training-info">
                    <div className="training-title-row">
                      <h3>{training.name}</h3>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(computedStatus) + '20',
                          color: getStatusColor(computedStatus)
                        }}
                      >
                        {computedStatus}
                      </span>
                    </div>
                    <div className="training-meta">
                      {training.start_date && (
                        <span><Calendar size={14} /> {format(new Date(training.start_date), 'MMM d')} - {training.end_date && format(new Date(training.end_date), 'MMM d, yyyy')}</span>
                      )}
                      {training.location && (
                        <span><MapPin size={14} /> {training.location}</span>
                      )}
                    </div>

                    {/* Capacity Bar */}
                    <div className="capacity-section">
                      <div className="capacity-bar">
                        <div
                          className="capacity-fill enrolled"
                          style={{
                            width: `${(enrolledCount / maxCapacity) * 100}%`,
                            backgroundColor: getStatusColor(computedStatus)
                          }}
                        />
                      </div>
                      <div className="capacity-stats">
                        <span className="enrolled-count">
                          <Users size={14} />
                          <strong>{enrolledCount}</strong> / {maxCapacity} enrolled
                        </span>
                        {spotsRemaining > 0 ? (
                          <span className="spots-remaining">{spotsRemaining} spots left</span>
                        ) : (
                          <span className="spots-full"><AlertCircle size={14} /> Full</span>
                        )}
                      </div>
                      {inPipelineCount > 0 && (
                        <div className="pipeline-count">
                          {inPipelineCount} more in pipeline
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="expand-toggle">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="training-details">
                    <div className="detail-columns">
                      <div className="detail-section">
                        <h4>Settings</h4>
                        <div className="fields-stack">
                          <div className="field">
                            <label>Max Capacity</label>
                            {editing?.id === training.id && editing.field === 'max_capacity' ? (
                              <div className="edit-controls">
                                <select
                                  value={editValue}
                                  onChange={(e) => setEditValue(parseInt(e.target.value))}
                                  autoFocus
                                >
                                  <option value={6}>6 participants</option>
                                  <option value={9}>9 participants</option>
                                </select>
                                <button onClick={saveEdit} className="btn-save"><Save size={14} /></button>
                                <button onClick={cancelEdit} className="btn-cancel"><X size={14} /></button>
                              </div>
                            ) : (
                              <div className="field-value" onClick={() => startEdit(training.id, 'max_capacity', maxCapacity)}>
                                {maxCapacity} participants <Edit2 size={12} className="edit-icon" />
                              </div>
                            )}
                          </div>

                          <div className="field">
                            <label>Location</label>
                            {editing?.id === training.id && editing.field === 'location' ? (
                              <div className="edit-controls">
                                <input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  autoFocus
                                />
                                <button onClick={saveEdit} className="btn-save"><Save size={14} /></button>
                                <button onClick={cancelEdit} className="btn-cancel"><X size={14} /></button>
                              </div>
                            ) : (
                              <div className="field-value" onClick={() => startEdit(training.id, 'location', training.location)}>
                                {training.location || <em>Not set</em>} <Edit2 size={12} className="edit-icon" />
                              </div>
                            )}
                          </div>

                          <div className="field">
                            <label>Dates</label>
                            <div className="field-value readonly">
                              {training.start_date ? format(new Date(training.start_date), 'MMM d') : '?'} - {training.end_date ? format(new Date(training.end_date), 'MMM d, yyyy') : '?'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="detail-section participants-section">
                        <h4>Participants by Stage</h4>
                        <div className="stage-breakdown">
                          {(['lead', 'chemistry_call', 'application', 'interview', 'approval', 'payment', 'onboarding', 'complete'] as PipelineStage[]).map(stage => {
                            const count = trainingApplicants.filter(a => a.pipeline_stage === stage).length
                            if (count === 0) return null
                            const isEnrolled = ENROLLED_STAGES.includes(stage)
                            return (
                              <div key={stage} className={`stage-row ${isEnrolled ? 'enrolled' : ''}`}>
                                <span
                                  className="stage-dot"
                                  style={{ backgroundColor: STAGE_COLORS[stage] }}
                                />
                                <span className="stage-name">{STAGE_LABELS[stage]}</span>
                                <span className="stage-count">{count}</span>
                                {isEnrolled && <CheckCircle2 size={12} className="enrolled-icon" />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4>All Applicants ({trainingApplicants.length})</h4>
                      <div className="applicants-grid">
                        {trainingApplicants.length === 0 ? (
                          <p className="empty">No applicants for this training yet</p>
                        ) : (
                          trainingApplicants.map(applicant => (
                            <Link
                              key={applicant.id}
                              to={`/people/${applicant.id}`}
                              className="applicant-chip"
                              style={{ borderLeftColor: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] }}
                            >
                              <span className="name">{applicant.name}</span>
                              <span
                                className="stage-tag"
                                style={{
                                  backgroundColor: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] + '20',
                                  color: STAGE_COLORS[applicant.pipeline_stage as PipelineStage]
                                }}
                              >
                                {STAGE_LABELS[applicant.pipeline_stage as PipelineStage]}
                              </span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {activeTrainings.length === 0 && (
            <p className="empty-section">No upcoming trainings</p>
          )}
        </div>
      </section>

      {/* Past Trainings */}
      {pastTrainings.length > 0 && (
        <section className="trainings-section past">
          <h2 className="section-title">Past Trainings</h2>
          <div className="trainings-list">
            {pastTrainings.map(training => {
              const trainingApplicants = allApplicants?.filter(a => a.training_id === training.id) || []
              const maxCapacity = training.max_capacity || 6
              const enrolledCount = trainingApplicants.filter(a =>
                ENROLLED_STAGES.includes(a.pipeline_stage as PipelineStage)
              ).length

              return (
                <div key={training.id} className="training-card past">
                  <div className="training-header">
                    <div className="training-info">
                      <h3>{training.name}</h3>
                      <div className="training-meta">
                        {training.start_date && (
                          <span><Calendar size={14} /> {format(new Date(training.start_date), 'MMM d')} - {training.end_date && format(new Date(training.end_date), 'MMM d, yyyy')}</span>
                        )}
                        <span><Users size={14} /> {enrolledCount} / {maxCapacity} completed</span>
                      </div>
                    </div>
                    <span className="status-badge completed">Completed</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
