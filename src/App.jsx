import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/AppContext'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Assignees from './pages/Assignees'
import AssigneeDetail from './pages/AssigneeDetail'
import Settings from './pages/Settings'
import Files from './pages/Files'
import Reminders from './pages/Reminders'
import ReminderNotifier from './components/ReminderNotifier'

function AppShell() {
  const { user, loading, toast } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--slate-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 36, height: 36, border: '3px solid var(--slate-200)', borderTopColor: 'var(--blue-500)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, color: 'var(--slate-400)' }}>Loading Worky…</div>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div className="app-shell">
      {/* Mobile top bar — visible only on small screens via CSS */}
      <div className="mobile-topbar">
        <button className="mobile-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="mobile-topbar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="16" height="16"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </div>
        <span className="mobile-topbar-title">Worky</span>
      </div>

      {/* Overlay behind sidebar on mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/assignees" element={<Assignees />} />
          <Route path="/assignees/:id" element={<AssigneeDetail />} />
          <Route path="/files" element={<Files />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <ReminderNotifier />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  )
}
