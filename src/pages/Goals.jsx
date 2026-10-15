import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import Modal from '../components/Modal'

export const GOAL_TYPES = [
  { value: 'weekly',  label: 'Weekly',  emoji: '📆' },
  { value: 'monthly', label: 'Monthly', emoji: '🗓️' },
  { value: 'annual',  label: 'Annual',  emoji: '📅' },
  { value: 'life',    label: 'Life',    emoji: '🌟' },
]

export const goalTypeMeta = type => GOAL_TYPES.find(t => t.value === type) || GOAL_TYPES[1]

const fmt = d => { if (!d) return '—'; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }

const emptyForm = () => ({ name: '', desc: '', type: 'monthly', status: 'active', start: '', due: '' })

function GoalForm({ form, set }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Goal Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {GOAL_TYPES.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('type', opt.value)}
              style={{
                flex: 1, padding: '10px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                border: form.type === opt.value ? '2px solid var(--blue-500)' : '2px solid var(--slate-200)',
                background: form.type === opt.value ? 'var(--blue-50)' : 'var(--slate-50)',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 18 }}>{opt.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: form.type === opt.value ? 'var(--blue-700)' : 'var(--slate-700)', marginTop: 2 }}>{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Goal Name *</label>
        <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ship the Connector launch" />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.desc} onChange={e => set('desc', e.target.value)} rows={3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
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
    </>
  )
}

function GoalCard({ goal, tasks, projects, onEdit, onDelete }) {
  const navigate = useNavigate()
  const meta = goalTypeMeta(goal.type)
  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const [expanded, setExpanded] = useState(false)
  const hasLinks = tasks.length > 0 || projects.length > 0

  return (
    <div className="card" style={{ padding: '14px 16px', cursor: hasLinks ? 'pointer' : 'default' }} onClick={() => hasLinks && setExpanded(e => !e)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 18 }}>{meta.emoji}</span>
          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 2 }} title="Edit goal">✏️</button>
          <button onClick={() => onDelete(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 2 }} title="Delete goal">🗑️</button>
        </div>
      </div>
      {goal.desc && <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '0 0 10px', lineHeight: 1.5 }}>{goal.desc}</p>}
      {hasLinks && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 4, background: 'var(--slate-100)', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blue-500)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>
            {tasks.length > 0 && `${done}/${tasks.length} tasks done`}
            {tasks.length > 0 && projects.length > 0 && ' · '}
            {projects.length > 0 && `${projects.length} project${projects.length === 1 ? '' : 's'}`}
            {' · '}{expanded ? 'hide ▲' : 'show ▼'}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className={`badge badge-dot ${goal.status === 'completed' ? 'badge-done' : goal.status === 'archived' ? 'badge-archive' : 'badge-active'}`}>
          {goal.status === 'completed' ? 'Completed' : goal.status === 'archived' ? 'Archived' : 'Active'}
        </span>
        {goal.due && <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>Due {fmt(goal.due)}</span>}
      </div>
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--slate-100)', display: 'flex', flexDirection: 'column', gap: 5 }} onClick={e => e.stopPropagation()}>
          {projects.map(p => (
            <div key={p.id} style={{ fontSize: 12, cursor: 'pointer', color: 'var(--slate-600)' }} onClick={() => navigate(`/projects/${p.id}`)}>
              {p.emoji} {p.name}
            </div>
          ))}
          {tasks.map(t => (
            <div key={t.id} style={{ fontSize: 12, cursor: 'pointer', color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate(`/tasks/${t.id}`)}>
              <span style={{ opacity: t.status === 'done' ? 0.5 : 1, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>☑ {t.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Goals() {
  const { data, createGoal, updateGoal, deleteGoal, showToast } = useApp()
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const goals = data.goals.filter(g => {
    if (typeFilter && g.type !== typeFilter) return false
    if (statusFilter && g.status !== statusFilter) return false
    return true
  })

  const tasksForGoal    = goalId => data.tasks.filter(t => t.goalId === goalId)
  const projectsForGoal = goalId => data.projects.filter(p => p.goalId === goalId)

  const openAdd = () => { setForm(emptyForm()); setShowAdd(true) }
  const openEdit = goal => {
    setEditTarget(goal)
    setForm({ name: goal.name, desc: goal.desc || '', type: goal.type, status: goal.status, start: goal.start || '', due: goal.due || '' })
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { showToast('Goal name is required', 'error'); return }
    setSaving(true)
    await createGoal({
      name: form.name.trim(), description: form.desc, type: form.type, status: form.status,
      start_date: form.start || null, due_date: form.due || null,
    })
    setSaving(false)
    showToast('Goal created!', 'success')
    setShowAdd(false)
  }

  const handleEdit = async () => {
    if (!form.name.trim()) { showToast('Goal name is required', 'error'); return }
    setSaving(true)
    await updateGoal(editTarget.id, {
      name: form.name.trim(), description: form.desc, type: form.type, status: form.status,
      start_date: form.start || null, due_date: form.due || null,
    })
    setSaving(false)
    showToast('Goal updated!', 'success')
    setEditTarget(null)
  }

  const handleDelete = async () => {
    await deleteGoal(deleteTarget.id)
    showToast('Goal deleted', 'success')
    setDeleteTarget(null)
  }

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">🎯 Goals <span className="page-subtitle">({goals.length})</span></span>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Goal
        </button>
      </div>
      <div className="page-content">
        <div className="toolbar">
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="grid-3">
          {goals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              tasks={tasksForGoal(g.id)}
              projects={projectsForGoal(g.id)}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
          {goals.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--slate-400)', fontSize: 13 }}>No goals found.</div>
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Goal"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Create Goal'}</button>
        </>}>
        <GoalForm form={form} set={set} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name || ''}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </>}>
        <GoalForm form={form} set={set} />
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Goal"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={handleDelete}>Delete</button>
        </>}>
        <p style={{ color: 'var(--slate-600)', fontSize: 14, margin: 0 }}>
          Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? Tasks and projects assigned to it will be unassigned, not deleted.
        </p>
      </Modal>
    </div>
  )
}
