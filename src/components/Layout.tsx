import { NavLink, Outlet } from 'react-router-dom'
import {
  Users,
  Kanban,
  Calendar,
  Settings,
  Bell
} from 'lucide-react'

const navItems = [
  { to: '/action-center', icon: Bell, label: 'Action Center' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/trainings', icon: Calendar, label: 'Trainings' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-dots">
              <span className="dot amber"></span>
              <span className="dot red"></span>
              <span className="dot purple"></span>
            </div>
            <span className="brand-name">StepWise</span>
          </div>
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
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
