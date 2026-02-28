import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Mail,
  GripVertical
} from 'lucide-react'
import { useApplicantsByStage, useMoveStage } from '../hooks/useApplicants'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage, type Applicant } from '../lib/supabase'

export function Pipeline() {
  const { data: applicantsByStage, isLoading } = useApplicantsByStage()
  const moveStage = useMoveStage()
  const [dragging, setDragging] = useState<string | null>(null)

  const handleMoveForward = (applicant: Applicant) => {
    const currentIndex = PIPELINE_STAGES.indexOf(applicant.pipeline_stage as PipelineStage)
    if (currentIndex < PIPELINE_STAGES.length - 1) {
      moveStage.mutate({ id: applicant.id, stage: PIPELINE_STAGES[currentIndex + 1] })
    }
  }

  const handleMoveBack = (applicant: Applicant) => {
    const currentIndex = PIPELINE_STAGES.indexOf(applicant.pipeline_stage as PipelineStage)
    if (currentIndex > 0) {
      moveStage.mutate({ id: applicant.id, stage: PIPELINE_STAGES[currentIndex - 1] })
    }
  }

  const handleDragStart = (e: React.DragEvent, applicantId: string) => {
    setDragging(applicantId)
    e.dataTransfer.setData('applicantId', applicantId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault()
    const applicantId = e.dataTransfer.getData('applicantId')
    if (applicantId) {
      moveStage.mutate({ id: applicantId, stage })
    }
    setDragging(null)
  }

  if (isLoading) {
    return <div className="page loading">Loading pipeline...</div>
  }

  return (
    <div className="page pipeline">
      <header className="page-header">
        <h1>Pipeline</h1>
        <p className="subtitle">Drag and drop to move applicants between stages</p>
      </header>

      <div className="pipeline-board">
        {PIPELINE_STAGES.map(stage => (
          <div
            key={stage}
            className={`pipeline-column ${dragging ? 'drop-target' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="column-header" style={{ borderColor: STAGE_COLORS[stage] }}>
              <h3>{STAGE_LABELS[stage]}</h3>
              <span className="count" style={{ background: STAGE_COLORS[stage] }}>
                {applicantsByStage?.[stage]?.length || 0}
              </span>
            </div>

            <div className="column-cards">
              {applicantsByStage?.[stage]?.map(applicant => (
                <div
                  key={applicant.id}
                  className={`pipeline-card ${dragging === applicant.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, applicant.id)}
                >
                  <div className="card-drag-handle">
                    <GripVertical size={14} />
                  </div>

                  <Link to={`/people/${applicant.id}`} className="card-content">
                    <h4>{applicant.name}</h4>
                    {applicant.trainings?.name && (
                      <span className="training-badge">{applicant.trainings.name}</span>
                    )}
                    {applicant.email && (
                      <span className="email"><Mail size={12} /> {applicant.email}</span>
                    )}
                  </Link>

                  <div className="card-actions">
                    {PIPELINE_STAGES.indexOf(stage) > 0 && (
                      <button
                        onClick={() => handleMoveBack(applicant)}
                        className="btn-move"
                        title="Move back"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    )}
                    {PIPELINE_STAGES.indexOf(stage) < PIPELINE_STAGES.length - 1 && (
                      <button
                        onClick={() => handleMoveForward(applicant)}
                        className="btn-move"
                        title="Move forward"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {(!applicantsByStage?.[stage] || applicantsByStage[stage].length === 0) && (
                <div className="empty-column">
                  No applicants
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
