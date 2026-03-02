import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Mail, Check, Clock, User, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

interface ParticipantQuestion {
  id: string
  application_id: string
  user_id: string
  question: string
  status: 'pending' | 'responded' | 'closed'
  created_at: string
  updated_at: string
  application?: {
    id: string
    first_name: string
    last_name: string
    email: string
    preferred_name: string | null
  }
}

export function Questions() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded'>('pending')
  const queryClient = useQueryClient()

  const { data: questions, isLoading } = useQuery({
    queryKey: ['participant_questions', filter],
    queryFn: async () => {
      let query = supabase
        .from('participant_questions')
        .select(`
          *,
          application:applications(id, first_name, last_name, email, preferred_name)
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ParticipantQuestion[]
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('participant_questions')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participant_questions'] })
    },
  })

  const pendingCount = questions?.filter(q => q.status === 'pending').length || 0

  return (
    <div className="questions-page">
      <div className="page-header">
        <div>
          <h1>
            <MessageCircle size={28} />
            Participant Questions
          </h1>
          <p className="subtitle">
            Questions from portal users awaiting your response
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <Clock size={16} />
          Pending
          {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
        </button>
        <button
          className={`filter-tab ${filter === 'responded' ? 'active' : ''}`}
          onClick={() => setFilter('responded')}
        >
          <Check size={16} />
          Responded
        </button>
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
      </div>

      {/* Questions list */}
      <div className="questions-list">
        {isLoading ? (
          <div className="loading-state">Loading questions...</div>
        ) : questions?.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={48} />
            <h3>No questions yet</h3>
            <p>When participants submit questions from the portal, they'll appear here.</p>
          </div>
        ) : (
          questions?.map((q) => (
            <div key={q.id} className={`question-card ${q.status}`}>
              <div className="question-header">
                <div className="user-info">
                  <div className="avatar">
                    <User size={20} />
                  </div>
                  <div>
                    <Link to={`/people/${q.application_id}`} className="user-name">
                      {q.application?.preferred_name || q.application?.first_name || 'Unknown'} {q.application?.last_name || ''}
                      <ChevronRight size={14} />
                    </Link>
                    <span className="user-email">{q.application?.email}</span>
                  </div>
                </div>
                <div className="question-meta">
                  <span className={`status-badge ${q.status}`}>
                    {q.status === 'pending' ? 'Awaiting Response' : q.status === 'responded' ? 'Responded' : 'Closed'}
                  </span>
                  <span className="timestamp">
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="question-body">
                <p>{q.question}</p>
              </div>

              <div className="question-actions">
                <a
                  href={`mailto:${q.application?.email}?subject=Re: Your StepWise Question&body=Hi ${q.application?.preferred_name || q.application?.first_name},\n\nThank you for your question:\n\n"${q.question}"\n\n`}
                  className="btn btn-primary"
                  onClick={() => {
                    // Mark as responded when email is opened
                    if (q.status === 'pending') {
                      updateStatus.mutate({ id: q.id, status: 'responded' })
                    }
                  }}
                >
                  <Mail size={16} />
                  Reply via Email
                </a>
                {q.status === 'pending' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => updateStatus.mutate({ id: q.id, status: 'responded' })}
                  >
                    <Check size={16} />
                    Mark as Responded
                  </button>
                )}
                {q.status === 'responded' && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => updateStatus.mutate({ id: q.id, status: 'closed' })}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .questions-page {
          padding: 2rem;
          max-width: 900px;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.75rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #666;
          font-size: 0.95rem;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 1rem;
        }

        .filter-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: #666;
          font-size: 0.9rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: #f5f5f5;
        }

        .filter-tab.active {
          background: #1a1a1a;
          color: white;
        }

        .filter-tab .badge {
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          padding: 0.1rem 0.5rem;
          border-radius: 10px;
          font-weight: 600;
        }

        .questions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .question-card {
          background: white;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .question-card:hover {
          border-color: #ddd;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .question-card.pending {
          border-left: 3px solid #f59e0b;
        }

        .question-card.responded {
          border-left: 3px solid #10b981;
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .avatar {
          width: 40px;
          height: 40px;
          background: #f5f5f5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
        }

        .user-name {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
          color: #1a1a1a;
          text-decoration: none;
        }

        .user-name:hover {
          color: #7c3aed;
        }

        .user-email {
          font-size: 0.85rem;
          color: #888;
        }

        .question-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-weight: 500;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.responded {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.closed {
          background: #f3f4f6;
          color: #6b7280;
        }

        .timestamp {
          font-size: 0.8rem;
          color: #999;
        }

        .question-body {
          padding: 1rem;
          background: #fafafa;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .question-body p {
          color: #333;
          line-height: 1.6;
          white-space: pre-wrap;
          margin: 0;
        }

        .question-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          border: none;
        }

        .btn-primary {
          background: #7c3aed;
          color: white;
        }

        .btn-primary:hover {
          background: #6d28d9;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-ghost {
          background: transparent;
          color: #666;
        }

        .btn-ghost:hover {
          background: #f5f5f5;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #666;
        }

        .empty-state svg {
          color: #ccc;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .loading-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }
      `}</style>
    </div>
  )
}
