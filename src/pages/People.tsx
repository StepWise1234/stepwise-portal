import { useState, useMemo, useCallback } from 'react' // Updated
import { Link, useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Search,
  Mail,
  Phone,
  User,
  X,
  Calendar,
  CreditCard,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronDown,
  CheckCircle,
  Clock,
  Trash2,
  AlertTriangle,
  MessageCircle
} from 'lucide-react'
import { useApplicants, useDeleteApplicant } from '../hooks/useApplicants'
import { useTrainings } from '../hooks/useTrainings'
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '../lib/supabase'

type ViewMode = 'table' | 'cards'
type SortField = 'name' | 'application_date' | 'pipeline_stage' | 'training'
type SortDirection = 'asc' | 'desc'

export function People() {
  const [search, setSearch] = useState('')
  const [stageFilters, setStageFilters] = useState<string[]>([])
  const [trainingFilters, setTrainingFilters] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortField, setSortField] = useState<SortField>('application_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showTrainingDropdown, setShowTrainingDropdown] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const navigate = useNavigate()

  const { data: allApplicants, isLoading } = useApplicants()
  const deleteApplicant = useDeleteApplicant()
  const { data: trainings } = useTrainings()

  // Filter and sort applicants
  const filteredApplicants = useMemo(() => {
    if (!allApplicants) return []

    let result = [...allApplicants]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(a =>
        a.name?.toLowerCase().includes(searchLower) ||
        a.email?.toLowerCase().includes(searchLower) ||
        a.phone?.includes(search)
      )
    }

    // Stage filter
    if (stageFilters.length > 0) {
      result = result.filter(a => stageFilters.includes(a.pipeline_stage || ''))
    }

    // Training filter
    if (trainingFilters.length > 0) {
      result = result.filter(a => {
        if (trainingFilters.includes('__unassigned__')) {
          return !a.training_id || trainingFilters.includes(a.training_id)
        }
        return trainingFilters.includes(a.training_id || '')
      })
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'application_date':
          comparison = new Date(a.application_date || 0).getTime() - new Date(b.application_date || 0).getTime()
          break
        case 'pipeline_stage':
          const stageOrder = PIPELINE_STAGES.indexOf(a.pipeline_stage as PipelineStage) -
                            PIPELINE_STAGES.indexOf(b.pipeline_stage as PipelineStage)
          comparison = stageOrder
          break
        case 'training':
          comparison = (a.trainings?.name || 'zzz').localeCompare(b.trainings?.name || 'zzz')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [allApplicants, search, stageFilters, trainingFilters, sortField, sortDirection])

  // Stats
  const stats = useMemo(() => {
    if (!allApplicants) return { total: 0, byStage: {} as Record<string, number>, byTraining: {} as Record<string, number> }

    const byStage: Record<string, number> = {}
    const byTraining: Record<string, number> = {}

    allApplicants.forEach(a => {
      const stage = a.pipeline_stage || 'unknown'
      byStage[stage] = (byStage[stage] || 0) + 1

      const training = a.training_id || '__unassigned__'
      byTraining[training] = (byTraining[training] || 0) + 1
    })

    return { total: allApplicants.length, byStage, byTraining }
  }, [allApplicants])

  const toggleStageFilter = (stage: string) => {
    setStageFilters(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    )
  }

  const toggleTrainingFilter = (trainingId: string) => {
    setTrainingFilters(prev =>
      prev.includes(trainingId) ? prev.filter(t => t !== trainingId) : [...prev, trainingId]
    )
  }

  const clearFilters = () => {
    setSearch('')
    setStageFilters([])
    setTrainingFilters([])
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const hasFilters = search || stageFilters.length > 0 || trainingFilters.length > 0

  const handleDelete = useCallback((id: string, name: string) => {
    setDeleteConfirm({ id, name })
  }, [])

  const confirmDelete = useCallback(() => {
    if (deleteConfirm) {
      deleteApplicant.mutate(deleteConfirm.id, {
        onSuccess: () => setDeleteConfirm(null)
      })
    }
  }, [deleteConfirm, deleteApplicant])

  const getPaymentIcon = (status: string | null) => {
    switch (status) {
      case 'Paid in Full': return <CheckCircle size={14} className="icon-green" />
      case 'Deposit Paid':
      case 'Payment Plan': return <Clock size={14} className="icon-amber" />
      default: return <CreditCard size={14} className="icon-gray" />
    }
  }


  return (
    <div className="page people-page">
      {/* Header with Stats */}
      <header className="page-header people-header">
        <div className="header-top">
          <div>
            <h1>People</h1>
            <p className="subtitle">
              {filteredApplicants.length} of {stats.total} applicants
              {hasFilters && ' (filtered)'}
            </p>
          </div>
          <div className="view-toggle">
            <button
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <List size={18} />
            </button>
            <button
              className={viewMode === 'cards' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
              title="Card view"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        {/* Pipeline Stage Pills */}
        <div className="stage-pills">
          {PIPELINE_STAGES.map(stage => {
            const count = stats.byStage[stage] || 0
            const isActive = stageFilters.includes(stage)
            return (
              <button
                key={stage}
                className={`stage-pill ${isActive ? 'active' : ''}`}
                onClick={() => toggleStageFilter(stage)}
                style={{
                  '--stage-color': STAGE_COLORS[stage],
                  borderColor: isActive ? STAGE_COLORS[stage] : 'transparent',
                  background: isActive ? `${STAGE_COLORS[stage]}15` : undefined
                } as React.CSSProperties}
              >
                <span className="stage-dot" style={{ background: STAGE_COLORS[stage] }} />
                <span className="stage-name">{STAGE_LABELS[stage]}</span>
                <span className="stage-count">{count}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="clear-btn">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Training Filter Dropdown */}
        <div className="filter-dropdown">
          <button
            className={`dropdown-trigger ${trainingFilters.length > 0 ? 'active' : ''}`}
            onClick={() => setShowTrainingDropdown(!showTrainingDropdown)}
          >
            <Calendar size={16} />
            Training
            {trainingFilters.length > 0 && <span className="filter-badge">{trainingFilters.length}</span>}
            <ChevronDown size={14} />
          </button>
          {showTrainingDropdown && (
            <>
              <div className="dropdown-backdrop" onClick={() => setShowTrainingDropdown(false)} />
              <div className="dropdown-menu">
                {trainings?.map(t => (
                  <label key={t.id} className="dropdown-item">
                    <input
                      type="checkbox"
                      checked={trainingFilters.includes(t.id)}
                      onChange={() => toggleTrainingFilter(t.id)}
                    />
                    <span>{t.name}</span>
                    <span className="count">{stats.byTraining[t.id] || 0}</span>
                  </label>
                ))}
                <label className="dropdown-item">
                  <input
                    type="checkbox"
                    checked={trainingFilters.includes('__unassigned__')}
                    onChange={() => toggleTrainingFilter('__unassigned__')}
                  />
                  <span>Unassigned</span>
                  <span className="count">{stats.byTraining['__unassigned__'] || 0}</span>
                </label>
              </div>
            </>
          )}
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="btn-clear-all">
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      {/* Table View */}
      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : viewMode === 'table' ? (
        <div className="people-table-wrapper">
          <table className="people-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('name')}>
                  Name
                  {sortField === 'name' && <ArrowUpDown size={14} className={sortDirection} />}
                </th>
                <th>Contact</th>
                <th className="sortable" onClick={() => toggleSort('training')}>
                  Training
                  {sortField === 'training' && <ArrowUpDown size={14} className={sortDirection} />}
                </th>
                <th className="sortable" onClick={() => toggleSort('pipeline_stage')}>
                  Stage
                  {sortField === 'pipeline_stage' && <ArrowUpDown size={14} className={sortDirection} />}
                </th>
                <th>Payment</th>
                <th className="sortable" onClick={() => toggleSort('application_date')}>
                  Applied
                  {sortField === 'application_date' && <ArrowUpDown size={14} className={sortDirection} />}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.map(applicant => (
                <tr
                  key={applicant.id}
                  className="clickable-row"
                  onClick={() => navigate(`/people/${applicant.id}`)}
                >
                  <td className="name-cell">
                    <div className="avatar">
                      <User size={16} />
                    </div>
                    <span className="name">{applicant.name}</span>
                  </td>
                  <td className="contact-cell">
                    {applicant.email && (
                      <a href={`mailto:${applicant.email}`} className="contact-link" title={applicant.email} onClick={e => e.stopPropagation()}>
                        <Mail size={14} />
                      </a>
                    )}
                    {applicant.phone && (
                      <a href={`tel:${applicant.phone}`} className="contact-link" title={applicant.phone} onClick={e => e.stopPropagation()}>
                        <Phone size={14} />
                      </a>
                    )}
                    {applicant.signal_handle && (
                      <span className="contact-link signal" title={`Signal: ${applicant.signal_handle}`}>
                        <MessageCircle size={14} />
                      </span>
                    )}
                  </td>
                  <td className="training-cell">
                    {applicant.trainings?.name ? (
                      <span className="training-tag">{applicant.trainings.name}</span>
                    ) : (
                      <span className="unassigned">Unassigned</span>
                    )}
                  </td>
                  <td className="stage-cell">
                    <span
                      className="stage-badge"
                      style={{ background: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] }}
                    >
                      {STAGE_LABELS[applicant.pipeline_stage as PipelineStage] || applicant.pipeline_stage}
                    </span>
                  </td>
                  <td className="payment-cell">
                    <span className="payment-status" title={applicant.payment_status || 'Unpaid'}>
                      {getPaymentIcon(applicant.payment_status)}
                      <span className="payment-label">{applicant.payment_status || 'Unpaid'}</span>
                    </span>
                  </td>
                  <td className="date-cell">
                    {applicant.application_date ? (
                      <span title={format(new Date(applicant.application_date), 'PPP')}>
                        {formatDistanceToNow(new Date(applicant.application_date), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="no-date">-</span>
                    )}
                  </td>
                  <td className="action-cell">
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(applicant.id, applicant.name || 'this applicant')
                      }}
                      title="Delete applicant"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApplicants.length === 0 && (
            <div className="empty-state">
              <User size={48} />
              <h3>No applicants found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      ) : (
        /* Card View */
        <div className="people-cards">
          {filteredApplicants.map(applicant => (
            <Link
              key={applicant.id}
              to={`/people/${applicant.id}`}
              className="person-card"
              style={{ borderLeftColor: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] }}
            >
              <div className="card-header">
                <div className="avatar">
                  <User size={20} />
                </div>
                <div className="card-title">
                  <h3>{applicant.name}</h3>
                  <span className="training-tag">{applicant.trainings?.name || 'Unassigned'}</span>
                </div>
                <span
                  className="stage-badge"
                  style={{ background: STAGE_COLORS[applicant.pipeline_stage as PipelineStage] }}
                >
                  {STAGE_LABELS[applicant.pipeline_stage as PipelineStage]}
                </span>
              </div>

              <div className="card-body">
                <div className="card-row">
                  <Mail size={14} />
                  <span>{applicant.email || 'No email'}</span>
                </div>
                {applicant.phone && (
                  <div className="card-row">
                    <Phone size={14} />
                    <span>{applicant.phone}</span>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <div className="card-stat">
                  {getPaymentIcon(applicant.payment_status)}
                  <span>{applicant.payment_status || 'Unpaid'}</span>
                </div>
                {applicant.application_date && (
                  <div className="card-stat date">
                    <Calendar size={14} />
                    <span>{format(new Date(applicant.application_date), 'MMM d')}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
          {filteredApplicants.length === 0 && (
            <div className="empty-state">
              <User size={48} />
              <h3>No applicants found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Delete Applicant</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <p className="warning-text">This will also delete their application, room reservations, meal selections, and course access. This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-delete"
                onClick={confirmDelete}
                disabled={deleteApplicant.isPending}
              >
                {deleteApplicant.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
