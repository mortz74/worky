import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import MultiSelect from '../components/MultiSelect'
import EditTaskModal from '../components/EditTaskModal'

const fmt = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => d && new Date(d) < new Date()

// Stacked avatars for multiple assignees
function AvatarStack({ assigneeIds = [], size = 24 }) {
  if (assigneeIds.length === 0) return <span style={{ color: 'var(--slate-300)', fontSize: 12 }}>—</span>
  const show = assigneeIds.slice(0, 3)
  const extra = assigneeIds.length - show.length
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {show.map((id, i) => (
        <div key={id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: show.length - i }}>
          <Avatar assigneeId={id} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          width: size, height: size, borderRadius: '50%', marginLeft: -8,
          background: 'var(--slate-200)', color: 'var(--slate-600)',
          fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff', zIndex: 0,
        }}>+{extra}</div>
      )}
    </div>
  )
}

function TaskRow({ task, onToggleSelect, selected, onMenuAction, onEdit }) {
  const { data } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Multi-project: show all projects
  const projects = (task.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)
  const projectLabel = projects.length === 0 ? '—'
    : projects.length === 1 ? `${projects[0].emoji} ${projects[0].name}`
    : `${projects[0].emoji} ${projects[0].name} +${projects.length - 1}`

  // Multi-assignee names for tooltip / secondary display
  const assignees = (task.assigneeIds || []).map(aid => data.assignees.find(a => a.id === aid)).filter(Boolean)
  const assigneeNames = assignees.map(a => a.name).join(', ') || '—'

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <tr>
      <td onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(task.id)} />
      </td>
      <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task.id}`)}>{task.name}</td>
      <td><span style={{ fontSize: 12 }}>{projectLabel}</span></td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }} title={assigneeNames}>
          <AvatarStack assigneeIds={task.assigneeIds || []} size={24} />
          {assignees.length === 1 && <span style={{ fontSize: 12 }}>{assignees[0].name}</span>}
          {assignees.length > 1 && <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{assignees.length} people</span>}
        </div>
      </td>
      <td><StatusBadge status={task.status} /></td>
      <td style={{ fontSize: 12, color: isOverdue(task.due) && task.status !== 'done' ? '#ef4444' : 'var(--slate-500)' }}>{fmt(task.due)}</td>
      <td>{task.roadmap ? '🗺' : ''}</td>
      <td onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="btn btn-icon" style={{ padding: '2px 6px', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }} onClick={() => setMenuOpen(o => !o)}>⋿</button>
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

function AddTaskModal({ open, onClose }) {
  const { data, createTask, showToast, user } = useApp()
  const [form, setForm] = useState({
    name: '', desc: '', projectIds: [], assigneeIds: [],
    ownerId: '', status: 'todo', start: '', due: '',
    tags: '', roadmap: false, active: true,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Task name is required', 'error'); return }
    setSaving(true)
    const row = {
      user_id: user.id,
      name: form.name.trim(),
      description: form.desc,
      owner_id: form.ownerId || null,
      status: form.status,
      start_date: form.start || null,
      due_date: form.due || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      roadmap: form.roadmap,
      active: form.status === 'done' ? false : form.active,
      // junction arrays
      assignee_ids: form.assigneeIds,
      project_ids: form.projectIds,
    }
    const task = await createTask(row)
    setSaving(false)
    if (task) { showToast('Task created!', 'success'); onClose() }
  }

  const assigneeOptions = data.assignees.map(a => ({ id: a.id, label: a.name }))
  const projectOptions  = data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))

  return (
    <Modal open={open} onClose={onClose} title="New Task"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Create Task'}</button></>}>
      <div className="form-group">
        <label className="form-label">Task Name *</label>
        <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.desc} onChange={e => set('desc', e.target.value)} rows={3} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Projects</label>
          <MultiSelect
            options={projectOptions}
            value={form.projectIds}
            onChange={ids => set('projectIds', ids)}
            placeholder="— None —"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Assignees</label>
          <MultiSelect
            options={assigneeOptions}
            value={form.assigneeIds}
            onChange={ids => set('assigneeIds', ids)}
            placeholder="— Unassigned —"
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Start</label>
          <input className="form-input" type="date" value={form.start} onChange={e => set('start', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Due</label>
          <input className="form-input" type="date" value={form.due} onChange={e => set('due', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Tags (comma separated)</label>
        <input className="form-input" value={form.tags} onChange={e => set('tags', e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.roadmap} onChange={e => set('roadmap', e.target.checked)} /> Roadmap
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.active} disabled={form.status === 'done'} onChange={e => set('active', e.target.checked)} /> Active
        </label>
      </div>
    </Modal>
  )
}

export default function Tasks() {
  const { data, updateTask, showToast } = useApp()
  const [searchParams] = useSearchParams()
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState('')
  const [projectF, setProjectF] = useState('')
  const [assigneeF, setAssigneeF] = useState('')
  const [activeF, setActiveF] = useState('active')
  const [roadmapF, setRoadmapF] = useState('no')
  const [view, setView]       = useState('list')
  const [selected, setSelected] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState(null)

  useEffect(() => { if (searchParams.get('new')) setShowAdd(true) }, [searchParams])

  const filtered = data.tasks
    .filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      if (statusF && t.status !== statusF) return false
      // filter by project: task must include the selected project in its projectIds
      if (projectF && !(t.projectIds || []).includes(projectF)) return false
      // filter by assignee: task must include the selected assignee in its assigneeIds
      if (assigneeF && !(t.assigneeIds || []).includes(assigneeF)) return false
      if (activeF === 'active' && !t.active) return false
      if (activeF === 'closed' && t.active) return false
      if (roadmapF === 'yes' && !t.roadmap) return false
      if (roadmapF === 'no' && t.roadmap) return false
      return true
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const toggleSelect = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id)))

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

  const KANBAN_COLS = [
    { key: 'todo', label: 'To Do' }, { key: 'inprogress', label: 'In Progress' },
    { key: 'review', label: 'In Review' }, { key: 'done', label: 'Done' }, { key: 'blocked', label: 'Blocked' }
  ]

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Tasks <span className="page-subtitle">({filtered.length})</span></span>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>
      <div className="page-content">
        <div className="toolbar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="todo">To Do</option><option value="inprogress">In Progress</option>
            <option value="review">In Review</option><option value="done">Done</option><option value="blocked">Blocked</option>
          </select>
          <select className="filter-select" value={projectF} onChange={e => setProjectF(e.target.value)}>
            <option value="">All Projects</option>
            {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="filter-select" value={assigneeF} onChange={e => setAssigneeF(e.target.value)}>
            <option value="">All Assignees</option>
            {data.assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="filter-select" value={activeF} onChange={e => setActiveF(e.target.value)}>
            <option value="active">Active Jobs</option>
            <option value="closed">Closed Jobs</option>
            <option value="">All Jobs</option>
          </select>
          <select className="filter-select" value={roadmapF} onChange={e => setRoadmapF(e.target.value)}>
            <option value="no">No Roadmap</option>
            <option value="">All Jobs</option>
            <option value="yes">Only Roadmap</option>
          </select>
          <div className="view-toggle">
            <button className={`view-btn${view==='list'?' active':''}`} onClick={() => setView('list')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button className={`view-btn${view==='kanban'?' active':''}`} onClick={() => setView('kanban')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="3" width="5" height="18"/><rect x="10" y="3" width="5" height="18"/><rect x="17" y="3" width="5" height="18"/></svg>
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--blue-50)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{selected.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={async () => { for (const id of selected) await updateTask(id, { status: 'inprogress' }); setSelected(new Set()); showToast('Updated', 'success') }}>In Progress</button>
            <button className="btn btn-sm btn-secondary" onClick={async () => { for (const id of selected) await updateTask(id, { status: 'done', active: false }); setSelected(new Set()); showToast('Marked done', 'success') }}>Mark Done</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {view === 'list' ? (
          <div className="card" style={{ overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)', fontSize: 13 }}>No tasks match your filters.</div>
            ) : (
              <table className="task-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                    <th>TASK</th><th>PROJECT</th><th>ASSIGNEES</th><th>STATUS</th><th>DUE</th><th>🗺</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <TaskRow key={t.id} task={t} selected={selected.has(t.id)} onToggleSelect={toggleSelect} onMenuAction={handleMenuAction} onEdit={setEditTask} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="kanban-board">
            {KANBAN_COLS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.key)
              return (
                <div key={col.key} className="kanban-col">
                  <div className="kanban-col-header">
                    <span className={`dot-status dot-${col.key}`}></span>
                    <span className="kanban-col-title">{col.label}</span>
                    <span className="kanban-count">{colTasks.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {colTasks.map(t => (
                      <KanbanCard key={t.id} task={t} />
                    ))}
                    {colTasks.length === 0 && <div style={{ padding: 14, textAlign: 'center', color: 'var(--slate-300)', fontSize: 12 }}>No tasks</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} />

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

function KanbanCard({ task }) {
  const navigate = useNavigate()
  return (
    <div className="kanban-card" onClick={() => navigate(`/tasks/${task.id}`)}>
      <div className="kanban-card-title">{task.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <AvatarStack assigneeIds={task.assigneeIds || []} size={24} />
        <span style={{ flex: 1, fontSize: 11, color: 'var(--slate-400)' }}>
          {task.due ? new Date(task.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
        </span>
      </div>
    </div>
  )
}
