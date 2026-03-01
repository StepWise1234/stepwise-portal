import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Heart,
  GraduationCap,
  Edit2,
  Save,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Video,
  Send,
  Loader2
} from 'lucide-react'
import { useApplicant, useApplication, useUpdateApplicant, useUpdateApplication, useMoveStage } from '../hooks/useApplicants'
import { useTrainings } from '../hooks/useTrainings'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '../lib/supabase'
import { BOOKING_LINKS } from '../lib/calendly'

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void
    }
  }
}

type Tab = 'overview' | 'application' | 'health' | 'pipeline' | 'engagement'

export function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({})

  const { data: applicant, isLoading } = useApplicant(id!)
  const { data: application } = useApplication(applicant?.email || null)
  const { data: trainings } = useTrainings()
  const updateApplicant = useUpdateApplicant()
  const updateApplication = useUpdateApplication()
  const moveStage = useMoveStage()

  const sendSchedulingEmail = async (type: 'chemistry_call' | 'interview') => {
    if (!applicant) return
    setSendingEmail(type)
    try {
      const response = await fetch('https://stepwise.education/api/send-scheduling-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicant.id, type })
      })
      if (response.ok) {
        setEmailSent(prev => ({ ...prev, [type]: true }))
        setTimeout(() => setEmailSent(prev => ({ ...prev, [type]: false })), 3000)
      } else {
        alert('Failed to send email. Check console for details.')
        console.error(await response.text())
      }
    } catch (err) {
      console.error('Email send error:', err)
      alert('Failed to send email. Is the API configured?')
    } finally {
      setSendingEmail(null)
    }
  }

  // Load Calendly widget script
  useEffect(() => {
    if (!document.getElementById('calendly-widget-script')) {
      const script = document.createElement('script')
      script.id = 'calendly-widget-script'
      script.src = 'https://assets.calendly.com/assets/external/widget.js'
      script.async = true
      document.head.appendChild(script)

      const link = document.createElement('link')
      link.href = 'https://assets.calendly.com/assets/external/widget.css'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
  }, [])

  const openCalendlyPopup = (type: 'chemistry_call' | 'interview') => {
    const baseUrl = BOOKING_LINKS[type]
    // Pre-fill email and name if available
    const prefill = applicant ? `?email=${encodeURIComponent(applicant.email || '')}&name=${encodeURIComponent(applicant.name || '')}` : ''

    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: baseUrl + prefill })
    }
  }

  if (isLoading) {
    return <div className="page loading">Loading...</div>
  }

  if (!applicant) {
    return <div className="page error">Applicant not found</div>
  }

  const currentStageIndex = PIPELINE_STAGES.indexOf(applicant.pipeline_stage as PipelineStage)

  const handleMoveStage = (direction: 'forward' | 'back') => {
    const newIndex = direction === 'forward' ? currentStageIndex + 1 : currentStageIndex - 1
    if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
      moveStage.mutate({ id: applicant.id, stage: PIPELINE_STAGES[newIndex] })
    }
  }

  const startEdit = (field: string, currentValue: any) => {
    setEditing(field)
    setEditValue(currentValue || '')
  }

  const saveEdit = (field: string, isApplication: boolean = false) => {
    if (isApplication && application) {
      updateApplication.mutate({ id: application.id, updates: { [field]: editValue } })
    } else {
      updateApplicant.mutate({ id: applicant.id, updates: { [field]: editValue } })
    }
    setEditing(null)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditValue('')
  }

  const EditableField = ({
    label,
    field,
    value,
    isApplication = false,
    type = 'text',
    options
  }: {
    label: string
    field: string
    value: any
    isApplication?: boolean
    type?: 'text' | 'textarea' | 'select' | 'date' | 'boolean'
    options?: { value: string; label: string }[]
  }) => {
    const isEditing = editing === field

    return (
      <div className={`field ${isEditing ? 'editing' : ''}`}>
        <label>{label}</label>
        {isEditing ? (
          <div className="edit-controls">
            {type === 'textarea' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
            ) : type === 'select' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              >
                {options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : type === 'boolean' ? (
              <select
                value={editValue ? 'true' : 'false'}
                onChange={(e) => setEditValue(e.target.value === 'true')}
                autoFocus
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
            )}
            <button onClick={() => saveEdit(field, isApplication)} className="btn-save">
              <Save size={14} />
            </button>
            <button onClick={cancelEdit} className="btn-cancel">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="field-value" onClick={() => startEdit(field, value)}>
            <span>{value || <em className="empty">Not set</em>}</span>
            <Edit2 size={14} className="edit-icon" />
          </div>
        )}
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'application', label: 'Application', icon: FileText },
    { id: 'health', label: 'Health & Safety', icon: Heart },
    { id: 'pipeline', label: 'Pipeline', icon: Calendar },
    { id: 'engagement', label: 'Engagement', icon: GraduationCap },
  ]

  return (
    <div className="page person-detail">
      <header className="page-header">
        <Link to="/people" className="back-link">
          <ArrowLeft size={20} />
          Back to People
        </Link>
      </header>

      {/* Person Header */}
      <div className="person-header">
        <div className="person-avatar large">
          <User size={48} />
        </div>
        <div className="person-title">
          <h1>{applicant.name}</h1>
          <div className="contact-info">
            {applicant.email && <span><Mail size={16} /> {applicant.email}</span>}
            {applicant.phone && <span><Phone size={16} /> {applicant.phone}</span>}
          </div>
        </div>
        <div className="person-stage">
          <span
            className="stage-badge large"
            style={{ background: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] }}
          >
            {STAGE_LABELS[applicant.pipeline_stage as PipelineStage]}
          </span>
          <div className="stage-actions">
            <button
              onClick={() => handleMoveStage('back')}
              disabled={currentStageIndex === 0}
              className="btn-stage"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => handleMoveStage('forward')}
              disabled={currentStageIndex === PIPELINE_STAGES.length - 1}
              className="btn-stage"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions - Booking Links */}
      <div className="quick-actions">
        <div className="booking-buttons">
          <button
            onClick={() => openCalendlyPopup('chemistry_call')}
            className="btn-booking chemistry"
          >
            <Video size={16} />
            Schedule Chemistry Call
          </button>

          <button
            onClick={() => openCalendlyPopup('interview')}
            className="btn-booking interview"
          >
            <Calendar size={16} />
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="tab-panel overview">
            <section className="card">
              <h3>Contact Information</h3>
              <div className="fields-grid">
                <EditableField label="Name" field="name" value={applicant.name} />
                <EditableField label="Email" field="email" value={applicant.email} />
                <EditableField label="Phone" field="phone" value={applicant.phone} />
                <EditableField label="Address" field="address" value={applicant.address} />
                <EditableField label="Birth Date" field="birth_date" value={applicant.birth_date} type="date" />
              </div>
            </section>

            <section className="card">
              <h3>Emergency Contact</h3>
              <div className="fields-grid">
                <EditableField label="Name" field="emergency_contact_name" value={applicant.emergency_contact_name} />
                <EditableField label="Phone" field="emergency_contact_phone" value={applicant.emergency_contact_phone} />
              </div>
            </section>

            <section className="card">
              <h3>Training Assignment</h3>
              <div className="fields-grid">
                <EditableField
                  label="Training"
                  field="training_id"
                  value={applicant.training_id}
                  type="select"
                  options={[
                    { value: '', label: 'Not assigned' },
                    ...(trainings?.map(t => ({ value: t.id, label: t.name })) || [])
                  ]}
                />
                <EditableField
                  label="Accommodation"
                  field="accommodation_choice"
                  value={applicant.accommodation_choice}
                  type="select"
                  options={[
                    { value: '', label: 'Not selected' },
                    { value: 'bedroom-1', label: 'Room 1 - Queen Suite' },
                    { value: 'bedroom-2', label: 'Room 2 - Double Room (2 beds)' },
                    { value: 'bedroom-3', label: 'Room 3 - Artisan Room (2 beds)' },
                    { value: 'bedroom-4', label: 'Room 4 - Modern Double (2 beds)' },
                    { value: 'bedroom-5', label: 'Room 5 - Work Suite' },
                    { value: 'bedroom-6', label: 'Room 6 - Attic Retreat' },
                    { value: 'bedroom-7', label: 'Room 7 - Skylight Suite' },
                    { value: 'bedroom-8', label: 'Room 8 - Grand Suite (2 queens)' },
                    { value: 'commute', label: 'Commute (not staying)' }
                  ]}
                />
                <EditableField
                  label="Accommodation Confirmed"
                  field="accommodation_confirmed"
                  value={applicant.accommodation_confirmed}
                  type="boolean"
                />
              </div>
            </section>

            <section className="card">
              <h3>Notes</h3>
              <EditableField label="Internal Notes" field="notes" value={applicant.notes} type="textarea" />
            </section>
          </div>
        )}

        {activeTab === 'application' && (
          <div className="tab-panel application">
            {!applicant.application_date && !applicant.journey_work_experience && !applicant.training_goals && !applicant.notes && !application ? (
              <div className="empty-state">
                <AlertCircle size={48} />
                <h3>No application found</h3>
                <p>This person hasn't submitted an application through the portal yet.</p>
              </div>
            ) : (
              <>
                <section className="card">
                  <h3>Contact Information</h3>
                  <div className="fields-grid">
                    <div className="field readonly">
                      <label>Email</label>
                      <span>{applicant.email || <em className="empty">Not set</em>}</span>
                    </div>
                    <div className="field readonly">
                      <label>Phone</label>
                      <span>{applicant.phone || <em className="empty">Not set</em>}</span>
                    </div>
                    <div className="field readonly">
                      <label>Address</label>
                      <span>{applicant.address || <em className="empty">Not set</em>}</span>
                    </div>
                    <div className="field readonly">
                      <label>Birth Date</label>
                      <span>{applicant.birth_date ? format(new Date(applicant.birth_date), 'MMM d, yyyy') : <em className="empty">Not set</em>}</span>
                    </div>
                  </div>
                </section>

                <section className="card">
                  <h3>Emergency Contact</h3>
                  <div className="fields-grid">
                    <div className="field readonly">
                      <label>Name</label>
                      <span>{applicant.emergency_contact_name || <em className="empty">Not set</em>}</span>
                    </div>
                    <div className="field readonly">
                      <label>Phone</label>
                      <span>{applicant.emergency_contact_phone || <em className="empty">Not set</em>}</span>
                    </div>
                  </div>
                </section>

                <section className="card">
                  <h3>Application Date</h3>
                  <div className="field readonly">
                    <label>Submitted</label>
                    <span>{applicant.application_date ? format(new Date(applicant.application_date), 'MMM d, yyyy h:mm a') : <em className="empty">Unknown</em>}</span>
                  </div>
                </section>

                {/* Experience from applicant record */}
                <section className="card">
                  <h3>Experience & Background</h3>
                  <div className="fields-stack">
                    <EditableField
                      label="Journey Work Experience"
                      field="journey_work_experience"
                      value={applicant.journey_work_experience}
                      type="textarea"
                    />
                    <EditableField
                      label="Medicine Experience"
                      field="medicine_experience"
                      value={applicant.medicine_experience}
                      type="textarea"
                    />
                    <EditableField
                      label="Serving Experience"
                      field="serving_experience"
                      value={applicant.serving_experience}
                      type="textarea"
                    />
                    <div className="field readonly">
                      <label>Psychedelic Medicine Use</label>
                      <span>
                        {applicant.psychedelic_medicine_use && applicant.psychedelic_medicine_use.length > 0
                          ? applicant.psychedelic_medicine_use.join(', ')
                          : <em className="empty">None reported</em>}
                      </span>
                    </div>
                    <EditableField
                      label="Recreational Drug Use"
                      field="recreational_drug_use"
                      value={applicant.recreational_drug_use}
                      type="textarea"
                    />
                  </div>
                </section>

                <section className="card">
                  <h3>Goals & Intentions</h3>
                  <div className="fields-stack">
                    <EditableField
                      label="Training Goals"
                      field="training_goals"
                      value={applicant.training_goals}
                      type="textarea"
                    />
                    <EditableField
                      label="Life Circumstances"
                      field="life_circumstances"
                      value={applicant.life_circumstances}
                      type="textarea"
                    />
                    <EditableField
                      label="Integration Support"
                      field="integration_support"
                      value={applicant.integration_support}
                      type="textarea"
                    />
                    <EditableField
                      label="Strengths & Hobbies"
                      field="strengths_hobbies"
                      value={applicant.strengths_hobbies}
                      type="textarea"
                    />
                    <EditableField
                      label="Anything Else"
                      field="anything_else"
                      value={applicant.anything_else}
                      type="textarea"
                    />
                  </div>
                </section>

                <section className="card">
                  <h3>Physical Health Summary</h3>
                  <div className="fields-stack">
                    <div className="field readonly">
                      <label>Physical Symptoms</label>
                      <span>
                        {applicant.physical_symptoms && applicant.physical_symptoms.length > 0
                          ? applicant.physical_symptoms.join(', ')
                          : <em className="empty">None reported</em>}
                      </span>
                    </div>
                    <div className="field readonly">
                      <label>Dietary Preferences</label>
                      <span>{applicant.dietary_preferences || <em className="empty">None</em>}</span>
                    </div>
                    <div className="field readonly">
                      <label>Allergies</label>
                      <span>{applicant.allergies || <em className="empty">None</em>}</span>
                    </div>
                    <EditableField
                      label="Supplements"
                      field="supplements"
                      value={applicant.supplements}
                      type="textarea"
                    />
                  </div>
                </section>

                <section className="card">
                  <h3>Admin Notes</h3>
                  <EditableField
                    label="Notes about this application"
                    field="notes"
                    value={applicant.notes}
                    type="textarea"
                  />
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <div className="tab-panel health">
            {/* Support Assessment Score */}
            {(() => {
              let score = 0
              let maxScore = 0
              const factors: { label: string; points: number; present: boolean }[] = []

              // Stress level (0-3 points based on severity)
              maxScore += 3
              if (applicant.stress_level !== null && applicant.stress_level !== undefined) {
                const stressPoints = applicant.stress_level >= 8 ? 3 : applicant.stress_level >= 6 ? 2 : applicant.stress_level >= 4 ? 1 : 0
                score += stressPoints
                if (stressPoints > 0) factors.push({ label: `Stress level ${applicant.stress_level}/10`, points: stressPoints, present: true })
              }

              // Suicide consideration (3 points - critical)
              maxScore += 3
              const hasSuicideConsideration = applicant.suicide_consideration &&
                applicant.suicide_consideration.toLowerCase() !== 'nope' &&
                applicant.suicide_consideration.toLowerCase() !== 'no' &&
                applicant.suicide_consideration.toLowerCase() !== 'never'
              if (hasSuicideConsideration) {
                score += 3
                factors.push({ label: 'Suicide consideration', points: 3, present: true })
              }

              // Mental health diagnosis (2 points)
              maxScore += 2
              if (applicant.mental_health_dx && applicant.mental_health_dx.trim()) {
                score += 2
                factors.push({ label: 'Mental health diagnosis', points: 2, present: true })
              }

              // Psychiatric medications (1 point)
              maxScore += 1
              if (applicant.psych_medications && applicant.psych_medications.trim()) {
                score += 1
                factors.push({ label: 'On psychiatric medications', points: 1, present: true })
              }

              // Trauma indicators in life experiences (2 points)
              maxScore += 2
              if (applicant.life_experiences && applicant.life_experiences.length > 0) {
                const traumaIndicators = applicant.life_experiences.filter(exp =>
                  exp.toLowerCase().includes('abuse') ||
                  exp.toLowerCase().includes('trauma') ||
                  exp.toLowerCase().includes('addiction') ||
                  exp.toLowerCase().includes('loss') ||
                  exp.toLowerCase().includes('death')
                )
                if (traumaIndicators.length > 0) {
                  const traumaPoints = traumaIndicators.length >= 3 ? 2 : 1
                  score += traumaPoints
                  factors.push({ label: `${traumaIndicators.length} trauma-related experiences`, points: traumaPoints, present: true })
                }
              }

              // Cognitive symptoms (1 point)
              maxScore += 1
              if (applicant.cognitive_symptoms && applicant.cognitive_symptoms.length >= 3) {
                score += 1
                factors.push({ label: `${applicant.cognitive_symptoms.length} cognitive symptoms`, points: 1, present: true })
              }

              // Limited support network (1 point - negative indicator)
              maxScore += 1
              if (!applicant.support_network || applicant.support_network.length <= 2) {
                score += 1
                factors.push({ label: 'Limited support network', points: 1, present: true })
              }

              // Self-care concerns (1 point)
              maxScore += 1
              if (applicant.self_care && (applicant.self_care.toLowerCase().includes('no time') || applicant.self_care.toLowerCase().includes('squeeze'))) {
                score += 1
                factors.push({ label: 'Limited self-care', points: 1, present: true })
              }

              const level = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low'
              const levelLabel = score >= 6 ? 'Needs Additional Support' : score >= 3 ? 'Monitor Closely' : 'Standard Support'
              const levelColor = score >= 6 ? '#EF4444' : score >= 3 ? '#F59E0B' : '#22C55E'

              return (
                <section className="card support-assessment">
                  <h3><Heart size={20} /> Support Assessment</h3>
                  <div className="assessment-score" style={{ borderLeft: `4px solid ${levelColor}` }}>
                    <div className="score-header">
                      <span className="score-value" style={{ color: levelColor }}>{score}/{maxScore}</span>
                      <span className={`score-label level-${level}`} style={{ background: `${levelColor}20`, color: levelColor }}>{levelLabel}</span>
                    </div>
                    {factors.length > 0 && (
                      <div className="score-factors">
                        {factors.map((f, idx) => (
                          <div key={idx} className="factor">
                            <span className="factor-label">{f.label}</span>
                            <span className="factor-points">+{f.points}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {score === 0 && (
                      <p className="no-concerns">No significant support indicators identified</p>
                    )}
                  </div>
                </section>
              )
            })()}

            {/* Health Screening Alerts */}
            {(() => {
              const alerts: { level: 'high' | 'medium' | 'low'; message: string }[] = []

              // Check stress level from applicant record
              if (applicant.stress_level !== null && applicant.stress_level !== undefined) {
                if (applicant.stress_level >= 8) {
                  alerts.push({ level: 'high', message: `High stress level reported: ${applicant.stress_level}/10` })
                } else if (applicant.stress_level >= 6) {
                  alerts.push({ level: 'medium', message: `Elevated stress level: ${applicant.stress_level}/10` })
                }
              }

              // Check suicide consideration
              if (applicant.suicide_consideration && applicant.suicide_consideration.toLowerCase() !== 'nope' && applicant.suicide_consideration.toLowerCase() !== 'no' && applicant.suicide_consideration.toLowerCase() !== 'never') {
                alerts.push({ level: 'high', message: `Suicide consideration flagged: "${applicant.suicide_consideration}"` })
              }

              // Check mental health diagnosis
              if (applicant.mental_health_dx && applicant.mental_health_dx.trim()) {
                alerts.push({ level: 'medium', message: `Mental health diagnosis reported` })
              }

              // Check psychiatric medications
              if (applicant.psych_medications && applicant.psych_medications.trim()) {
                alerts.push({ level: 'low', message: `On psychiatric medications` })
              }

              // Check physical health issues
              if (applicant.physical_health && applicant.physical_health.trim()) {
                alerts.push({ level: 'low', message: `Physical health issues reported` })
              }

              // Check life experiences for trauma indicators
              if (applicant.life_experiences && applicant.life_experiences.length > 0) {
                const traumaIndicators = applicant.life_experiences.filter(exp =>
                  exp.toLowerCase().includes('abuse') ||
                  exp.toLowerCase().includes('trauma') ||
                  exp.toLowerCase().includes('addiction')
                )
                if (traumaIndicators.length > 0) {
                  alerts.push({ level: 'medium', message: `Trauma/abuse history indicated` })
                }
              }

              if (alerts.length === 0) return null

              return (
                <section className="card screening-alerts">
                  <h3><AlertCircle size={20} /> Health Screening Alerts</h3>
                  <div className="alerts-list">
                    {alerts.map((alert, idx) => (
                      <div key={idx} className={`alert alert-${alert.level}`}>
                        <span className="alert-badge">{alert.level.toUpperCase()}</span>
                        <span className="alert-message">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })()}

            {/* Stress & Mental State */}
            <section className="card">
              <h3>Stress & Mental State</h3>
              <div className="fields-stack">
                <div className={`field readonly ${applicant.stress_level !== null && applicant.stress_level >= 7 ? 'highlight-warning' : ''}`}>
                  <label>Stress Level</label>
                  <span className={applicant.stress_level !== null && applicant.stress_level >= 7 ? 'text-warning' : ''}>
                    {applicant.stress_level !== null ? `${applicant.stress_level}/10` : <em className="empty">Not reported</em>}
                    {applicant.stress_level !== null && applicant.stress_level >= 8 && ' ⚠️ HIGH'}
                  </span>
                </div>
                <div className={`field readonly ${applicant.suicide_consideration && applicant.suicide_consideration.toLowerCase() !== 'nope' && applicant.suicide_consideration.toLowerCase() !== 'no' ? 'highlight-danger' : ''}`}>
                  <label>Suicide Consideration</label>
                  <span>{applicant.suicide_consideration || <em className="empty">Not reported</em>}</span>
                </div>
                <EditableField
                  label="Stress Sources"
                  field="stress_sources"
                  value={applicant.stress_sources}
                  type="textarea"
                />
                <EditableField
                  label="Trauma Details"
                  field="trauma_details"
                  value={applicant.trauma_details}
                  type="textarea"
                />
              </div>
            </section>

            {/* Life Experiences & Coping */}
            <section className="card">
              <h3>Life Experiences & Coping</h3>
              <div className="fields-stack">
                <div className="field readonly">
                  <label>Life Experiences</label>
                  <span>
                    {applicant.life_experiences && applicant.life_experiences.length > 0
                      ? applicant.life_experiences.join(', ')
                      : <em className="empty">None reported</em>}
                  </span>
                </div>
                <div className="field readonly">
                  <label>Cognitive Symptoms</label>
                  <span>
                    {applicant.cognitive_symptoms && applicant.cognitive_symptoms.length > 0
                      ? applicant.cognitive_symptoms.join(', ')
                      : <em className="empty">None reported</em>}
                  </span>
                </div>
                <div className="field readonly">
                  <label>Coping Mechanisms</label>
                  <span>
                    {applicant.coping_mechanisms && applicant.coping_mechanisms.length > 0
                      ? applicant.coping_mechanisms.join(', ')
                      : <em className="empty">None reported</em>}
                  </span>
                </div>
                <div className="field readonly">
                  <label>Self Care</label>
                  <span>{applicant.self_care || <em className="empty">Not reported</em>}</span>
                </div>
                <div className="field readonly">
                  <label>Support Network</label>
                  <span>
                    {applicant.support_network && applicant.support_network.length > 0
                      ? applicant.support_network.join(', ')
                      : <em className="empty">None reported</em>}
                  </span>
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Physical Health</h3>
              <div className="fields-stack">
                <EditableField
                  label="Physical Health Issues"
                  field="physical_health"
                  value={applicant.physical_health}
                  type="textarea"
                />
                <EditableField
                  label="Physical Medications"
                  field="physical_medications"
                  value={applicant.physical_medications}
                  type="textarea"
                />
                <EditableField
                  label="Allergies"
                  field="allergies"
                  value={applicant.allergies}
                  type="textarea"
                />
                <EditableField
                  label="Dietary Preferences"
                  field="dietary_preferences"
                  value={applicant.dietary_preferences}
                  type="textarea"
                />
              </div>
            </section>

            <section className="card">
              <h3>Mental Health</h3>
              <div className="fields-stack">
                <EditableField
                  label="Mental Health Diagnosis"
                  field="mental_health_dx"
                  value={applicant.mental_health_dx}
                  type="textarea"
                />
                <EditableField
                  label="Current Mental Health"
                  field="current_mental_health"
                  value={applicant.current_mental_health}
                  type="textarea"
                />
                <EditableField
                  label="Psychiatric Medications"
                  field="psych_medications"
                  value={applicant.psych_medications}
                  type="textarea"
                />
                <div className="field readonly">
                  <label>Mental Health Support</label>
                  <span>
                    {applicant.mental_health_support && applicant.mental_health_support.length > 0
                      ? applicant.mental_health_support.join(', ')
                      : <em className="empty">None reported</em>}
                  </span>
                </div>
                <div className="field readonly">
                  <label>Psychedelic Medicine Experience</label>
                  <span>
                    {applicant.psychedelic_medicine_use && applicant.psychedelic_medicine_use.length > 0
                      ? applicant.psychedelic_medicine_use.join(', ')
                      : <em className="empty">None reported</em>}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="tab-panel pipeline">
            {/* Modern Pipeline Progress */}
            <section className="card pipeline-progress-card">
              <h3>Pipeline Progress</h3>
              <div className="pipeline-progress">
                <div className="pipeline-track">
                  <div
                    className="pipeline-fill"
                    style={{
                      width: `${((currentStageIndex + 1) / PIPELINE_STAGES.length) * 100}%`,
                      background: `linear-gradient(90deg, ${STAGE_COLORS.lead}, ${STAGE_COLORS[applicant.pipeline_stage as PipelineStage] || STAGE_COLORS.lead})`
                    }}
                  />
                </div>
                <div className="pipeline-stages">
                  {PIPELINE_STAGES.map((stage, index) => {
                    const isCompleted = index < currentStageIndex
                    const isCurrent = index === currentStageIndex
                    const isPending = index > currentStageIndex
                    return (
                      <div
                        key={stage}
                        className={`pipeline-stage ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
                      >
                        <div
                          className="stage-marker"
                          style={{
                            background: isCompleted || isCurrent ? STAGE_COLORS[stage] : '#E5E7EB',
                            boxShadow: isCurrent ? `0 0 0 4px ${STAGE_COLORS[stage]}30` : 'none'
                          }}
                        >
                          {isCompleted && <span className="checkmark">✓</span>}
                          {isCurrent && <span className="current-dot" />}
                        </div>
                        <span className="stage-name" style={{ color: isCurrent ? STAGE_COLORS[stage] : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {STAGE_LABELS[stage]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Chemistry Call with Calendly */}
            <section className="card scheduling-card">
              <div className="card-header-row">
                <h3><Video size={20} /> Chemistry Call</h3>
                <div className="btn-group">
                  <button
                    onClick={() => sendSchedulingEmail('chemistry_call')}
                    className={`btn-send-email ${emailSent.chemistry_call ? 'sent' : ''}`}
                    disabled={sendingEmail === 'chemistry_call' || !applicant.email}
                    title={!applicant.email ? 'No email address' : 'Send scheduling link to applicant'}
                  >
                    {sendingEmail === 'chemistry_call' ? (
                      <><Loader2 size={16} className="spin" /> Sending...</>
                    ) : emailSent.chemistry_call ? (
                      <><Mail size={16} /> Sent!</>
                    ) : (
                      <><Send size={16} /> Email Link</>
                    )}
                  </button>
                  <button
                    onClick={() => openCalendlyPopup('chemistry_call')}
                    className="btn-calendly"
                  >
                    <Calendar size={16} />
                    Book Now
                  </button>
                </div>
              </div>
              <div className="scheduling-status">
                <div className={`status-indicator ${applicant.chemistry_call_status || 'not_scheduled'}`}>
                  <span className="status-dot" />
                  <span className="status-text">
                    {applicant.chemistry_call_status === 'completed' ? 'Completed' :
                     applicant.chemistry_call_status === 'scheduled' ? 'Scheduled' :
                     applicant.chemistry_call_status === 'no_show' ? 'No Show' : 'Not Scheduled'}
                  </span>
                  {applicant.chemistry_call_date && (
                    <span className="status-date">
                      {format(new Date(applicant.chemistry_call_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="fields-grid">
                <EditableField label="Date" field="chemistry_call_date" value={applicant.chemistry_call_date} type="date" />
                <EditableField
                  label="Status"
                  field="chemistry_call_status"
                  value={applicant.chemistry_call_status}
                  type="select"
                  options={[
                    { value: 'not_scheduled', label: 'Not Scheduled' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'no_show', label: 'No Show' },
                  ]}
                />
              </div>
              <div className="fields-stack">
                <EditableField label="Notes" field="chemistry_call_notes" value={applicant.chemistry_call_notes} type="textarea" />
              </div>
            </section>

            {/* Interview with Calendly */}
            <section className="card scheduling-card">
              <div className="card-header-row">
                <h3><Calendar size={20} /> Interview</h3>
                <div className="btn-group">
                  <button
                    onClick={() => sendSchedulingEmail('interview')}
                    className={`btn-send-email ${emailSent.interview ? 'sent' : ''}`}
                    disabled={sendingEmail === 'interview' || !applicant.email}
                    title={!applicant.email ? 'No email address' : 'Send scheduling link to applicant'}
                  >
                    {sendingEmail === 'interview' ? (
                      <><Loader2 size={16} className="spin" /> Sending...</>
                    ) : emailSent.interview ? (
                      <><Mail size={16} /> Sent!</>
                    ) : (
                      <><Send size={16} /> Email Link</>
                    )}
                  </button>
                  <button
                    onClick={() => openCalendlyPopup('interview')}
                    className="btn-calendly"
                  >
                    <Calendar size={16} />
                    Book Now
                  </button>
                </div>
              </div>
              <div className="scheduling-status">
                <div className={`status-indicator ${applicant.interview_status || 'not_scheduled'}`}>
                  <span className="status-dot" />
                  <span className="status-text">
                    {applicant.interview_status === 'completed' ? 'Completed' :
                     applicant.interview_status === 'scheduled' ? 'Scheduled' :
                     applicant.interview_status === 'no_show' ? 'No Show' : 'Not Scheduled'}
                  </span>
                  {applicant.interview_date && (
                    <span className="status-date">
                      {format(new Date(applicant.interview_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
              <div className="fields-grid">
                <EditableField label="Date" field="interview_date" value={applicant.interview_date} type="date" />
                <EditableField
                  label="Status"
                  field="interview_status"
                  value={applicant.interview_status}
                  type="select"
                  options={[
                    { value: 'not_scheduled', label: 'Not Scheduled' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'no_show', label: 'No Show' },
                  ]}
                />
              </div>
              <div className="fields-stack">
                <EditableField label="Notes" field="interview_notes" value={applicant.interview_notes} type="textarea" />
              </div>
            </section>

            <section className="card">
              <h3>Approval & Payment</h3>
              <div className="fields-grid">
                <EditableField
                  label="Approval Status"
                  field="approval_status"
                  value={applicant.approval_status}
                  type="select"
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'conditional', label: 'Conditional' },
                    { value: 'declined', label: 'Declined' },
                  ]}
                />
                <EditableField label="Approval Date" field="approval_date" value={applicant.approval_date} type="date" />
                <EditableField
                  label="Payment Status"
                  field="payment_status"
                  value={applicant.payment_status}
                  type="select"
                  options={[
                    { value: 'Unpaid', label: 'Unpaid' },
                    { value: 'Deposit Paid', label: 'Deposit Paid' },
                    { value: 'Paid in Full', label: 'Paid in Full' },
                    { value: 'Payment Plan', label: 'Payment Plan' },
                    { value: 'Refunded', label: 'Refunded' },
                  ]}
                />
                <EditableField label="Payment Date" field="payment_date" value={applicant.payment_date} type="date" />
                <EditableField label="Waiver Signed" field="signed_waiver" value={applicant.signed_waiver} type="boolean" />
              </div>
            </section>

            <section className="card">
              <h3>Shipping</h3>
              <div className="fields-grid">
                <EditableField
                  label="Shipping Status"
                  field="shipping_status"
                  value={applicant.shipping_status}
                  type="select"
                  options={[
                    { value: 'not_shipped', label: 'Not Shipped' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                  ]}
                />
                <EditableField label="Carrier" field="shipping_carrier" value={applicant.shipping_carrier} />
                <EditableField label="Tracking Number" field="shipping_tracking_number" value={applicant.shipping_tracking_number} />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'engagement' && (
          <div className="tab-panel engagement">
            <section className="card">
              <h3>Online Course Access</h3>
              <div className="fields-grid">
                <EditableField label="Has Access" field="online_course_access" value={applicant.online_course_access} type="boolean" />
                <EditableField label="Progress (%)" field="online_course_progress" value={applicant.online_course_progress} />
                <EditableField label="Course Level" field="course_level" value={applicant.course_level} />
                <EditableField label="Portal Signup Date" field="portal_signup_date" value={applicant.portal_signup_date} type="date" />
              </div>
            </section>

            <section className="card">
              <h3>Course Access by Level</h3>
              <div className="course-access-grid">
                {applicant.course_access && Object.entries(applicant.course_access).map(([level, hasAccess]) => (
                  <div key={level} className={`course-badge ${hasAccess ? 'active' : ''}`}>
                    {level.replace(/_/g, ' ')}
                    {hasAccess ? ' ✓' : ''}
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h3>Communication History</h3>
              <div className="fields-grid">
                <div className="field readonly">
                  <label>Emails Sent</label>
                  <span>{applicant.email_count || 0}</span>
                </div>
                <div className="field readonly">
                  <label>Last Email</label>
                  <span>{applicant.last_email_sent_at ? format(new Date(applicant.last_email_sent_at), 'MMM d, yyyy') : 'Never'}</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
