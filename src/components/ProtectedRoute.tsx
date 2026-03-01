import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 size={32} className="spin" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <h1>Access Denied</h1>
        <p>Your email ({user.email}) is not authorized to access this dashboard.</p>
        <button onClick={() => window.location.href = '/login'}>
          Sign in with a different account
        </button>
      </div>
    )
  }

  return <>{children}</>
}
