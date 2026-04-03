import { useState } from 'react'
import { useApp } from '../contexts/AppContext'

export default function Settings() {
  const { data, setOwnerAssignee, createDomain, deleteDomain, showToast } = useApp()
  const [newDomain, setNewDomain] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return
    if (data.domains.some(d => d.name.toLowerCase() === newDomain.trim().toLowerCase())) {
      showToast('Domain already exists', 'error'); return
    }
    setAddingDomain(true)
    await createDomain(newDomain.trim())
    setNewDomain('')
    setAddingDomain(false)
    showToast('Domain added', 'success')
  }
  const currentOwner = data.assignees.find(a => a.isOwner)
  const [selected, setSelected] = useState(currentOwner?.id || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    await setOwnerAssignee(selected)
    setSaving(false)
    const name = data.assignees.find(a => a.id === selected)?.name || 'Assignee'
    showToast(`${name} set as Owner`, 'success')
  }

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Settings</span>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: 560 }}>

          {/* Owner section */}
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>Owner</div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                The owner is highlighted across the app. Only one assignee can be the owner at a time.
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>Select Owner</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  className="form-select"
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  style={{ flex: 1, fontSize: 14 }}
                >
                  <option value="">— Select an assignee —</option>
                  {data.assignees
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.isOwner ? ' ★ (current owner)' : ''}
                      </option>
                    ))
                  }
                </select>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !selected || selected === currentOwner?.id}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Current owner preview */}
            {currentOwner && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg viewBox="0 0 20 16" fill="#f59e0b" width="15" height="12"><path d="M1 14h18v2H1v-2zm1-2L3 4l4 4 3-6 3 6 4-4 1 8H2z"/></svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                  Current owner: {currentOwner.name}
                </span>
              </div>
            )}
          </div>

          {/* Domains section */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>Domains</div>
              <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                Domains categorise your projects and tasks (e.g. Work, Personal). Projects require a domain.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {data.domains.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--slate-400)', padding: '10px 0' }}>No domains yet.</div>
              )}
              {data.domains.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--slate-50)', borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>🏷 {d.name}</span>
                  <button
                    onClick={async () => { await deleteDomain(d.id); showToast(`"${d.name}" deleted`, 'success') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
                    title="Delete domain"
                  >✕</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                style={{ flex: 1, fontSize: 13 }}
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                placeholder="New domain name…"
              />
              <button className="btn btn-primary" onClick={handleAddDomain} disabled={addingDomain || !newDomain.trim()}>
                {addingDomain ? 'Adding…' : '+ Add'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
