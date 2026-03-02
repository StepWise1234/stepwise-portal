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
  CheckCircle2,
  Bed,
  Car,
  Plus,
  Eye,
  EyeOff,
  UtensilsCrossed,
  AlertTriangle,
  StickyNote,
  Download,
  ChefHat,
  Sun,
  Moon
} from 'lucide-react'
import { useTrainings, useUpdateTraining, useCreateTraining } from '../hooks/useTrainings'
import { useApplicants } from '../hooks/useApplicants'
import { useAllRooms, useAllRoomReservations, useAssignRoom, useUnassignRoom } from '../hooks/useRoomReservations'
import { useAllApplications } from '../hooks/useApplications'
import { STAGE_COLORS, STAGE_LABELS, type PipelineStage } from '../lib/supabase'
import { exportTrainingPdf } from '../utils/exportTrainingPdf'

// Stages that count toward enrollment (past approval)
const ENROLLED_STAGES: PipelineStage[] = ['payment', 'onboarding', 'complete']

// Generate meal dates from training start/end dates
function generateMealDates(startDate: string, endDate: string): { date: string; label: string }[] {
  const dates: { date: string; label: string }[] = []
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  const current = new Date(start)
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    const label = current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    dates.push({ date: dateStr, label })
    current.setDate(current.getDate() + 1)
  }
  return dates
}

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
  const createTraining = useCreateTraining()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<string | number>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTraining, setNewTraining] = useState({
    name: '',
    start_date: '',
    end_date: '',
    location: 'Greater Boston Area',
    max_capacity: 6,
    training_level: 'Beginning',
    show_on_apply: true,
  })

  const { data: allApplicants } = useApplicants()
  const { data: allRooms, isLoading: roomsLoading } = useAllRooms()
  const { data: allReservations } = useAllRoomReservations()
  const { data: allApplications } = useAllApplications()
  const assignRoom = useAssignRoom()
  const unassignRoom = useUnassignRoom()
  const [assigningRoom, setAssigningRoom] = useState<{ roomId: string; trainingId: string } | null>(null)

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

  const handleCreateTraining = () => {
    if (!newTraining.name || !newTraining.start_date || !newTraining.end_date) {
      alert('Please fill in training name and dates')
      return
    }
    createTraining.mutate({
      name: newTraining.name,
      start_date: newTraining.start_date,
      end_date: newTraining.end_date,
      location: newTraining.location,
      max_capacity: newTraining.max_capacity,
      training_level: newTraining.training_level,
      show_on_apply: newTraining.show_on_apply,
      meal_selection_enabled: false,
      status: 'Open',
      training_type: null,
      cohort_name: null,
      price_cents: null,
      spots_filled: 0,
    }, {
      onSuccess: () => {
        setShowCreateModal(false)
        setNewTraining({
          name: '',
          start_date: '',
          end_date: '',
          location: 'Greater Boston Area',
          max_capacity: 6,
          training_level: 'Beginning',
          show_on_apply: true,
        })
      }
    })
  }

  const toggleShowOnApply = (id: string, currentValue: boolean | null) => {
    updateTraining.mutate({ id, updates: { show_on_apply: !currentValue } })
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
        <div className="header-row">
          <div>
            <h1>Trainings</h1>
            <p className="subtitle">{activeTrainings.length} active, {pastTrainings.length} completed</p>
          </div>
          <button className="btn-create" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Training
          </button>
        </div>
      </header>

      {/* Create Training Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content create-training-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Training</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Training Name</label>
                <input
                  type="text"
                  placeholder="e.g., April 10 - 13, 2026"
                  value={newTraining.name}
                  onChange={e => setNewTraining({ ...newTraining, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={newTraining.start_date}
                    onChange={e => setNewTraining({ ...newTraining, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={newTraining.end_date}
                    onChange={e => setNewTraining({ ...newTraining, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="Greater Boston Area"
                  value={newTraining.location}
                  onChange={e => setNewTraining({ ...newTraining, location: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Max Capacity</label>
                  <select
                    value={newTraining.max_capacity}
                    onChange={e => setNewTraining({ ...newTraining, max_capacity: parseInt(e.target.value) })}
                  >
                    <option value={6}>6 participants</option>
                    <option value={9}>9 participants</option>
                    <option value={12}>12 participants</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Training Level</label>
                  <select
                    value={newTraining.training_level}
                    onChange={e => setNewTraining({ ...newTraining, training_level: e.target.value })}
                  >
                    <option value="Beginning">Beginning</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={newTraining.show_on_apply}
                    onChange={e => setNewTraining({ ...newTraining, show_on_apply: e.target.checked })}
                  />
                  Show on application form (allow signups)
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleCreateTraining} disabled={createTraining.isPending}>
                {createTraining.isPending ? 'Creating...' : 'Create Training'}
              </button>
            </div>
          </div>
        </div>
      )}

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

                  <div className="training-actions">
                    <button
                      className="btn-download"
                      onClick={(e) => {
                        e.stopPropagation()
                        const trainingRooms = allRooms?.filter(r => r.training_id === training.id) || []
                        const trainingReservations = allReservations?.filter(r => r.training_id === training.id) || []
                        const trainingApps = allApplications?.filter(a => a.training_id === training.id) || []
                        exportTrainingPdf(training, trainingApplicants, trainingRooms, trainingReservations, trainingApps)
                      }}
                      title="Download PDF"
                    >
                      <Download size={14} /> PDF
                    </button>
                    <button
                      className={`btn-visibility ${training.show_on_apply ? 'visible' : 'hidden'}`}
                      onClick={(e) => { e.stopPropagation(); toggleShowOnApply(training.id, training.show_on_apply) }}
                      title={training.show_on_apply ? 'Visible on application form' : 'Hidden from application form'}
                    >
                      {training.show_on_apply ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <div className="expand-toggle">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
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

                          <div className="field toggle-field">
                            <label>Meal Selection</label>
                            <button
                              className={`toggle-btn ${training.meal_selection_enabled ? 'enabled' : 'disabled'}`}
                              onClick={() => updateTraining.mutate({
                                id: training.id,
                                updates: { meal_selection_enabled: !training.meal_selection_enabled }
                              })}
                            >
                              <ChefHat size={14} />
                              {training.meal_selection_enabled ? 'Enabled' : 'Disabled'}
                            </button>
                            <span className="toggle-hint">
                              {training.meal_selection_enabled
                                ? 'Participants can choose their meals'
                                : 'Meal selection hidden from portal'}
                            </span>
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

                    {/* All Applicants - moved above Room Assignments */}
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

                    {/* Room Assignments */}
                    <div className="detail-section room-assignments-section">
                      <h4><Bed size={16} /> Room Assignments</h4>
                      {roomsLoading ? (
                        <p className="loading-text">Loading rooms...</p>
                      ) : (() => {
                        const trainingRooms = allRooms?.filter(r => r.training_id === training.id) || []
                        const trainingReservations = allReservations?.filter(r => r.training_id === training.id) || []
                        const commuters = trainingApplicants.filter(a => a.accommodation_choice === 'commute')
                        const enrolledWithoutRoom = trainingApplicants.filter(a =>
                          ENROLLED_STAGES.includes(a.pipeline_stage as PipelineStage) &&
                          !trainingReservations.some(r => r.application?.email === a.email) &&
                          a.accommodation_choice !== 'commute'
                        )

                        if (trainingRooms.length === 0) {
                          return <p className="empty">No rooms configured for this training</p>
                        }

                        return (
                          <>
                            <div className="room-assignments-grid">
                              {trainingRooms.map(room => {
                                const reservation = trainingReservations.find(r => r.room_id === room.id)
                                const occupantName = reservation?.application
                                  ? `${reservation.application.first_name} ${reservation.application.last_name?.charAt(0) || ''}`.trim()
                                  : null
                                const isAssigning = assigningRoom?.roomId === room.id

                                // Get enrolled applicants who can be assigned to this room
                                const assignableApplicants = trainingApplicants.filter(a =>
                                  ENROLLED_STAGES.includes(a.pipeline_stage as PipelineStage) &&
                                  !trainingReservations.some(r => r.application?.email === a.email) &&
                                  a.accommodation_choice !== 'commute'
                                )

                                // Find matching application for an applicant
                                const findApplicationForApplicant = (email: string | null) => {
                                  if (!email) return undefined
                                  return allApplications?.find(app => app.email?.toLowerCase() === email.toLowerCase() && app.training_id === training.id)
                                }

                                return (
                                  <div key={room.id} className={`room-assignment-card ${reservation ? 'occupied' : 'empty'} ${room.is_premier ? 'premier' : ''}`}>
                                    <div className="room-assignment-header">
                                      <Bed size={16} />
                                      <span className="room-name">{room.name}</span>
                                      {room.is_premier && <span className="premier-badge">Premier</span>}
                                    </div>
                                  <div className="room-bed-type">{room.bed_type}</div>
                                  <div className="room-occupants">
                                    {occupantName ? (
                                      <div className="occupant-with-actions">
                                        <span className="occupant-name">{occupantName}</span>
                                        <button
                                          className="unassign-btn"
                                          onClick={() => {
                                            if (reservation && confirm(`Remove ${occupantName} from ${room.name}?`)) {
                                              unassignRoom.mutate(reservation.id)
                                            }
                                          }}
                                          title="Remove assignment"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ) : isAssigning ? (
                                      <div className="assign-dropdown">
                                        <select
                                          autoFocus
                                          onChange={(e) => {
                                            const applicant = assignableApplicants.find(a => a.id === e.target.value)
                                            if (applicant) {
                                              // First try to find a portal application
                                              const application = findApplicationForApplicant(applicant.email)

                                              // Use application ID if available, otherwise use applicant ID
                                              const appId = application?.id || applicant.id
                                              const userId = application?.user_id || undefined

                                              console.log('Assigning room:', { roomId: room.id, applicationId: appId, trainingId: training.id, userId, hasPortalApp: !!application })
                                              assignRoom.mutate({
                                                roomId: room.id,
                                                applicationId: appId,
                                                trainingId: training.id,
                                                userId,
                                              }, {
                                                onSuccess: () => console.log('Room assigned successfully'),
                                                onError: (err) => {
                                                  console.error('Failed to assign room:', err)
                                                  alert(`Failed to assign room: ${err.message}`)
                                                }
                                              })
                                            }
                                            setAssigningRoom(null)
                                          }}
                                          onBlur={() => setAssigningRoom(null)}
                                        >
                                          <option value="">Select person...</option>
                                          {assignableApplicants.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <button
                                        className="assign-btn"
                                        onClick={() => setAssigningRoom({ roomId: room.id, trainingId: training.id })}
                                        disabled={assignableApplicants.length === 0}
                                        title={assignableApplicants.length === 0 ? 'No enrolled applicants without rooms' : 'Assign someone to this room'}
                                      >
                                        <Plus size={12} />
                                        <span>Assign</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                            {/* Commute option */}
                            {commuters.length > 0 && (
                              <div className="room-assignment-card commute occupied">
                                <div className="room-assignment-header">
                                  <Car size={16} />
                                  <span className="room-name">Commute</span>
                                </div>
                                <div className="room-bed-type">Daily travel</div>
                                <div className="room-occupants">
                                  {commuters.map(c => (
                                    <span key={c.id} className="occupant-name">{c.name?.split(' ')[0]}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                            <div className="room-stats">
                              <span className="stat"><Bed size={14} /> {trainingReservations.length} rooms reserved</span>
                              <span className="stat"><Car size={14} /> {commuters.length} commuting</span>
                              {enrolledWithoutRoom.length > 0 && (
                                <span className="stat pending">{enrolledWithoutRoom.length} enrolled without room</span>
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    {/* Meal Assignments */}
                    {(() => {
                      console.log('[Admin Meals] training.id:', training.id, 'allApplications count:', allApplications?.length)
                      const trainingApps = allApplications?.filter(a => a.training_id === training.id) || []
                      console.log('[Admin Meals] trainingApps:', trainingApps.length)
                      const appsWithMeals = trainingApps.filter(a => a.meal_selections && Object.keys(a.meal_selections).length > 0)
                      console.log('[Admin Meals] appsWithMeals:', appsWithMeals.length)

                      // Generate meal dates for this training
                      const MEAL_DATES = training.start_date && training.end_date
                        ? generateMealDates(training.start_date, training.end_date)
                        : []

                      // Build meal summary for caterer
                      type MealSummaryDay = { lunch: Record<string, number>; dinner: Record<string, number> }
                      const mealSummary: Record<string, MealSummaryDay> = {}
                      MEAL_DATES.forEach(d => {
                        mealSummary[d.date] = { lunch: {}, dinner: {} }
                      })

                      appsWithMeals.forEach(app => {
                        const meals = app.meal_selections as Record<string, { lunch?: string; dinner?: string }>
                        MEAL_DATES.forEach(d => {
                          if (meals[d.date]?.lunch) {
                            const lunchMeal = meals[d.date].lunch!
                            mealSummary[d.date].lunch[lunchMeal] = (mealSummary[d.date].lunch[lunchMeal] || 0) + 1
                          }
                          if (meals[d.date]?.dinner) {
                            const dinnerMeal = meals[d.date].dinner!
                            mealSummary[d.date].dinner[dinnerMeal] = (mealSummary[d.date].dinner[dinnerMeal] || 0) + 1
                          }
                        })
                      })

                      return (
                        <div className={`detail-section meal-assignments-section ${!training.meal_selection_enabled ? 'disabled' : ''}`}>
                          <h4>
                            <ChefHat size={16} /> Meal Assignments
                            {!training.meal_selection_enabled && (
                              <span className="disabled-badge">Disabled</span>
                            )}
                          </h4>
                          {!training.meal_selection_enabled ? (
                            <p className="empty disabled-message">
                              Meal selection is disabled for this training. Enable it in Settings above.
                            </p>
                          ) : appsWithMeals.length === 0 ? (
                            <p className="empty">No meal selections yet</p>
                          ) : (
                            <>
                              {/* Meal Summary for Caterer */}
                              <div className="meal-summary-section">
                                <h5>Meal Summary (for caterer)</h5>
                                <div className="meal-summary-grid">
                                  {MEAL_DATES.map(d => {
                                    const lunchMeals = Object.entries(mealSummary[d.date]?.lunch || {})
                                    const dinnerMeals = Object.entries(mealSummary[d.date]?.dinner || {})
                                    if (lunchMeals.length === 0 && dinnerMeals.length === 0) return null

                                    return (
                                      <div key={d.date} className="meal-day-summary">
                                        <h6>{d.label}</h6>
                                        {lunchMeals.length > 0 && (
                                          <div className="meal-slot-summary">
                                            <span className="meal-slot-label"><Sun size={12} /> Lunch</span>
                                            <ul>
                                              {lunchMeals.map(([meal, count]) => (
                                                <li key={meal}><strong>{count}x</strong> {meal}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {dinnerMeals.length > 0 && (
                                          <div className="meal-slot-summary">
                                            <span className="meal-slot-label"><Moon size={12} /> Dinner</span>
                                            <ul>
                                              {dinnerMeals.map(([meal, count]) => (
                                                <li key={meal}><strong>{count}x</strong> {meal}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Individual Assignments Table */}
                              <div className="meal-assignments-table">
                                <h5>Individual Assignments</h5>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Participant</th>
                                      {MEAL_DATES.map(d => (
                                        <th key={d.date} colSpan={2}>{d.label}</th>
                                      ))}
                                    </tr>
                                    <tr className="meal-type-row">
                                      <th></th>
                                      {MEAL_DATES.flatMap(d => [
                                        <th key={`${d.date}-lunch`} className="meal-type lunch"><Sun size={12} /> L</th>,
                                        <th key={`${d.date}-dinner`} className="meal-type dinner"><Moon size={12} /> D</th>
                                      ])}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {appsWithMeals.map(app => {
                                      const meals = app.meal_selections as Record<string, { lunch?: string; dinner?: string }>
                                      return (
                                        <tr key={app.id}>
                                          <td className="participant-name">{app.first_name} {app.last_name?.charAt(0)}.</td>
                                          {MEAL_DATES.flatMap(d => [
                                            <td key={`${d.date}-lunch`} className="meal-cell" title={meals[d.date]?.lunch || ''}>
                                              {meals[d.date]?.lunch ? '✓' : '-'}
                                            </td>,
                                            <td key={`${d.date}-dinner`} className="meal-cell" title={meals[d.date]?.dinner || ''}>
                                              {meals[d.date]?.dinner ? '✓' : '-'}
                                            </td>
                                          ])}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                <p className="meal-hint">Hover over ✓ to see meal selection</p>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })()}

                    {/* Dietary & Accommodation Needs */}
                    {(() => {
                      const trainingApps = allApplications?.filter(a => a.training_id === training.id) || []
                      const withDietary = trainingApps.filter(a =>
                        (a.dietary_preferences && a.dietary_preferences.length > 0) ||
                        a.dietary_other ||
                        a.allergies
                      )
                      const withSpecialNeeds = trainingApps.filter(a => a.special_accommodations)
                      const withNotes = trainingApps.filter(a => a.accommodation_notes)

                      if (withDietary.length === 0 && withSpecialNeeds.length === 0 && withNotes.length === 0) {
                        return null
                      }

                      return (
                        <div className="detail-section dietary-section">
                          <h4><UtensilsCrossed size={16} /> Dietary & Accommodation Needs</h4>

                          {/* Dietary Preferences */}
                          {withDietary.length > 0 && (
                            <div className="needs-subsection">
                              <h5>Dietary Preferences & Allergies</h5>
                              <div className="needs-list">
                                {withDietary.map(app => (
                                  <div key={app.id} className="need-item">
                                    <span className="person-name">{app.first_name} {app.last_name}</span>
                                    <div className="need-details">
                                      {app.dietary_preferences && app.dietary_preferences.length > 0 && (
                                        <span className="dietary-tags">
                                          {app.dietary_preferences.map((pref, i) => (
                                            <span key={i} className="dietary-tag">{pref}</span>
                                          ))}
                                        </span>
                                      )}
                                      {app.dietary_other && (
                                        <span className="dietary-note">{app.dietary_other}</span>
                                      )}
                                      {app.allergies && (
                                        <span className="allergy-note"><AlertTriangle size={12} /> {app.allergies}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Special Accommodations */}
                          {withSpecialNeeds.length > 0 && (
                            <div className="needs-subsection">
                              <h5>Special Accommodations</h5>
                              <div className="needs-list">
                                {withSpecialNeeds.map(app => (
                                  <div key={app.id} className="need-item special">
                                    <span className="person-name">{app.first_name} {app.last_name}</span>
                                    <p className="need-text">{app.special_accommodations}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Additional Notes */}
                          {withNotes.length > 0 && (
                            <div className="needs-subsection">
                              <h5><StickyNote size={14} /> Additional Notes</h5>
                              <div className="needs-list">
                                {withNotes.map(app => (
                                  <div key={app.id} className="need-item note">
                                    <span className="person-name">{app.first_name} {app.last_name}</span>
                                    <p className="need-text">{app.accommodation_notes}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
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
// cache bust 1772339991
// force rebuild 1772346679
