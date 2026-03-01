import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Users,
  Kanban,
  Calendar,
  Settings,
  Bell,
  GraduationCap,
  LogOut
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { AnimatedGridBackground } from './AnimatedGridBackground'

const navItems = [
  { to: '/action-center', icon: Bell, label: 'Action Center' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/trainings', icon: Calendar, label: 'Trainings' },
  { to: '/courses', icon: GraduationCap, label: 'Courses' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.svg" alt="StepWise" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
          </div>
          <button onClick={handleSignOut} className="sign-out-btn">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <AnimatedGridBackground />
        <div className="main-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
