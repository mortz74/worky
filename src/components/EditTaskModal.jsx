import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import Modal from './Modal'
import MultiSelect from './MultiSelect'

export default function EditTaskModal({ task: t, open, onClose, onSave }) {
  const { data } = useApp()
  const [form, setForm] = useState({
    name: t.name,
    desc: t.desc || '',
    projectIds: t.projectIds || (t.projectId ? [t.projectId] : []),
    assigneeIds: t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []),
    ownerId: t.ownerId || '',
    status: t.status,
    start: t.start || '',
    due: t.due || '',
    tags: (t.tags || []).join(', '),
    roadmap: t.roadmap,
    domain: t.domain || '',
  })
  const [saving, setSaving] = useState(false)
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
    if (!form.name.trim()) return
    setSaving(true)
    const effectiveDomain = inheritedDomain !== null ? inheritedDomain : form.domain
    const ok = await onSave({
      name: form.name.trim(),
      description: form.desc,
      assignee_ids: form.assigneeIds,
      project_ids: form.projectIds,
      owner_id: form.ownerId || null,
      status: form.status,
      start_date: form.start || null,
      due_date: form.due || null,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      roadmap: form.roadmap,
      domain: effectiveDomain || null,
      ...(form.status === 'done' ? { active: false } : {}),
    }, 'Task updated!')
    setSaving(false)
    if (ok) onClose()
  }

  const assigneeOptions = data.assignees.map(a => ({ id: a.id, label: a.name }))
  const projectOptions  = data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))

  return (
    <Modal open={open} onClose={onClose} title="Edit Task"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </>}>
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
            onChange={handleProjectChange}
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
        <input className="form-input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="tag1, tag2, …" />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.roadmap} onChange={e => set('roadmap', e.target.checked)} />
        Add to Roadmap
      </label>
    </Modal>
  )
}
