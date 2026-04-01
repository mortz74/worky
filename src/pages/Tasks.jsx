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

const TABS = [
  { key: 'inbox',   label: 'Inbox' },
  { key: 'todo',    label: 'To Do' },
  { key: 'waiting', label: 'Waiting for Someone' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'all',     label: 'All Tasks' },
]

// ── AvatarStack ────────────────────────────────────────────
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

// ── TaskRow ────────────────────────────────────────────────
function TaskRow({ task, selected, onToggleSelect, columns, menuItems }) {
  const { data } = useApp()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const projects = (task.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)
  const projectLabel = projects.length === 0 ? '—'
    : projects.length === 1 ? `${projects[0].emoji} ${projects[0].name}`
    : `${projects[0].emoji} ${projects[0].name} +${projects.length - 1}`

  const assignees = (task.assigneeIds || []).map(aid => data.assignees.find(a => a.id === aid)).filter(Boolean)
  const assigneeNames = assignees.map(a => a.name).join(', ') || '—'

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <tr className={selected ? 'selected' : ''}>
      <td onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(task.id)} />
      </td>
      <td style={{ fontWeight: 600, cursor: 'pointer', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => navigate(`/tasks/${task.id}`)}>
        {task.name}
      </td>
      {columns.includes('project') && (
        <td><span style={{ fontSize: 12 }}>{projectLabel}</span></td>
      )}
      {columns.includes('assignees') && (
        <td onClick={e => e.stopPropagation()}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: assignees.length > 0 ? 'pointer' : 'default' }}
            title={assigneeNames}
            onClick={() => assignees.length === 1 && navigate(`/assignees/${assignees[0].id}`)}
          >
            <AvatarStack assigneeIds={task.assigneeIds || []} size={24} />
            {assignees.length === 1 && <span style={{ fontSize: 12 }}>{assignees[0].name}</span>}
            {assignees.length > 1 && <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{assignees.length} people</span>}
          </div>
        </td>
      )}
      {columns.includes('status') && (
        <td><StatusBadge status={task.status} /></td>
      )}
      {columns.includes('due') && (
        <td style={{ fontSize: 12, color: isOverdue(task.due) && task.status !== 'done' ? '#ef4444' : 'var(--slate-500)' }}>
          {fmt(task.due)}
        </td>
      )}
      {columns.includes('roadmap') && (
        <td>{task.roadmap ? '🗺' : ''}</td>
      )}
      <td onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="btn btn-icon"
            style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
            onClick={() => setMenuOpen(o => !o)}
          >
            <svg viewBox="0 0 16 4" fill="currentColor" width="16" height="4">
              <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="dropdown-menu open" style={{ right: 0, left: 'auto', minWidth: 210, zIndex: 1000 }}>
              {menuItems.map((item, i) => {
                if (item.divider) return <div key={`div-${i}`} className="dropdown-divider" />
                return (
                  <div
                    key={i}
                    className="dropdown-item"
                    style={item.danger ? { color: '#ef4444' } : {}}
                    onClick={() => { item.action(); setMenuOpen(false) }}
                  >
                    {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
                    {item.label}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Add Assignee Modal ─────────────────────────────────────
function AddAssigneeModal({ task, open, onClose, onSave }) {
  const { data } = useApp()
  const [assigneeIds, setAssigneeIds] = useState([])

  useEffect(() => {
    if (task) setAssigneeIds(task.assigneeIds || [])
  }, [task])

  const options = data.assignees.map(a => ({ id: a.id, label: a.name }))

  return (
    <Modal open={open} onClose={onClose} title="Manage Assignees"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(assigneeIds)}>Save</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Assignees</label>
        <MultiSelect options={options} value={assigneeIds} onChange={setAssigneeIds} placeholder="— Unassigned —" />
      </div>
    </Modal>
  )
}

// ── Add Due Date Modal ─────────────────────────────────────
function AddDueDateModal({ task, open, onClose, onSave }) {
  const [due, setDue] = useState('')

  useEffect(() => {
    if (task) setDue(task.due ? task.due.slice(0, 10) : '')
  }, [task])

  return (
    <Modal open={open} onClose={onClose} title="Set Due Date"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(due || null)}>Save</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Due Date</label>
        <input className="form-input" type="date" value={due} onChange={e => setDue(e.target.value)} />
      </div>
      {due && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--slate-400)', padding: '4px 0' }} onClick={() => setDue('')}>
            Clear date
          </button>
        </div>
      )}
    </Modal>
  )
}

// ── Delete Confirm Modal ───────────────────────────────────
function DeleteConfirmModal({ task, open, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Task"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={onConfirm}>Delete</button>
        </>
      }>
      <p style={{ color: 'var(--slate-600)', fontSize: 14, margin: 0 }}>
        Are you sure you want to delete <strong>"{task?.name}"</strong>? This action cannot be undone.
      </p>
    </Modal>
  )
}

