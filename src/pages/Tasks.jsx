import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import MultiSelect from '../components/MultiSelect'
import EditTaskModal from '../components/EditTaskModal'
import QuickTaskModal from '../components/QuickTaskModal'

const fmt = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => d && new Date(d) < new Date()

const TABS = [
  { key: 'inbox',      label: 'Inbox' },
  { key: 'todo',       label: 'To Do' },
  { key: 'waiting',    label: 'Waiting for Someone' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'roadmap',    label: 'Roadmap' },
  { key: 'all',        label: 'All Tasks' },
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
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)
  const btnRef = useRef(null)

  const hasReminder = data.reminders.some(r => r.entityType === 'task' && r.entityId === task.id)
  const projects = (task.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)

  const assignees = (task.assigneeIds || []).map(aid => data.assignees.find(a => a.id === aid)).filter(Boolean)
  const assigneeNames = assignees.map(a => a.name).join(', ') || '—'

  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setMenuOpen(o => !o)
  }

  const menu = menuOpen && createPortal(
    <div
      ref={menuRef}
      className="dropdown-menu open"
      style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, left: 'auto', minWidth: 210, zIndex: 9999 }}
    >
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
    </div>,
    document.body
  )

  return (
    <tr className={selected ? 'selected' : ''}>
      <td onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(task.id)} />
      </td>
      <td style={{ fontWeight: 600, cursor: 'pointer', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => navigate(`/tasks/${task.id}`)}>
        {task.name}
        {hasReminder && <span title="Has reminder" style={{ marginLeft: 6, fontSize: 12 }}>🔔</span>}
      </td>
      {columns.includes('project') && (
        <td onClick={e => e.stopPropagation()}>
          {projects.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>—</span>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {projects.map(p => (
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
        <button
          ref={btnRef}
          className="btn btn-icon"
          style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
          onClick={openMenu}
        >
          <svg viewBox="0 0 16 4" fill="currentColor" width="16" height="4">
            <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/>
          </svg>
        </button>
        {menu}
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

// ── Add Reminder Modal ─────────────────────────────────────
function AddReminderModal({ task, open, onClose, onSave }) {
  const [remindAt, setRemindAt]     = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [notes, setNotes]           = useState('')

  useEffect(() => {
    if (open) { setRemindAt(''); setRecurrence('none'); setNotes('') }
  }, [open])

  const toDatetimeLocal = () => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add Reminder — ${task?.name || ''}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ remindAt, recurrence, notes })}>Set Reminder</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Date &amp; Time</label>
        <input className="form-input" type="datetime-local" value={remindAt || toDatetimeLocal()}
          onChange={e => setRemindAt(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Recurrence</label>
        <select className="form-select" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
          <option value="none">One-time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Notes (optional)</label>
        <input className="form-input" placeholder="e.g. Follow up on status" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
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
  const { data, createTask, createReminder, showToast, user } = useApp()
  const [form, setForm] = useState({
    name: '', desc: '', projectIds: [], assigneeIds: [],
    ownerId: '', status: 'inprogress', start: '', due: '',
    tags: '', roadmap: false, active: true, domain: '',
  })
  const [saving, setSaving] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminder, setReminder] = useState({ remindAt: '', recurrence: 'none', notes: '' })

  const BLANK = { name: '', desc: '', projectIds: [], assigneeIds: [], ownerId: '', status: 'inprogress', start: '', due: '', tags: '', roadmap: false, active: true, domain: '' }

  useEffect(() => {
    if (open) {
      setForm(BLANK)
      setReminderEnabled(false)
      setReminder({ remindAt: '', recurrence: 'none', notes: '' })
    }
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Derive inherited domain from first selected project
  const inheritedDomain = form.projectIds.length > 0
    ? (data.projects.find(p => p.id === form.projectIds[0])?.domain || '')
    : null

  const handleProjectChange = (ids) => {
    const inherited = ids.length > 0 ? (data.projects.find(p => p.id === ids[0])?.domain || '') : ''
    setForm(f => ({ ...f, projectIds: ids, domain: inherited || f.domain }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Task name is required', 'error'); return }
    setSaving(true)
    const effectiveDomain = inheritedDomain !== null ? inheritedDomain : form.domain
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
      domain: effectiveDomain || null,
    }
    const task = await createTask(row)
    if (task && reminderEnabled && reminder.remindAt) {
      await createReminder({ entityType: 'task', entityId: task.id, remindAt: new Date(reminder.remindAt).toISOString(), recurrence: reminder.recurrence, notes: reminder.notes })
    }
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
          <MultiSelect options={projectOptions} value={form.projectIds} onChange={handleProjectChange} placeholder="— None —" />
        </div>
        <div className="form-group">
          <label className="form-label">Assignees</label>
          <MultiSelect options={assigneeOptions} value={form.assigneeIds} onChange={ids => set('assigneeIds', ids)} placeholder="— Unassigned —" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Domain</label>
        {inheritedDomain !== null
          ? <div style={{ fontSize: 13, color: 'var(--slate-500)', padding: '8px 10px', background: 'var(--slate-50)', borderRadius: 6, border: '1px solid var(--slate-200)' }}>
              🔗 Inherited: <strong>{inheritedDomain || '—'}</strong>
            </div>
          : <select className="form-select" value={form.domain} onChange={e => set('domain', e.target.value)}>
              <option value="">— No domain —</option>
              {data.domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
        }
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

      {/* Reminder */}
      <div style={{ marginTop: 18, borderTop: '1px solid var(--slate-100)', paddingTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={reminderEnabled} onChange={e => setReminderEnabled(e.target.checked)} style={{ accentColor: 'var(--blue-500)', width: 15, height: 15 }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--slate-700)' }}>🔔 Add a Reminder</span>
        </label>
        {reminderEnabled && (
          <div style={{ marginTop: 12 }}>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div>
                <div className="form-label" style={{ marginBottom: 4 }}>Date &amp; Time *</div>
                <input type="datetime-local" className="form-input" style={{ fontSize: 13 }} value={reminder.remindAt} onChange={e => setReminder(r => ({ ...r, remindAt: e.target.value }))} />
              </div>
              <div>
                <div className="form-label" style={{ marginBottom: 4 }}>Recurrence</div>
                <select className="form-select" style={{ fontSize: 13 }} value={reminder.recurrence} onChange={e => setReminder(r => ({ ...r, recurrence: e.target.value }))}>
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: 4 }}>Notes (optional)</div>
              <input className="form-input" style={{ fontSize: 13 }} placeholder="e.g. Check for updates" value={reminder.notes} onChange={e => setReminder(r => ({ ...r, notes: e.target.value }))} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Main Tasks Page ────────────────────────────────────────
export default function Tasks() {
  const { data, updateTask, deleteTask, createReminder, showToast } = useApp()
  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'inbox')
  const [search, setSearch]     = useState('')
  const [projectF, setProjectF] = useState('')
  const [domainF, setDomainF]   = useState('')
  const [activeF, setActiveF]   = useState('active')
  // All Jobs tab only
  const [statusF, setStatusF]   = useState('')
  const [assigneeF, setAssigneeF] = useState('')
  const [roadmapF, setRoadmapF] = useState('')

  const [selected, setSelected]   = useState(new Set())
  const [showAdd, setShowAdd]     = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const splitRef                   = useRef(null)
  const [editTask, setEditTask] = useState(null)
  const [addAssigneeTask, setAddAssigneeTask] = useState(null)
  const [addDueDateTask, setAddDueDateTask]     = useState(null)
  const [addReminderTask, setAddReminderTask]   = useState(null)
  const [deleteTaskItem, setDeleteTaskItem]   = useState(null)

  useEffect(() => {
    if (searchParams.get('new')) setShowAdd(true)
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    const handler = e => { if (splitRef.current && !splitRef.current.contains(e.target)) setSplitOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset per-tab filters when switching tabs
  useEffect(() => {
    setSearch('')
    setProjectF('')
    setDomainF('')
    setActiveF('active')
    setStatusF('')
    setAssigneeF('')
    setRoadmapF('')
    setSelected(new Set())
  }, [activeTab])

  const owner = data.assignees.find(a => a.isOwner)

  // ── Tab-level filter logic ─────────────────────────────────
  const filterByTab = (t) => {
    const matchSearch  = !search   || t.name.toLowerCase().includes(search.toLowerCase())
    const matchProject = !projectF || (t.projectIds || []).includes(projectF)
    const matchDomain  = !domainF  || t.domain === domainF
    const matchActive  =
      activeF === 'active' ? t.active !== false
      : activeF === 'closed' ? t.active === false
      : true

    switch (activeTab) {
      case 'inbox':
        return t.status === 'todo' && t.active !== false && matchSearch && matchDomain

      case 'todo':
        return t.status === 'inprogress'
          && !t.roadmap
          && !!owner && (t.assigneeIds || []).includes(owner.id)
          && matchProject && matchActive && matchSearch && matchDomain

      case 'waiting':
        return t.status === 'inprogress'
          && !t.roadmap
          && (!owner || !(t.assigneeIds || []).includes(owner.id))
          && matchProject && matchActive && matchSearch && matchDomain

      case 'unassigned':
        return t.status !== 'done'
          && !t.roadmap
          && (t.assigneeIds || []).length === 0
          && matchProject && matchActive && matchSearch && matchDomain

      case 'roadmap':
        return t.status === 'inprogress'
          && t.roadmap
          && matchProject && matchActive && matchSearch && matchDomain

      case 'all': {
        const matchStatus   = !statusF   || t.status === statusF
        const matchAssignee = !assigneeF || (t.assigneeIds || []).includes(assigneeF)
        const matchRoadmap  = roadmapF === 'yes' ? t.roadmap : roadmapF === 'no' ? !t.roadmap : true
        return matchStatus && matchProject && matchAssignee && matchActive && matchRoadmap && matchSearch && matchDomain
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
      case 'waiting':    return t.status === 'inprogress' && !t.roadmap && (!owner || !(t.assigneeIds||[]).includes(owner.id)) && t.active !== false
      case 'unassigned': return t.status !== 'done' && !t.roadmap && (t.assigneeIds||[]).length === 0 && t.active !== false
      case 'roadmap':    return t.status === 'inprogress' && t.roadmap && t.active !== false
      case 'all':     return true
      default:        return false
    }
  }).length

  // ── Column definitions per tab ─────────────────────────────
  const TAB_COLUMNS = {
    inbox:      ['project', 'assignees', 'due'],
    todo:       ['project', 'due'],
    waiting:    ['project', 'assignees', 'due'],
    unassigned: ['project', 'status', 'due'],
    roadmap:    ['project', 'assignees', 'due'],
    all:        ['project', 'assignees', 'status', 'due', 'roadmap'],
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
      { icon: '🔔', label: 'Add Reminder', action: () => setAddReminderTask(task) },
      { divider: true },
      { icon: '🗺', label: 'Add to Roadmap', action: () => { updateTask(task.id, { roadmap: true }); showToast('Added to Roadmap', 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]

    if (activeTab === 'todo' || activeTab === 'waiting') return [
      { icon: '✅', label: 'Mark Done', action: () => { updateTask(task.id, { status: 'done', active: false }); showToast('Marked Done', 'success') } },
      { divider: true },
      { icon: '👤', label: 'Add / Change Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '📅', label: 'Add Due Date', action: () => setAddDueDateTask(task) },
      { icon: '🔔', label: 'Add Reminder', action: () => setAddReminderTask(task) },
      { divider: true },
      { icon: '🗺', label: 'Add to Roadmap', action: () => { updateTask(task.id, { roadmap: true }); showToast('Added to Roadmap', 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]

    if (activeTab === 'unassigned') return [
      { icon: '✅', label: 'Mark Done', action: () => { updateTask(task.id, { status: 'done', active: false }); showToast('Marked Done', 'success') } },
      { divider: true },
      ...(owner ? [{ icon: '🙋', label: `Assign to ${ownerName} & Move to To Do`, action: () => { updateTask(task.id, { status: 'inprogress', assignee_ids: [owner.id] }); showToast(`Assigned to ${ownerName}`, 'success') } }] : []),
      { icon: '👤', label: 'Add / Change Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '📅', label: 'Add Due Date', action: () => setAddDueDateTask(task) },
      { icon: '🔔', label: 'Add Reminder', action: () => setAddReminderTask(task) },
      { divider: true },
      { icon: '🗺', label: 'Add to Roadmap', action: () => { updateTask(task.id, { roadmap: true }); showToast('Added to Roadmap', 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]

    if (activeTab === 'roadmap') return [
      { icon: '✅', label: 'Mark Done', action: () => { updateTask(task.id, { status: 'done', active: false }); showToast('Marked Done', 'success') } },
      { divider: true },
      { icon: '👤', label: 'Add / Change Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '📅', label: 'Add Due Date', action: () => setAddDueDateTask(task) },
      { icon: '🔔', label: 'Add Reminder', action: () => setAddReminderTask(task) },
      { divider: true },
      { icon: '↩️', label: 'Remove from Roadmap', action: () => { updateTask(task.id, { roadmap: false }); showToast('Removed from Roadmap', 'success') } },
      { divider: true },
      { icon: '✏️', label: 'Edit', action: () => setEditTask(task) },
      { icon: '🗑️', label: 'Delete', action: () => setDeleteTaskItem(task), danger: true },
    ]

    // 'all' tab
    return [
      { icon: '▶️', label: 'Mark In Progress', action: () => { updateTask(task.id, { status: 'inprogress' }); showToast('Marked In Progress', 'success') } },
      { icon: '✅', label: 'Mark Done', action: () => { updateTask(task.id, { status: 'done', active: false }); showToast('Marked Done', 'success') } },
      { divider: true },
      { icon: '👤', label: 'Add / Change Assignee', action: () => setAddAssigneeTask(task) },
      { icon: '📅', label: 'Add Due Date', action: () => setAddDueDateTask(task) },
      { icon: '🔔', label: 'Add Reminder', action: () => setAddReminderTask(task) },
      { divider: true },
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
              <div className="dropdown-item" onClick={() => { setShowAdd(true); setSplitOpen(false) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginRight: 7 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Task (full form)
              </div>
            </div>
          )}
        </div>
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

          {/* Domain filter — all tabs */}
          <select className="filter-select" value={domainF} onChange={e => setDomainF(e.target.value)}>
            <option value="">All Domains</option>
            {data.domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>

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
            <div className="table-scroll"><table className="task-table">
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
            </table></div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <QuickTaskModal open={showQuick} onClose={() => setShowQuick(false)} />
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

      <DeleteConfirmModal
        task={deleteTaskItem}
        open={!!deleteTaskItem}
        onClose={() => setDeleteTaskItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
