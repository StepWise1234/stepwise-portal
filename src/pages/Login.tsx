import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Mail, Loader2, CheckCircle } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { signInWithMagicLink } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signInWithMagicLink(email)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="brand">
              <div className="brand-dots">
                <span className="dot amber"></span>
                <span className="dot red"></span>
                <span className="dot purple"></span>
              </div>
              <span className="brand-name">StepWise</span>
            </div>
          </div>

          <div className="success-message">
            <CheckCircle size={48} className="success-icon" />
            <h2>Check your email</h2>
            <p>We sent a login link to <strong>{email}</strong></p>
            <p className="hint">Click the link in the email to sign in.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="brand">
            <div className="brand-dots">
              <span className="dot amber"></span>
              <span className="dot red"></span>
              <span className="dot purple"></span>
            </div>
            <span className="brand-name">StepWise</span>
          </div>
          <h1>Admin Dashboard</h1>
          <p>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                Sending...
              </>
            ) : (
              'Send Magic Link'
            )}
          </button>
        </form>

        <p className="login-note">
          Only authorized administrators can access this dashboard.
        </p>
      </div>
    </div>
  )
}