// ── Add Task Modal ─────────────────────────────────────────
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
          <MultiSelect options={projectOptions} value={form.projectIds} onChange={ids => set('projectIds', ids)} placeholder="— None —" />
        </div>
        <div className="form-group">
          <label className="form-label">Assignees</label>
          <MultiSelect options={assigneeOptions} value={form.assigneeIds} onChange={ids => set('assigneeIds', ids)} placeholder="— Unassigned —" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="todo">Inbox</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
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

// ── Main Tasks Page ────────────────────────────────────────
export default function Tasks() {
  const { data, updateTask, deleteTask, showToast } = useApp()
  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'inbox')
  const [search, setSearch]     = useState('')
  const [projectF, setProjectF] = useState('')
  const [activeF, setActiveF]   = useState('active')
  // All Jobs tab only
  const [statusF, setStatusF]   = useState('')
  const [assigneeF, setAssigneeF] = useState('')
  const [roadmapF, setRoadmapF] = useState('')

  const [selected, setSelected] = useState(new Set())
  const [showAdd, setShowAdd]   = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [addAssigneeTask, setAddAssigneeTask] = useState(null)
  const [addDueDateTask, setAddDueDateTask]   = useState(null)
  const [deleteTaskItem, setDeleteTaskItem]   = useState(null)

  useEffect(() => {
    if (searchParams.get('new')) setShowAdd(true)
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  // Reset per-tab filters when switching tabs
  useEffect(() => {
    setSearch('')
    setProjectF('')
    setActiveF('active')
    setStatusF('')
    setAssigneeF('')
    setRoadmapF('')
    setSelected(new Set())
  }, [activeTab])

  const owner = data.assignees.find(a => a.isOwner)

  // ── Tab-level filter logic ─────────────────────────────────
  const filterByTab = (t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchProject = !projectF || (t.projectIds || []).includes(projectF)
    const matchActive =
      activeF === 'active' ? t.active !== false
      : activeF === 'closed' ? t.active === false
      : true

    switch (activeTab) {
      case 'inbox':
        return t.status === 'todo' && t.active !== false && matchSearch

      case 'todo':
        return t.status === 'inprogress'
          && !t.roadmap
          && !!owner && (t.assigneeIds || []).includes(owner.id)
          && matchProject && matchActive && matchSearch

      case 'waiting':
        return t.status === 'inprogress'
          && !t.roadmap
          && (!owner || !(t.assigneeIds || []).includes(owner.id))
          && matchProject && matchActive && matchSearch

      case 'roadmap':
        return t.status === 'inprogress'
          && t.roadmap
          && matchProject && matchActive && matchSearch

      case 'all': {
        const matchStatus   = !statusF   || t.status === statusF
        const matchAssignee = !assigneeF || (t.assigneeIds || []).includes(assigneeF)
        const matchRoadmap  = roadmapF === 'yes' ? t.roadmap : roadmapF === 'no' ? !t.roadmap : true
        return matchStatus && matchProject && matchAssignee && matchActive && matchRoadmap && matchSearch
      }

      default: return true
    }
  }

  const filtered = data.tasks.filter(filterByTab).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // ── Tab badge counts ───────────────────────────────────────
  const tabCount = (tabKey) => data.tasks.filter(t => {
    switch (tabKey) {
      case 'inbox':   return t.status === 'todo' && t.active !== false
      case 'todo':    return t.status === 'inprogress' && !t.roadmap && !!owner && (t.assigneeIds||[]).includes(owner.id) && t.active !== false
      case 'waiting': return t.status === 'inprogress' && !t.roadmap && (!owner || !(t.assigneeIds||[]).includes(owner.id)) && t.active !== false
      case 'roadmap': return t.status === 'inprogress' && t.roadmap && t.active !== false
      case 'all':     return true
      default:        return false
    }
  }).length

  // ── Column definitions per tab ─────────────────────────────
  const TAB_COLUMNS = {
    inbox:   ['project', 'assignees', 'due'],
    todo:    ['project', 'due'],
    waiting: ['project', 'assignees', 'due'],
    roadmap: ['project', 'assignees', 'due'],
    all:     ['project', 'assignees', 'status', 'due', 'roadmap'],
  }
  const columns = TAB_COLUMNS[activeTab] || []

  // ── Handlers ──────────────────────────────────────────────
  const assignToOwner = async (task) => {
    if (!owner) { showToast('No owner set — go to Assignees to assign one', 'error'); return }
    const ids = [...new Set([...(task.assigneeIds || []), owner.id])]
    await updateTask(task.id, { assignee_ids: ids })
    showToast(`Assigned to ${owner.name}`, 'success')
  }

  const handleAssigneeSave = async (task, ids) => {
    await updateTask(task.id, { assignee_ids: ids })
    showToast('Assignees updated', 'success')
    setAddAssigneeTask(null)
  }

  const handleDueDateSave = async (task, due) => {
    await updateTask(task.id, { due_date: due })
    showToast(due ? 'Due date set' : 'Due date cleared', 'success')
    setAddDueDateTask(null)
  }

  const handleDelete = async () => {
    if (!deleteTaskItem) return
    await deleteTask(deleteTaskItem.id)
    showToast('Task deleted', 'success')
    setDeleteTaskItem(null)
  }

  // ── Per-tab menu item factory ──────────────────────────────
  const getMenuItems = (task) => {
    const ownerName = owner?.name || 'Owner'

    if (activeTab === 'inbox') return [
      { icon: '▶️', label: 'Mark In Progress', action: () => { updateTask(task.id, { status: 'inprogress' }); showToast('Marked In Progress', 'success') } },
      { icon: '👑', label: `Assign to ${ownerName}`, action: () => assignToOwner(task) },
      { icon: '👤', label: 'Add Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '📅', label: 'Add Due Date', action: () => setAddDueDateTask(task) },
      { icon: '🗺', label: 'Add to Roadmap', action: () => { updateTask(task.id, { roadmap: true }); showToast('Added to Roadmap', 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]

    if (activeTab === 'todo' || activeTab === 'waiting') return [
      { icon: '✅', label: 'Mark Done', action: () => { updateTask(task.id, { status: 'done', active: false }); showToast('Marked Done', 'success') } },
      { icon: '👤', label: 'Add / Change Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '📅', label: 'Add Due Date', action: () => setAddDueDateTask(task) },
      { icon: '🗺', label: 'Add to Roadmap', action: () => { updateTask(task.id, { roadmap: true }); showToast('Added to Roadmap', 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]

    if (activeTab === 'roadmap') return [
      { icon: '✅', label: 'Mark Done', action: () => { updateTask(task.id, { status: 'done', active: false }); showToast('Marked Done', 'success') } },
      { icon: '👤', label: 'Add / Change Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '↩️', label: 'Remove from Roadmap', action: () => { updateTask(task.id, { roadmap: false }); showToast('Removed from Roadmap', 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]

    // 'all' tab
    return [
      { icon: '▶️', label: 'Mark In Progress', action: () => { updateTask(task.id, { status: 'inprogress' }); showToast('Marked In Progress', 'success') } },
      { icon: '✅', label: 'Mark Done', action: () => { updateTask(task.id, { status: 'done', active: false }); showToast('Marked Done', 'success') } },
      { icon: '👤', label: 'Add / Change Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '📅', label: 'Add Due Date', action: () => setAddDueDateTask(task) },
      { icon: '🗺', label: task.roadmap ? 'Remove from Roadmap' : 'Add to Roadmap', action: () => { updateTask(task.id, { roadmap: !task.roadmap }); showToast(`Roadmap ${!task.roadmap ? 'enabled' : 'disabled'}`, 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]
  }

  const toggleSelect = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id)))

  // ── Table headers ──────────────────────────────────────────
  const colHeaders = () => (
    <>
      <th>TASK</th>
      {columns.includes('project')   && <th style={{ width: 160 }}>PROJECT</th>}
      {columns.includes('assignees') && <th style={{ width: 180 }}>ASSIGNEES</th>}
      {columns.includes('status')    && <th style={{ width: 130 }}>STATUS</th>}
      {columns.includes('due')       && <th style={{ width: 110 }}>DUE</th>}
      {columns.includes('roadmap')   && <th style={{ width: 36 }}>🗺</th>}
      <th style={{ width: 44 }}></th>
    </>
  )

  // ── Empty state message ────────────────────────────────────
  const emptyMsg = () => {
    if (activeTab === 'todo' && !owner)
      return 'No owner set. Go to the Assignees page and mark someone as Owner.'
    return 'No tasks match your filters.'
  }

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Tasks</span>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>

      <div className="page-content">
        {/* ── Tab bar ── */}
        <div className="page-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`page-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="page-tab-count">{tabCount(tab.key)}</span>
            </button>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Project filter — tabs 2, 3, 4, all */}
          {activeTab !== 'inbox' && (
            <select className="filter-select" value={projectF} onChange={e => setProjectF(e.target.value)}>
              <option value="">All Projects</option>
              {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {/* Active Jobs filter — tabs 2, 3, 4, all */}
          {activeTab !== 'inbox' && (
            <select className="filter-select" value={activeF} onChange={e => setActiveF(e.target.value)}>
              <option value="active">Active Jobs</option>
              <option value="closed">Closed Jobs</option>
              <option value="">All Jobs</option>
            </select>
          )}

          {/* Status filter — all only */}
          {activeTab === 'all' && (
            <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="todo">Inbox</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
          )}

          {/* Assignee filter — all only */}
          {activeTab === 'all' && (
            <select className="filter-select" value={assigneeF} onChange={e => setAssigneeF(e.target.value)}>
              <option value="">All Assignees</option>
              {data.assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          {/* Roadmap filter — all only */}
          {activeTab === 'all' && (
            <select className="filter-select" value={roadmapF} onChange={e => setRoadmapF(e.target.value)}>
              <option value="">All (incl. Roadmap)</option>
              <option value="no">Exclude Roadmap</option>
              <option value="yes">Only Roadmap</option>
            </select>
          )}
        </div>

        {/* ── Bulk action bar ── */}
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--blue-50)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{selected.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={async () => { for (const id of selected) await updateTask(id, { status: 'inprogress' }); setSelected(new Set()); showToast('Updated', 'success') }}>In Progress</button>
            <button className="btn btn-sm btn-secondary" onClick={async () => { for (const id of selected) await updateTask(id, { status: 'done', active: false }); setSelected(new Set()); showToast('Marked done', 'success') }}>Mark Done</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {/* ── Task table ── */}
        <div className="card" style={{ overflowX: 'visible' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)', fontSize: 13 }}>{emptyMsg()}</div>
          ) : (
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                  {colHeaders()}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    selected={selected.has(t.id)}
                    onToggleSelect={toggleSelect}
                    columns={columns}
                    menuItems={getMenuItems(t)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
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

      <AddAssigneeModal
        task={addAssigneeTask}
        open={!!addAssigneeTask}
        onClose={() => setAddAssigneeTask(null)}
        onSave={(ids) => handleAssigneeSave(addAssigneeTask, ids)}
      />

      <AddDueDateModal
        task={addDueDateTask}
        open={!!addDueDateTask}
        onClose={() => setAddDueDateTask(null)}
        onSave={(due) => handleDueDateSave(addDueDateTask, due)}
      />

      <DeleteConfirmModal
        task={deleteTaskItem}
        open={!!deleteTaskItem}
        onClose={() => setDeleteTaskItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
