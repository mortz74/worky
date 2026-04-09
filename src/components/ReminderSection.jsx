import { useState } from 'react'
import { useApp } from '../contexts/AppContext'

const RECURRENCE_LABELS = { none: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

const fmtDt = iso => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Convert ISO timestamptz to datetime-local input format (YYYY-MM-DDTHH:MM)
const toDatetimeLocal = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const isUpcoming = iso => iso && new Date(iso) >= new Date()

export default function ReminderSection({ entityType, entityId, singleOnly = false }) {
  const { data, createReminder, updateReminder, deleteReminder, showToast } = useApp()
  const reminders = data.reminders.filter(r => r.entityType === entityType && r.entityId === entityId)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null) // reminder id being edited
  const [form, setForm]         = useState({ remindAt: '', recurrence: 'none', notes: '' })
  const [saving, setSaving]     = useState(false)

  const openAdd = () => {
    setEditing(null)
    setForm({ remindAt: '', recurrence: 'none', notes: '' })
    setShowForm(true)
  }

  const openEdit = (r) => {
    setEditing(r.id)
    setForm({ remindAt: toDatetimeLocal(r.remindAt), recurrence: r.recurrence, notes: r.notes })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.remindAt) { showToast('Please pick a date and time', 'error'); return }
    setSaving(true)
    const remindAtIso = new Date(form.remindAt).toISOString()
    if (editing) {
      await updateReminder(editing, { remindAt: remindAtIso, recurrence: form.recurrence, notes: form.notes })
      showToast('Reminder updated')
    } else {
      await createReminder({ entityType, entityId, remindAt: remindAtIso, recurrence: form.recurrence, notes: form.notes })
      showToast('Reminder set')
    }
    setSaving(false)
    setShowForm(false)
    setEditing(null)
  }

  const handleDelete = async (id) => {
    await deleteReminder(id)
    showToast('Reminder removed')
  }

  const canAdd = !singleOnly || reminders.length === 0

  return (
    <div className="card" style={{ padding: 18, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: reminders.length > 0 || showForm ? 14 : 0 }}>
        <div className="section-title" style={{ margin: 0 }}>🔔 Reminders</div>
        {canAdd && !showForm && (
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={openAdd}>
            + Add Reminder
          </button>
        )}
      </div>

      {/* Existing reminders */}
      {reminders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: showForm ? 14 : 0 }}>
          {reminders.map(r => (
            <div key={r.id} style={{
              background: isUpcoming(r.remindAt) ? 'var(--blue-50)' : 'var(--slate-50)',
              border: `1px solid ${isUpcoming(r.remindAt) ? 'var(--blue-200)' : 'var(--slate-200)'}`,
              borderRadius: 8, padding: '10px 12px',
              display: 'flex', alignItems: 'flex-start', gap: 10
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isUpcoming(r.remindAt) ? 'var(--blue-700)' : 'var(--slate-500)' }}>
                    {fmtDt(r.remindAt)}
                  </span>
                  {r.recurrence !== 'none' && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, background: 'var(--blue-100)', color: 'var(--blue-700)',
                      padding: '2px 7px', borderRadius: 20
                    }}>↻ {RECURRENCE_LABELS[r.recurrence]}</span>
                  )}
                  {!isUpcoming(r.remindAt) && (
                    <span style={{ fontSize: 11, color: 'var(--slate-400)', fontStyle: 'italic' }}>past</span>
                  )}
                </div>
                {r.notes && <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{r.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--slate-400)', padding: '2px 4px' }} title="Edit">✏️</button>
                <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--slate-400)', padding: '2px 4px' }} title="Delete">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
          <div>
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
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</button>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Set Reminder'}
            </button>
          </div>
        </div>
      )}

      {reminders.length === 0 && !showForm && (
        <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>No reminders set.</div>
      )}
    </div>
  )
}
