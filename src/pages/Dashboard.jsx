import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import EditTaskModal from '../components/EditTaskModal'
import QuickTaskModal from '../components/QuickTaskModal'

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
      <td onClick={e => e.stopPropagation()}>
        {firstAssignee
          ? <div
              style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
              onClick={() => navigate(`/assignees/${firstAssignee.id}`)}
            >
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
          ><svg viewBox="0 0 16 4" fill="currentColor" width="16" height="4"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/></svg></button>
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
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const [editTask, setEditTask]   = useState(null)
  const [showQuick, setShowQuick] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const splitRef = useRef(null)

  useEffect(() => {
    const handler = e => { if (splitRef.current && !splitRef.current.contains(e.target)) setSplitOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const tasks = data.tasks
  const owner = data.assignees.find(a => a.isOwner)
  const ownerName = owner?.name || 'Owner'

  // Stat counts
  const inboxCount      = tasks.filter(t => t.status === 'todo' && t.active !== false).length
  const todoCount       = tasks.filter(t => t.status === 'inprogress' && !t.roadmap && !!owner && (t.assigneeIds||[]).includes(owner.id) && t.active !== false).length
  const waitingCount    = tasks.filter(t => t.status === 'inprogress' && !t.roadmap && (!owner || !(t.assigneeIds||[]).includes(owner.id)) && (t.assigneeIds||[]).length > 0 && t.active !== false).length
  const roadmapCount    = tasks.filter(t => t.status === 'inprogress' && t.roadmap && t.active !== false).length
  const unassignedCount = tasks.filter(t => t.status === 'inprogress' && !t.roadmap && (t.assigneeIds||[]).length === 0 && t.active !== false).length
  const completedCount  = tasks.filter(t => t.status === 'done' && t.createdAt && new Date(t.createdAt) >= sevenDaysAgo).length

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
        <div className="split-btn" ref={splitRef}>
          <button className="split-btn-main" onClick={() => setShowQuick(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Quick Task
          </button>
          <button className="split-btn-arrow" onClick={() => setSplitOpen(o => !o)} title="More options">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {splitOpen && (
            <div className="split-btn-dropdown">
              <div className="dropdown-item" onClick={() => { navigate('/tasks?new=1'); setSplitOpen(false) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: 7 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Task (full form)
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="page-content">
        <div className="stats-grid">

          {/* 1 — Inbox */}
          <div className="stat-card stat-card-clickable" onClick={() => navigate('/tasks?tab=inbox')} style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="stat-label">INBOX</div>
            <div className="stat-value" style={{ color: '#6366f1' }}>{inboxCount}</div>
            <div className="stat-sub">New tasks to process</div>
          </div>

          {/* 2 — To Dos for Owner */}
          <div className="stat-card stat-card-clickable" onClick={() => navigate('/tasks?tab=todo')} style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="stat-label">TO DOs FOR {ownerName.toUpperCase()}</div>
            <div className="stat-value" style={{ color: '#3b82f6' }}>{todoCount}</div>
            <div className="stat-sub">Assigned to you</div>
          </div>

          {/* 3 — Waiting for Someone */}
          <div className="stat-card stat-card-clickable" onClick={() => navigate('/tasks?tab=waiting')} style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="stat-label">WAITING FOR SOMEONE</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{waitingCount}</div>
            <div className="stat-sub">Delegated to others</div>
          </div>

          {/* 4 — Roadmap */}
          <div className="stat-card stat-card-clickable" onClick={() => navigate('/tasks?tab=roadmap')} style={{ borderLeft: '4px solid #10b981' }}>
            <div className="stat-label">ROADMAP</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{roadmapCount}</div>
            <div className="stat-sub">Planned ahead</div>
          </div>

          {/* 5 — Unassigned */}
          <div className="stat-card" style={{ borderLeft: '4px solid #94a3b8' }}>
            <div className="stat-label">UNASSIGNED</div>
            <div className="stat-value" style={{ color: '#64748b' }}>{unassignedCount}</div>
            <div className="stat-sub">Need an owner</div>
          </div>

          {/* 6 — Completed last 7 days */}
          <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="stat-label">COMPLETED</div>
            <div className="stat-value" style={{ color: '#10b981' }}>{completedCount}</div>
            <div className="stat-sub">Last 7 days</div>
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
            <div className="table-scroll"><table className="task-table">
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
            </table></div>
          )}
        </div>
      </div>

      <QuickTaskModal open={showQuick} onClose={() => setShowQuick(false)} />
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
