import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import Modal from '../components/Modal'

const EMOJIS = ['📁','🚀','💡','🛠','📊','🎯','🧩','🌱','🔥','⭐','🏗','📱']

function ProjectForm({ form, set }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Project Name *</label>
        <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.desc} onChange={e => set('desc', e.target.value)} rows={3} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Start</label>
          <input className="form-input" type="date" value={form.start} onChange={e => set('start', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Due</label>
          <input className="form-input" type="date" value={form.due} onChange={e => set('due', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="archive">Archived</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tags (comma separated)</label>
          <input className="form-input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="tag1, tag2" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Emoji</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EMOJIS.map(em => (
            <button key={em} type="button" onClick={() => set('emoji', em)} style={{
              fontSize: 22, background: form.emoji === em ? 'var(--blue-100)' : 'var(--slate-50)',
              border: form.emoji === em ? '2px solid var(--blue-400)' : '2px solid var(--slate-200)',
              borderRadius: 8, width: 40, height: 40, cursor: 'pointer', transition: 'all .15s',
            }}>{em}</button>
          ))}
        </div>
      </div>
    </>
  )
}

const emptyForm = () => ({ name: '', desc: '', start: '', due: '', status: 'active', emoji: '📁', tags: '' })

export default function Projects() {
  const { data, createProject, updateProject, showToast, user } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = data.projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusF && p.status !== statusF) return false
    return true
  })

  const openAdd = () => { setForm(emptyForm()); setShowAdd(true) }

  const openEdit = (e, project) => {
    e.stopPropagation()
    setEditTarget(project)
    setForm({
      name: project.name,
      desc: project.desc || '',
      start: project.start || '',
      due: project.due || '',
      status: project.status,
      emoji: project.emoji || '📁',
      tags: (project.tags || []).join(', '),
    })
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { showToast('Project name is required', 'error'); return }
    setSaving(true)
    await createProject({
      user_id: user.id, name: form.name.trim(), description: form.desc,
      start_date: form.start || null, due_date: form.due || null, status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), emoji: form.emoji || '📁',
    })
    setSaving(false)
    showToast('Project created!', 'success')
    setShowAdd(false)
  }

  const handleEdit = async () => {
    if (!form.name.trim()) { showToast('Project name is required', 'error'); return }
    setSaving(true)
    await updateProject(editTarget.id, {
      name: form.name.trim(),
      description: form.desc,
      start_date: form.start || null,
      due_date: form.due || null,
      status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      emoji: form.emoji || '📁',
    })
    setSaving(false)
    showToast('Project updated!', 'success')
    setEditTarget(null)
  }

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Projects <span className="page-subtitle">({filtered.length})</span></span>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>
      <div className="page-content">
        <div className="toolbar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="archive">Archived</option>
          </select>
        </div>

        <div className="grid-3">
          {filtered.map(p => (
            <ProjectCard
              key={p.id} project={p}
              onOpen={() => navigate(`/projects/${p.id}`)}
              onEdit={e => openEdit(e, p)}
              onToggle={() => updateProject(p.id, { status: p.status === 'active' ? 'archive' : 'active' })}
            />
          ))}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--slate-400)', fontSize: 13 }}>No projects found.</div>}
        </div>
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Project"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Create Project'}</button>
        </>}>
        <ProjectForm form={form} set={set} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name || ''}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </>}>
        <ProjectForm form={form} set={set} />
      </Modal>
    </div>
  )
}

function ProjectCard({ project: p, onOpen, onEdit, onToggle }) {
  const { data } = useApp()
  const tasks = data.tasks.filter(t => t.projectId === p.id)
  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0

  return (
    <div className="card project-card" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={onOpen}>
      <div style={{ height: 80, background: `linear-gradient(135deg, #1e40af, #3b82f6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, position: 'relative' }}>
        {p.emoji}
        <button onClick={onEdit} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600, color: 'var(--slate-700)' }}>✏️ Edit</button>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
          <span className={`badge ${p.status === 'active' ? 'badge-active' : 'badge-archive'} badge-dot`}>{p.status === 'active' ? 'Active' : 'Archived'}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 10, lineHeight: 1.5 }}>{p.desc || 'No description.'}</p>
        {tasks.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 4, background: 'var(--slate-100)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blue-500)', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>{done}/{tasks.length} tasks done</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); onToggle() }}>
            {p.status === 'active' ? '📦 Archive' : '✅ Restore'}
          </button>
        </div>
      </div>
    </div>
  )
}
