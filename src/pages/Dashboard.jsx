import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import EditTaskModal from '../components/EditTaskModal'

const fmt = d => { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => d && new Date(d) < new Date()

function DashboardTaskRow({ task, onEdit, onMenuAction }) {
  const { data } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const projs = (task.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)
  const projLabel = projs.length === 0 ? '—'
    : projs.length === 1 ? `${projs[0].emoji} ${projs[0].name}`
    : `${projs[0].emoji} ${projs[0].name} +${projs.length - 1}`

  const firstAssignee = data.assignees.find(a => a.id === (task.assigneeIds || [])[0])
  const moreAssignees = (task.assigneeIds || []).length - 1

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <tr>
      <td style={{ fontWeight: 600, color: 'var(--slate-800)', cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task.id}`)}>{task.name}</td>
      <td><span style={{ fontSize: 12 }}>{projLabel}</span></td>
      <td>
        {firstAssignee
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Avatar assigneeId={firstAssignee.id} size={24} />
              <span>{firstAssignee.name}{moreAssignees > 0 ? ` +${moreAssignees}` : ''}</span>
            </div>
          : '—'
        }
      </td>
      <td><StatusBadge status={task.status} /></td>
      <td style={{ fontSize: 12, color: isOverdue(task.due) && task.status !== 'done' ? '#ef4444' : 'var(--slate-500)' }}>{fmt(task.due)}</td>
      <td onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            style={{ padding: '2px 6px', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', borderRadius: 4 }}
            onClick={() => setMenuOpen(o => !o)}
          >⋿</button>
          {menuOpen && (
            <div className="dropdown-menu open" style={{ right: 0, left: 'auto', minWidth: 170 }}>
              <div className="dropdown-item" onClick={() => { onMenuAction(task.id, 'inprogress'); setMenuOpen(false) }}>
                <span className="dot-status dot-inprogress"></span> Mark In Progress
              </div>
              <div className="dropdown-item" onClick={() => { onMenuAction(task.id, 'done'); setMenuOpen(false) }}>
                <span className="dot-status dot-done"></span> Mark Done
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={() => { onMenuAction(task.id, 'roadmap'); setMenuOpen(false) }}>
                🗺 {task.roadmap ? 'Remove from Roadmap' : 'Add to Roadmap'}
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={() => { onEdit(task); setMenuOpen(false) }}>✏️ Edit Task</div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const { data, updateTask, showToast } = useApp()
  const navigate = useNavigate()
  const today = new Date(); today.setHours(0,0,0,0)
  const [editTask, setEditTask] = useState(null)

  const tasks      = data.tasks
  const inProgress = tasks.filter(t => t.status === 'inprogress').length
  const done       = tasks.filter(t => t.status === 'done').length
  const overdue    = tasks.filter(t => t.due && new Date(t.due) < today && t.status !== 'done').length

  // Newest first, show top 8
  const recent = [...tasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)

  const handleMenuAction = async (taskId, action) => {
    const t = data.tasks.find(t => t.id === taskId)
    if (!t) return
    if (action === 'roadmap') {
      await updateTask(taskId, { roadmap: !t.roadmap })
      showToast(`Roadmap ${!t.roadmap ? 'enabled' : 'disabled'}`, 'success')
    } else {
      await updateTask(taskId, { status: action, ...(action === 'done' ? { active: false } : {}) })
      showToast('Status updated', 'success')
    }
  }

  return (
    <div className="page active" id="page-dashboard">
      <div className="page-header">
        <span className="page-title">Dashboard</span>
        <button className="btn btn-primary" onClick={() => navigate('/tasks?new=1')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>
      <div className="page-content">
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 22 }}>
          <div className="stat-card stat-card-blue">
            <div className="stat-label">TOTAL TASKS</div>
            <div className="stat-value">{tasks.length}</div>
            <div className="stat-sub">Across {data.projects.length} projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">IN PROGRESS</div>
            <div className="stat-value" style={{ color: '#3b82f6' }}>{inProgress}</div>
            <div className="stat-sub">Active tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">COMPLETED</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{done}</div>
            <div className="stat-sub">Done tasks</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">OVERDUE</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{overdue}</div>
            <div className="stat-sub">Need attention</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ASSIGNEES</div>
            <div className="stat-value">{data.assignees.length}</div>
            <div className="stat-sub">Team members</div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>⚡ Recent Tasks</div>
            <span className="link" style={{ fontSize: 13, color: 'var(--blue-600)', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>View All →</span>
          </div>
          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--slate-400)', fontSize: 13 }}>No tasks yet. Create your first task!</div>
          ) : (
            <table className="task-table">
              <thead>
                <tr><th>TASK</th><th>PROJECT</th><th>ASSIGNEE</th><th>STATUS</th><th>DUE</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <DashboardTaskRow
                    key={t.id}
                    task={t}
                    onEdit={setEditTask}
                    onMenuAction={handleMenuAction}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editTask && (
        <EditTaskModal
          key={editTask.id}
          task={editTask}
          open={true}
          onClose={() => setEditTask(null)}
          onSave={async (updates, msg) => {
            const ok = await updateTask(editTask.id, updates)
            if (ok && msg) showToast(msg, 'success')
            return ok
          }}
        />
      )}
    </div>
  )
}
