import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'

const BLANK_NEW = { entityType: 'task', entityId: '', remindAt: '', recurrence: 'none', notes: '' }

const RECURRENCE_LABELS = { none: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

const fmtDt = iso => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const isUpcoming = iso => iso && new Date(iso) >= new Date()

const toDatetimeLocal = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past',     label: 'Past' },
  { key: 'task',     label: 'Tasks' },
  { key: 'project',  label: 'Projects' },
]

export default function Reminders() {
  const navigate = useNavigate()
  const { data, createReminder, updateReminder, deleteReminder, showToast } = useApp()
  const [filter, setFilter]   = useState('upcoming')
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState({ remindAt: '', recurrence: 'none', notes: '' })
  const [saving, setSaving]   = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState(BLANK_NEW)
  const [creating, setCreating] = useState(false)
  const [entitySearch, setEntitySearch] = useState('')
  const [entityDropOpen, setEntityDropOpen] = useState(false)
  const entitySearchRef = useRef(null)

  const reminders = data.reminders
    .filter(r => {
      if (filter === 'upcoming') return isUpcoming(r.remindAt)
      if (filter === 'past')     return !isUpcoming(r.remindAt)
      if (filter === 'task')     return r.entityType === 'task'
      if (filter === 'project')  return r.entityType === 'project'
      return true
    })
    .sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt))

  const getEntityName = r => {
    if (r.entityType === 'task') {
      const t = data.tasks.find(t => t.id === r.entityId)
      return t ? t.name : '(deleted task)'
    }
    const p = data.projects.find(p => p.id === r.entityId)
    return p ? `${p.emoji} ${p.name}` : '(deleted project)'
  }

  const getEntityPath = r => r.entityType === 'task' ? `/tasks/${r.entityId}` : `/projects/${r.entityId}`

  const openEdit = r => {
    setEditId(r.id)
    setForm({ remindAt: toDatetimeLocal(r.remindAt), recurrence: r.recurrence, notes: r.notes })
  }

  const handleSave = async () => {
    if (!form.remindAt) { showToast('Please pick a date and time', 'error'); return }
    setSaving(true)
    await updateReminder(editId, { remindAt: new Date(form.remindAt).toISOString(), recurrence: form.recurrence, notes: form.notes })
    showToast('Reminder updated')
    setSaving(false)
    setEditId(null)
  }

  const handleDelete = async id => {
    await deleteReminder(id)
    showToast('Reminder removed')
    if (editId === id) setEditId(null)
  }

  const handleCreate = async () => {
    if (!newForm.entityId)   { showToast('Please select a task or project', 'error'); return }
    if (!newForm.remindAt)   { showToast('Please pick a date and time', 'error'); return }
    setCreating(true)
    await createReminder({ entityType: newForm.entityType, entityId: newForm.entityId, remindAt: new Date(newForm.remindAt).toISOString(), recurrence: newForm.recurrence, notes: newForm.notes })
    showToast('Reminder created!')
    setCreating(false)
    setShowNew(false)
    setNewForm(BLANK_NEW)
  }

  const allEntityOptions = newForm.entityType === 'task' ? data.tasks : data.projects
  const filteredEntityOptions = allEntityOptions.filter(e =>
    e.name.toLowerCase().includes(entitySearch.toLowerCase())
  )
  const selectedEntity = allEntityOptions.find(e => e.id === newForm.entityId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = e => { if (entitySearchRef.current && !entitySearchRef.current.contains(e.target)) setEntityDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const counts = {
    all:      data.reminders.length,
    upcoming: data.reminders.filter(r => isUpcoming(r.remindAt)).length,
    past:     data.reminders.filter(r => !isUpcoming(r.remindAt)).length,
    task:     data.reminders.filter(r => r.entityType === 'task').length,
    project:  data.reminders.filter(r => r.entityType === 'project').length,
  }

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">🔔 Reminders</span>
        <button className="btn btn-primary" onClick={() => { setNewForm(BLANK_NEW); setEntitySearch(''); setEntityDropOpen(false); setShowNew(true) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Reminder
        </button>
      </div>

      {/* New Reminder Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNew(false)}>
          <div className="mini-modal" style={{ background: '#fff', borderRadius: 14, padding: 24, minWidth: 400, maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>New Reminder</div>

            {/* Entity Type Toggle */}
            <div className="form-group">
              <div className="form-label" style={{ marginBottom: 6 }}>For a</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['task', 'project'].map(type => (
                  <button key={type} onClick={() => { setNewForm(f => ({ ...f, entityType: type, entityId: '' })); setEntitySearch(''); setEntityDropOpen(false) }}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: '1.5px solid', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      borderColor: newForm.entityType === type ? 'var(--blue-500)' : 'var(--slate-200)',
                      background: newForm.entityType === type ? 'var(--blue-50)' : 'transparent',
                      color: newForm.entityType === type ? 'var(--blue-700)' : 'var(--slate-500)',
                    }}>
                    {type === 'task' ? '☑️ Task' : '📁 Project'}
                  </button>
                ))}
              </div>
            </div>

            {/* Entity Picker — searchable */}
            <div className="form-group">
              <div className="form-label" style={{ marginBottom: 4 }}>{newForm.entityType === 'task' ? 'Task' : 'Project'} *</div>
              <div ref={entitySearchRef} style={{ position: 'relative' }}>
                {/* Selected value / search input */}
                <div
                  style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--slate-200)', borderRadius: 6, background: '#fff', cursor: 'text', overflow: 'hidden' }}
                  onClick={() => { setEntityDropOpen(true); setTimeout(() => entitySearchRef.current?.querySelector('input')?.focus(), 0) }}
                >
                  {selectedEntity && !entityDropOpen && (
                    <span style={{ flex: 1, padding: '8px 12px', fontSize: 13.5, color: 'var(--slate-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedEntity.emoji ? `${selectedEntity.emoji} ` : ''}{selectedEntity.name}
                    </span>
                  )}
                  <input
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '9px 12px', fontSize: 13.5, color: 'var(--slate-800)', background: 'transparent', display: (selectedEntity && !entityDropOpen) ? 'none' : 'block', width: '100%' }}
                    placeholder={selectedEntity ? selectedEntity.name : `Search ${newForm.entityType}s…`}
                    value={entitySearch}
                    onChange={e => { setEntitySearch(e.target.value); setEntityDropOpen(true) }}
                    onFocus={() => setEntityDropOpen(true)}
                  />
                  {selectedEntity && (
                    <button
                      onClick={e => { e.stopPropagation(); setNewForm(f => ({ ...f, entityId: '' })); setEntitySearch(''); setEntityDropOpen(false) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px', color: 'var(--slate-400)', fontSize: 16, lineHeight: 1 }}
                    >×</button>
                  )}
                </div>

                {/* Dropdown list */}
                {entityDropOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,.12)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
                    {filteredEntityOptions.length === 0 ? (
                      <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--slate-400)', textAlign: 'center' }}>No results</div>
                    ) : filteredEntityOptions.map(e => (
                      <div
                        key={e.id}
                        onClick={() => { setNewForm(f => ({ ...f, entityId: e.id })); setEntitySearch(''); setEntityDropOpen(false) }}
                        style={{
                          padding: '9px 14px', fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                          background: newForm.entityId === e.id ? 'var(--blue-50)' : 'transparent',
                          color: newForm.entityId === e.id ? 'var(--blue-700)' : 'var(--slate-800)',
                        }}
                        onMouseEnter={ev => { if (newForm.entityId !== e.id) ev.currentTarget.style.background = 'var(--slate-50)' }}
                        onMouseLeave={ev => { ev.currentTarget.style.background = newForm.entityId === e.id ? 'var(--blue-50)' : 'transparent' }}
                      >
                        {e.emoji && <span>{e.emoji}</span>}
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                        {newForm.entityId === e.id && <span style={{ color: 'var(--blue-500)', fontSize: 16 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date/Time + Recurrence */}
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="form-label" style={{ marginBottom: 4 }}>Date &amp; Time *</div>
                <input type="datetime-local" className="form-input" style={{ fontSize: 13 }} value={newForm.remindAt} onChange={e => setNewForm(f => ({ ...f, remindAt: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div className="form-label" style={{ marginBottom: 4 }}>Recurrence</div>
                <select className="form-select" style={{ fontSize: 13 }} value={newForm.recurrence} onChange={e => setNewForm(f => ({ ...f, recurrence: e.target.value }))}>
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <div className="form-label" style={{ marginBottom: 4 }}>Notes (optional)</div>
              <input className="form-input" style={{ fontSize: 13 }} placeholder="e.g. Follow up on status" value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Saving…' : '+ Add Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="page-content">

        <div className="page-tabs" style={{ marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button key={f.key} className={`page-tab${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="page-tab-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {reminders.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--slate-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No reminders</div>
            <div style={{ fontSize: 13 }}>
              {filter === 'upcoming' ? 'No upcoming reminders. Add one from any task or project.' : 'Nothing to show here.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reminders.map(r => {
              const name     = getEntityName(r)
              const path     = getEntityPath(r)
              const upcoming = isUpcoming(r.remindAt)
              const isEditing = editId === r.id

              return (
                <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Main row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                    borderLeft: `4px solid ${upcoming ? 'var(--blue-500)' : 'var(--slate-200)'}`,
                  }}>
                    <div style={{ fontSize: 20, flexShrink: 0 }}>🔔</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <button
                          onClick={() => navigate(path)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'var(--slate-900)', textAlign: 'left' }}
                        >
                          {name}
                        </button>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
                          background: r.entityType === 'task' ? 'var(--blue-50)' : 'var(--slate-100)',
                          color: r.entityType === 'task' ? 'var(--blue-600)' : 'var(--slate-500)',
                          padding: '2px 7px', borderRadius: 20,
                        }}>{r.entityType}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: upcoming ? 'var(--blue-700)' : 'var(--slate-400)' }}>
                          {fmtDt(r.remindAt)}
                        </span>
                        {r.recurrence !== 'none' && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--blue-100)', color: 'var(--blue-700)', padding: '2px 7px', borderRadius: 20 }}>
                            ↻ {RECURRENCE_LABELS[r.recurrence]}
                          </span>
                        )}
                        {!upcoming && <span style={{ fontSize: 11, color: 'var(--slate-400)', fontStyle: 'italic' }}>past</span>}
                        {r.notes && <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{r.notes}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => isEditing ? setEditId(null) : openEdit(r)}
                        style={{ background: isEditing ? 'var(--blue-50)' : 'none', border: '1px solid ' + (isEditing ? 'var(--blue-200)' : 'var(--slate-200)'), borderRadius: 6, cursor: 'pointer', fontSize: 12, padding: '4px 10px', color: 'var(--slate-600)', fontWeight: 600 }}
                      >
                        {isEditing ? 'Cancel' : '✏️ Edit'}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        style={{ background: 'none', border: '1px solid var(--slate-200)', borderRadius: 6, cursor: 'pointer', fontSize: 13, padding: '4px 8px', color: 'var(--slate-400)' }}
                        title="Delete reminder"
                      >🗑</button>
                    </div>
                  </div>

                  {/* Inline edit form — opens on first click */}
                  {isEditing && (
                    <div style={{ padding: '14px 18px', borderTop: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <div className="form-label" style={{ marginBottom: 4 }}>Date &amp; Time</div>
                          <input
                            type="datetime-local"
                            className="form-input"
                            style={{ fontSize: 13 }}
                            value={form.remindAt}
                            onChange={e => setForm(f => ({ ...f, remindAt: e.target.value }))}
                          />
                        </div>
                        <div>
                          <div className="form-label" style={{ marginBottom: 4 }}>Recurrence</div>
                          <select className="form-select" style={{ fontSize: 13 }} value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
                            <option value="none">One-time</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div className="form-label" style={{ marginBottom: 4 }}>Notes (optional)</div>
                        <input
                          className="form-input"
                          style={{ fontSize: 13 }}
                          placeholder="e.g. Follow up on status update"
                          value={form.notes}
                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setEditId(null)}>Cancel</button>
                        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSave} disabled={saving}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
