import { useState } from 'react'
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
    settings:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  }
  return icons[path] || null
}

export default function Sidebar() {
  const { user, data } = useApp()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const initials = user?.user_metadata?.initials
    || (user?.email ? user.email.slice(0, 2).toUpperCase() : 'AK')
  const displayName = user?.user_metadata?.name || user?.email || 'User'
  const role = 'Owner'

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
    { path: '/settings',  label: 'Settings',  section: 'SYSTEM' },
  ]

  return (
    <div className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="sidebar-logo" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="18" height="18"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </div>
        {!collapsed && <span className="logo-text">Worky</span>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => (
          <div key={item.path}>
            {!collapsed && item.section && <div className="nav-section">{item.section}</div>}
            <NavLink
              to={item.path}
              title={collapsed ? item.label : ''}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}${collapsed ? ' nav-item-collapsed' : ''}`}
            >
              <NavIcon path={item.path.slice(1)} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
              {collapsed && item.badge > 0 && <span className="nav-badge-dot"></span>}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: '#3b82f6', color: '#fff', flexShrink: 0 }}>
            {initials}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="btn-icon-sm" onClick={handleSignOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}
