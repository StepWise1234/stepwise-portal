import { useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Users,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useTrainings, useUpdateTraining } from '../hooks/useTrainings'
import { useApplicants } from '../hooks/useApplicants'
import { STAGE_COLORS, type PipelineStage } from '../lib/supabase'

export function Trainings() {
  const { data: trainings, isLoading } = useTrainings()
  const updateTraining = useUpdateTraining()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState<any>('')

  const { data: allApplicants } = useApplicants()

  const startEdit = (id: string, field: string, value: any) => {
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

  return (
    <div className="page trainings">
      <header className="page-header">
        <h1>Trainings</h1>
        <p className="subtitle">{trainings?.length || 0} trainings</p>
      </header>

      <div className="trainings-list">
        {trainings?.map(training => {
          const isExpanded = expandedId === training.id
          const trainingApplicants = allApplicants?.filter(a => a.training_id === training.id) || []
          const enrolledCount = trainingApplicants.filter(a =>
            ['payment', 'onboarding', 'complete'].includes(a.pipeline_stage || '')
          ).length

          return (
            <div key={training.id} className={`training-card ${isExpanded ? 'expanded' : ''}`}>
              <div
                className="training-header"
                onClick={() => setExpandedId(isExpanded ? null : training.id)}
              >
                <div className="training-info">
                  <h3>{training.name}</h3>
                  <div className="training-meta">
                    {training.start_date && (
                      <span><Calendar size={14} /> {format(new Date(training.start_date), 'MMM d')} - {training.end_date && format(new Date(training.end_date), 'MMM d, yyyy')}</span>
                    )}
                    {training.location && (
                      <span><MapPin size={14} /> {training.location}</span>
                    )}
                    <span><Users size={14} /> {enrolledCount} / {training.max_capacity || 12}</span>
                  </div>
                </div>

                <div className="training-status">
                  <span className={`status-badge ${training.status?.toLowerCase()}`}>
                    {training.status}
                  </span>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="training-details">
                  <div className="detail-section">
                    <h4>Training Details</h4>
                    <div className="fields-grid">
                      <div className="field">
                        <label>Name</label>
                        {editing?.id === training.id && editing.field === 'name' ? (
                          <div className="edit-controls">
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveEdit}><Save size={14} /></button>
                            <button onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="field-value" onClick={() => startEdit(training.id, 'name', training.name)}>
                            {training.name} <Edit2 size={12} />
                          </div>
                        )}
                      </div>

                      <div className="field">
                        <label>Status</label>
                        {editing?.id === training.id && editing.field === 'status' ? (
                          <div className="edit-controls">
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            >
                              <option value="Open">Open</option>
                              <option value="Filling">Filling</option>
                              <option value="Waitlist">Waitlist</option>
                              <option value="Closed">Closed</option>
                              <option value="Completed">Completed</option>
                            </select>
                            <button onClick={saveEdit}><Save size={14} /></button>
                            <button onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="field-value" onClick={() => startEdit(training.id, 'status', training.status)}>
                            {training.status} <Edit2 size={12} />
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
                            <button onClick={saveEdit}><Save size={14} /></button>
                            <button onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="field-value" onClick={() => startEdit(training.id, 'location', training.location)}>
                            {training.location || <em>Not set</em>} <Edit2 size={12} />
                          </div>
                        )}
                      </div>

                      <div className="field">
                        <label>Max Capacity</label>
                        {editing?.id === training.id && editing.field === 'max_capacity' ? (
                          <div className="edit-controls">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(parseInt(e.target.value))}
                              autoFocus
                            />
                            <button onClick={saveEdit}><Save size={14} /></button>
                            <button onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="field-value" onClick={() => startEdit(training.id, 'max_capacity', training.max_capacity)}>
                            {training.max_capacity || 12} <Edit2 size={12} />
                          </div>
                        )}
                      </div>

                      <div className="field">
                        <label>Start Date</label>
                        {editing?.id === training.id && editing.field === 'start_date' ? (
                          <div className="edit-controls">
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveEdit}><Save size={14} /></button>
                            <button onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="field-value" onClick={() => startEdit(training.id, 'start_date', training.start_date)}>
                            {training.start_date ? format(new Date(training.start_date), 'MMM d, yyyy') : <em>Not set</em>} <Edit2 size={12} />
                          </div>
                        )}
                      </div>

                      <div className="field">
                        <label>End Date</label>
                        {editing?.id === training.id && editing.field === 'end_date' ? (
                          <div className="edit-controls">
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveEdit}><Save size={14} /></button>
                            <button onClick={cancelEdit}><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="field-value" onClick={() => startEdit(training.id, 'end_date', training.end_date)}>
                            {training.end_date ? format(new Date(training.end_date), 'MMM d, yyyy') : <em>Not set</em>} <Edit2 size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Enrolled Applicants ({trainingApplicants.length})</h4>
                    <div className="applicants-list">
                      {trainingApplicants.length === 0 ? (
                        <p className="empty">No applicants assigned to this training</p>
                      ) : (
                        trainingApplicants.map(applicant => (
                          <Link
                            key={applicant.id}
                            to={`/people/${applicant.id}`}
                            className="applicant-row"
                          >
                            <span className="name">{applicant.name}</span>
                            <span
                              className="stage"
                              style={{ background: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] }}
                            >
                              {applicant.pipeline_stage}
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
      </div>
    </div>
  )
}
