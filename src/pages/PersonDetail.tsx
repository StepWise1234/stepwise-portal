import { useState } from 'react'
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
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { useApplicant, useApplication, useUpdateApplicant, useUpdateApplication, useMoveStage } from '../hooks/useApplicants'
import { useTrainings } from '../hooks/useTrainings'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '../lib/supabase'
import { BOOKING_LINKS } from '../lib/calendly'

type Tab = 'overview' | 'application' | 'health' | 'pipeline' | 'engagement'

export function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')

  const { data: applicant, isLoading } = useApplicant(id!)
  const { data: application } = useApplication(applicant?.email || null)
  const { data: trainings } = useTrainings()
  const updateApplicant = useUpdateApplicant()
  const updateApplication = useUpdateApplication()
  const moveStage = useMoveStage()
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const copyBookingLink = (type: 'chemistry_call' | 'interview') => {
    const link = BOOKING_LINKS[type]
    navigator.clipboard.writeText(link)
    setCopiedLink(type)
    setTimeout(() => setCopiedLink(null), 2000)
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
          <a
            href={BOOKING_LINKS.chemistry_call}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-booking chemistry"
          >
            <Video size={16} />
            Schedule Chemistry Call
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => copyBookingLink('chemistry_call')}
            className="btn-copy"
            title="Copy link"
          >
            {copiedLink === 'chemistry_call' ? <Check size={14} /> : <Copy size={14} />}
          </button>

          <a
            href={BOOKING_LINKS.interview}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-booking interview"
          >
            <Calendar size={16} />
            Schedule Interview
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => copyBookingLink('interview')}
            className="btn-copy"
            title="Copy link"
          >
            {copiedLink === 'interview' ? <Check size={14} /> : <Copy size={14} />}
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
            {!application ? (
              <div className="empty-state">
                <AlertCircle size={48} />
                <h3>No application found</h3>
                <p>This person hasn't submitted an application through the portal yet.</p>
              </div>
            ) : (
              <>
                <section className="card">
                  <h3>Personal Background</h3>
                  <div className="fields-grid">
                    <EditableField
                      label="Preferred Name"
                      field="preferred_name"
                      value={application.preferred_name}
                      isApplication
                    />
                    <EditableField
                      label="Signal Handle"
                      field="signal_handle"
                      value={application.signal_handle}
                      isApplication
                    />
                  </div>
                </section>

                <section className="card">
                  <h3>Experience</h3>
                  <div className="fields-stack">
                    <EditableField
                      label="Journey Work Experience"
                      field="journey_work_experience"
                      value={application.journey_work_experience}
                      type="textarea"
                      isApplication
                    />
                    <EditableField
                      label="Medicine Experience"
                      field="medicine_experience"
                      value={application.medicine_experience}
                      type="textarea"
                      isApplication
                    />
                    <EditableField
                      label="Serving Experience"
                      field="serving_experience"
                      value={application.serving_experience}
                      type="textarea"
                      isApplication
                    />
                  </div>
                </section>

                <section className="card">
                  <h3>Goals & Intentions</h3>
                  <div className="fields-stack">
                    <EditableField
                      label="Training Goals"
                      field="training_goals"
                      value={application.training_goals}
                      type="textarea"
                      isApplication
                    />
                    <EditableField
                      label="Life Circumstances"
                      field="life_circumstances"
                      value={application.life_circumstances}
                      type="textarea"
                      isApplication
                    />
                    <EditableField
                      label="Anything Else"
                      field="anything_else"
                      value={application.anything_else}
                      type="textarea"
                      isApplication
                    />
                  </div>
                </section>

                <section className="card">
                  <h3>Admin Notes</h3>
                  <EditableField
                    label="Notes about this application"
                    field="admin_notes"
                    value={application.admin_notes}
                    type="textarea"
                    isApplication
                  />
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <div className="tab-panel health">
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
              </div>
            </section>

            {application && (
              <>
                <section className="card">
                  <h3>Detailed Health Info (from Application)</h3>
                  <div className="fields-stack">
                    <div className="field readonly">
                      <label>Stress Level</label>
                      <span>{application.stress_level}/10</span>
                    </div>
                    <div className="field readonly">
                      <label>Suicide Consideration</label>
                      <span>{application.suicide_consideration}</span>
                    </div>
                    <div className="field readonly">
                      <label>Mental Health Professional</label>
                      <span>{application.mental_health_professional}</span>
                    </div>
                    <EditableField
                      label="Trauma Details"
                      field="trauma_details"
                      value={application.trauma_details}
                      type="textarea"
                      isApplication
                    />
                    <EditableField
                      label="Special Accommodations"
                      field="special_accommodations"
                      value={application.special_accommodations}
                      type="textarea"
                      isApplication
                    />
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="tab-panel pipeline">
            <section className="card">
              <h3>Pipeline Status</h3>
              <div className="pipeline-visual">
                {PIPELINE_STAGES.map((stage, index) => (
                  <div
                    key={stage}
                    className={`pipeline-step ${index <= currentStageIndex ? 'completed' : ''} ${stage === applicant.pipeline_stage ? 'current' : ''}`}
                  >
                    <div className="step-dot" style={{ background: index <= currentStageIndex ? STAGE_COLORS[stage] : '#ddd' }} />
                    <span className="step-label">{STAGE_LABELS[stage]}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h3>Chemistry Call</h3>
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
                <EditableField label="Notes" field="chemistry_call_notes" value={applicant.chemistry_call_notes} type="textarea" />
              </div>
            </section>

            <section className="card">
              <h3>Interview</h3>
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
