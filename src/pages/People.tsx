import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Filter,
  ChevronRight,
  Mail,
  Phone,
  User,
  X
} from 'lucide-react'
import { useApplicants } from '../hooks/useApplicants'
import { useTrainings } from '../hooks/useTrainings'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '../lib/supabase'

export function People() {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [trainingFilter, setTrainingFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: applicants, isLoading } = useApplicants({
    search: search || undefined,
    pipeline_stage: stageFilter || undefined,
    training_id: trainingFilter || undefined,
  })

  const { data: trainings } = useTrainings()

  const clearFilters = () => {
    setSearch('')
    setStageFilter('')
    setTrainingFilter('')
  }

  const hasFilters = search || stageFilter || trainingFilter

  return (
    <div className="page people">
      <header className="page-header">
        <h1>People</h1>
        <p className="subtitle">{applicants?.length || 0} applicants</p>
      </header>

      {/* Search and Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="clear-btn">
              <X size={16} />
            </button>
          )}
        </div>

        <button
          className={`btn-filter ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filters
          {hasFilters && <span className="filter-count">!</span>}
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="btn-clear-all">
            Clear all
          </button>
        )}
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Pipeline Stage</label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All stages</option>
              {PIPELINE_STAGES.map(stage => (
                <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Training</label>
            <select
              value={trainingFilter}
              onChange={(e) => setTrainingFilter(e.target.value)}
            >
              <option value="">All trainings</option>
              {trainings?.map(training => (
                <option key={training.id} value={training.id}>{training.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* People List */}
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="people-list">
          {applicants?.map(applicant => (
            <Link
              key={applicant.id}
              to={`/people/${applicant.id}`}
              className="person-row"
            >
              <div className="person-avatar">
                <User size={24} />
              </div>

              <div className="person-info">
                <h3>{applicant.name}</h3>
                <div className="contact-row">
                  {applicant.email && (
                    <span><Mail size={14} /> {applicant.email}</span>
                  )}
                  {applicant.phone && (
                    <span><Phone size={14} /> {applicant.phone}</span>
                  )}
                </div>
              </div>

              <div className="person-meta">
                {applicant.trainings?.name && (
                  <span className="training-badge">{applicant.trainings.name}</span>
                )}
                <span
                  className="stage-badge"
                  style={{
                    background: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] || '#94a3b8'
                  }}
                >
                  {STAGE_LABELS[applicant.pipeline_stage as PipelineStage] || applicant.pipeline_stage}
                </span>
              </div>

              <ChevronRight size={20} className="chevron" />
            </Link>
          ))}

          {applicants?.length === 0 && (
            <div className="empty-state">
              <User size={48} />
              <h3>No applicants found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
