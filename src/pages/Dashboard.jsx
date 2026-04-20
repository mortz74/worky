import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import EditTaskModal from '../components/EditTaskModal'
import QuickTaskModal from '../components/QuickTaskModal'
import AddAssigneeModal from '../components/AddAssigneeModal'
import AddDueDateModal from '../components/AddDueDateModal'
import AddReminderModal from '../components/AddReminderModal'
import Modal from '../components/Modal'

const fmt = d => { if (!d) return '—'; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => { if (!d) return false; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day) < new Date() }

function DashboardTaskRow({ task, onEdit, onMenuAction, onAddAssignee, onAddDueDate, onAddReminder, onDelete }) {
  const { data, updateTask, showToast, currentAssigneeId } = useApp()
  const owner = data.assignees.find(a => a.id === currentAssigneeId)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const projs = (task.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)

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
      <td onClick={e => e.stopPropagation()}>
        {projs.length === 0
          ? <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>—</span>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {projs.map(p => (
                <span
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{ fontSize: 11, background: 'var(--blue-50)', color: 'var(--blue-700)', padding: '2px 8px', borderRadius: 20, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {p.emoji} {p.name}
                </span>
              ))}
            </div>
        }
      </td>
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
              {owner && (
                <div className="dropdown-item" onClick={async () => {
                  setMenuOpen(false)
                  const existing = task.assigneeIds || []
                  const ids = existing.includes(owner.id) ? existing : [...existing, owner.id]
                  await updateTask(task.id, { assignee_ids: ids, status: 'inprogress' })
                  showToast(`Assigned to ${owner.name} & moved to To Do`, 'success')
                }}>
                  🏅 Assign to {owner.name}
                </div>
              )}
              <div className="dropdown-item" onClick={() => { onAddAssignee(task); setMenuOpen(false) }}>
                👤 Add / Change Assignee
              </div>
              <div className="dropdown-item" onClick={() => { onAddDueDate(task); setMenuOpen(false) }}>
                📅 Add Due Date
              </div>
              <div className="dropdown-item" onClick={() => { onAddReminder(task); setMenuOpen(false) }}>
                🔔 Add Reminder
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={() => { onMenuAction(task.id, 'roadmap'); setMenuOpen(false) }}>
                🗺 {task.roadmap ? 'Remove from Roadmap' : 'Add to Roadmap'}
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={() => { onEdit(task); setMenuOpen(false) }}>✏️ Edit Task</div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={() => { onDelete(task); setMenuOpen(false) }} style={{ color: '#ef4444' }}>🗑️ Delete Task</div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const { data, updateTask, deleteTask, createReminder, showToast, currentAssigneeId } = useApp()
  const navigate = useNavigate()
  const today = new Date(); today.setHours(0,0,0,0)
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const [editTask, setEditTask]             = useState(null)
  const [addAssigneeTask, setAddAssigneeTask]   = useState(null)
  const [addDueDateTask, setAddDueDateTask]     = useState(null)
  const [addReminderTask, setAddReminderTask]   = useState(null)
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null)
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
  const unassignedCount = tasks.filter(t => t.status !== 'done' && !t.roadmap && (t.assigneeIds||[]).length === 0 && t.active !== false).length
  const completedCount  = tasks.filter(t => t.status === 'done' && t.createdAt && new Date(t.createdAt) >= sevenDaysAgo).length

  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  // Section 1: In Progress — overdue or due today, sorted earliest due first
  const inProgressDue = tasks
    .filter(t => t.status === 'inprogress' && t.active !== false && t.due && new Date(t.due) < tomorrow)
    .sort((a, b) => new Date(a.due) - new Date(b.due))

  // Section 2: Inbox — all todo tasks, newest created first
  const inboxTasks = tasks
    .filter(t => t.status === 'todo' && t.active !== false)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

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
          <div className="stat-card stat-card-clickable" onClick={() => navigate('/tasks?tab=unassigned')} style={{ borderLeft: '4px solid #94a3b8' }}>
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

        {/* Section 1 — In Progress: Overdue & Due Today */}
        <div className="card" style={{ padding: '18px 22px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>🔥 In Progress — Overdue &amp; Due Today <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--slate-400)', marginLeft: 6 }}>({inProgressDue.length})</span></div>
            <span className="link" style={{ fontSize: 13, color: 'var(--blue-600)', cursor: 'pointer' }} onClick={() => navigate('/tasks?tab=todo')}>View All →</span>
          </div>
          {inProgressDue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--slate-400)', fontSize: 13 }}>No overdue or due-today tasks. You're on track! 🎉</div>
          ) : (
            <div className="table-scroll" style={{ overflow: 'visible' }}><table className="task-table">
              <thead>
                <tr><th>TASK</th><th>PROJECT</th><th>ASSIGNEE</th><th>STATUS</th><th>DUE</th><th></th></tr>
              </thead>
              <tbody>
                {inProgressDue.map(t => (
                  <DashboardTaskRow key={t.id} task={t} onEdit={setEditTask} onMenuAction={handleMenuAction} onAddAssignee={setAddAssigneeTask} onAddDueDate={setAddDueDateTask} onAddReminder={setAddReminderTask} onDelete={setDeleteConfirmTask} />
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        {/* Section 2 — Inbox (hidden when empty) */}
        {inboxTasks.length > 0 && (
          <div className="card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>📥 Inbox <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--slate-400)', marginLeft: 6 }}>({inboxTasks.length})</span></div>
              <span className="link" style={{ fontSize: 13, color: 'var(--blue-600)', cursor: 'pointer' }} onClick={() => navigate('/tasks?tab=inbox')}>View All →</span>
            </div>
            <div className="table-scroll" style={{ overflow: 'visible' }}><table className="task-table">
              <thead>
                <tr><th>TASK</th><th>PROJECT</th><th>ASSIGNEE</th><th>STATUS</th><th>DUE</th><th></th></tr>
              </thead>
              <tbody>
                {inboxTasks.map(t => (
                  <DashboardTaskRow key={t.id} task={t} onEdit={setEditTask} onMenuAction={handleMenuAction} onAddAssignee={setAddAssigneeTask} onAddDueDate={setAddDueDateTask} onAddReminder={setAddReminderTask} onDelete={setDeleteConfirmTask} />
                ))}
              </tbody>
            </table></div>
          </div>
        )}
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

      <AddAssigneeModal
        task={addAssigneeTask}
        open={!!addAssigneeTask}
        onClose={() => setAddAssigneeTask(null)}
        onSave={async (ids) => {
          await updateTask(addAssigneeTask.id, { assignee_ids: ids })
          showToast('Assignees updated', 'success')
          setAddAssigneeTask(null)
        }}
      />

      <AddDueDateModal
        task={addDueDateTask}
        open={!!addDueDateTask}
        onClose={() => setAddDueDateTask(null)}
        onSave={async (due) => {
          await updateTask(addDueDateTask.id, { due_date: due })
          showToast(due ? 'Due date set' : 'Due date cleared', 'success')
          setAddDueDateTask(null)
        }}
      />

      <AddReminderModal
        task={addReminderTask}
        open={!!addReminderTask}
        onClose={() => setAddReminderTask(null)}
        onSave={async ({ remindAt, recurrence, notes }) => {
          if (!remindAt) { showToast('Please pick a date and time', 'error'); return }
          await createReminder({ entityType: 'task', entityId: addReminderTask.id, remindAt: new Date(remindAt).toISOString(), recurrence, notes })
          showToast('Reminder set', 'success')
          setAddReminderTask(null)
        }}
      />

      <Modal
        open={!!deleteConfirmTask}
        onClose={() => setDeleteConfirmTask(null)}
        title="Delete Task"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setDeleteConfirmTask(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={async () => {
            await deleteTask(deleteConfirmTask.id)
            showToast('Task deleted', 'success')
            setDeleteConfirmTask(null)
          }}>Delete</button>
        </>}>
        <p style={{ color: 'var(--slate-600)', fontSize: 14, margin: 0 }}>
          Are you sure you want to delete <strong>"{deleteConfirmTask?.name}"</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
