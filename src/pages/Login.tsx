import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Mail, Lock, Loader2, CheckCircle } from 'lucide-react'
import { AnimatedGridBackground } from '../components/AnimatedGridBackground'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [usePassword, setUsePassword] = useState(false)
  const { user, signInWithMagicLink, signInWithPassword } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/action-center', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (usePassword) {
      const { error } = await signInWithPassword(email, password)
      if (error) {
        setError(error.message)
      }
      setLoading(false)
    } else {
      const { error } = await signInWithMagicLink(email)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setSent(true)
        setLoading(false)
      }
    }
  }

  if (sent) {
    return (
      <div className="login-page">
        <AnimatedGridBackground />
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.svg" alt="StepWise" className="login-logo" />
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
      <AnimatedGridBackground />
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.svg" alt="StepWise" className="login-logo" />
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

          {usePassword && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                {usePassword ? 'Signing in...' : 'Sending...'}
              </>
            ) : (
              usePassword ? 'Sign In' : 'Send Magic Link'
            )}
          </button>
        </form>

        <button
          type="button"
          className="toggle-login-method"
          onClick={() => setUsePassword(!usePassword)}
        >
          {usePassword ? 'Use magic link instead' : 'Use password instead'}
        </button>

        <p className="login-note">
          Only authorized administrators can access this dashboard.
        </p>
      </div>
    </div>
  )
}
