import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { sb } from '../lib/supabase'

const NavIcon = ({ path }) => {
  const icons = {
    dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    tasks:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    projects:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    assignees: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    owners:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  }
  return icons[path] || null
}

export default function Sidebar() {
  const { user, data } = useApp()
  const navigate = useNavigate()

  const initials = user?.user_metadata?.initials
    || (user?.email ? user.email.slice(0, 2).toUpperCase() : 'AK')
  const displayName = user?.user_metadata?.name || user?.email || 'User'
  const role = data.owners[0]?.role || 'Owner'

  const activeTasks   = data.tasks.filter(t => t.active && t.status !== 'done').length
  const activeProjects = data.projects.filter(p => p.status === 'active').length

  const handleSignOut = async () => {
    await sb.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', section: 'OVERVIEW' },
    { path: '/tasks',     label: 'Tasks',     badge: activeTasks,   section: 'WORKSPACE' },
    { path: '/projects',  label: 'Projects',  badge: activeProjects },
    { path: '/assignees', label: 'Assignees', section: 'PEOPLE' },
    { path: '/owners',    label: 'Owners' },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="18" height="18"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </div>
        <span className="logo-text">Worky</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => (
          <div key={item.path}>
            {item.section && <div className="nav-section">{item.section}</div>}
            <NavLink
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <NavIcon path={item.path.slice(1)} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: '#3b82f6', color: '#fff' }}>
            {initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{role}</div>
          </div>
        </div>
        <button className="btn-icon-sm" onClick={handleSignOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </div>
  )
}
