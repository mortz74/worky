import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { sb } from '../lib/supabase'
import Modal from '../components/Modal'

const EMOJIS = ['📁','🚀','💡','🛠','📊','🎯','🧩','🌱','🔥','⭐','🏗','📱']

// Upload project cover photo to Supabase Storage
async function uploadProjectPhoto(file, userId, showToast) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `project-covers/${userId}/${Date.now()}.${ext}`
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
  if (error) { showToast('Photo upload failed: ' + error.message, 'error'); return null }
  const { data } = sb.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

function ProjectForm({ form, set, photoPreview, onPhotoChange, onRemovePhoto, domains = [] }) {
  const fileRef = useRef(null)
  const displaySrc = photoPreview || form.photoUrl

  return (
    <>
      {/* Project Type toggle */}
      <div className="form-group">
        <label className="form-label">Project Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: 'project', label: '📅 Project', sub: 'Has start & end dates' },
            { value: 'action',  label: '⚡ Action',  sub: 'Long-term, no dates' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('projectType', opt.value)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                border: form.projectType === opt.value ? '2px solid var(--blue-500)' : '2px solid var(--slate-200)',
                background: form.projectType === opt.value ? 'var(--blue-50)' : 'var(--slate-50)',
                textAlign: 'left', transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: form.projectType === opt.value ? 'var(--blue-700)' : 'var(--slate-700)' }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Domain <span style={{ color: '#ef4444' }}>*</span></label>
        <select className="form-select" value={form.domain} onChange={e => set('domain', e.target.value)}>
          <option value="">— Select domain —</option>
          {domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Project Name *</label>
        <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={form.desc} onChange={e => set('desc', e.target.value)} rows={3} />
      </div>

      {/* Dates — only for Project type */}
      {form.projectType === 'project' && (
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
      )}

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

      {/* Background image picker */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Background Image</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Preview */}
          <div style={{
            width: 80, height: 48, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
            background: displaySrc ? `url(${displaySrc}) center/cover no-repeat` : 'linear-gradient(135deg, #1e40af, #3b82f6)',
            border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {!displaySrc && <span style={{ fontSize: 20 }}>{form.emoji}</span>}
          </div>
          <div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
              🖼 {displaySrc ? 'Change Image' : 'Upload Image'}
            </button>
            {displaySrc && (
              <button type="button" className="btn btn-sm btn-ghost" style={{ color: '#ef4444', marginLeft: 6 }} onClick={onRemovePhoto}>
                Remove
              </button>
            )}
            <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 4 }}>JPG, PNG · max 5 MB</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoChange(f) }} />
      </div>
    </>
  )
}

const emptyForm = () => ({ name: '', desc: '', start: '', due: '', status: 'active', emoji: '📁', tags: '', projectType: 'project', photoUrl: '', domain: '' })

// Group label component
function GroupLabel({ label, count }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--slate-200)', color: 'var(--slate-500)', borderRadius: 10, padding: '1px 7px' }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--slate-200)' }} />
    </div>
  )
}

export default function Projects() {
  const { data, createProject, updateProject, showToast, user } = useApp()
  const [domainF, setDomainF] = useState('')
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [removePhoto, setRemovePhoto]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const resetPhoto = () => { setPhotoFile(null); setPhotoPreview(''); setRemovePhoto(false) }

  const handlePhotoChange = (file) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  const filtered = data.projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusF && p.status !== statusF) return false
    if (domainF && p.domain !== domainF) return false
    return true
  })

  const projectItems = filtered.filter(p => p.projectType !== 'action')
  const actionItems  = filtered.filter(p => p.projectType === 'action')

  const openAdd = () => { setForm(emptyForm()); resetPhoto(); setShowAdd(true) }

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
      projectType: project.projectType || 'project',
      photoUrl: project.photoUrl || '',
      domain: project.domain || '',
    })
    resetPhoto()
  }

  const resolvePhotoUrl = async (existingUrl) => {
    if (photoFile) return await uploadProjectPhoto(photoFile, user.id, showToast) || existingUrl
    if (removePhoto) return ''
    return existingUrl
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { showToast('Project name is required', 'error'); return }
    if (!form.domain) { showToast('Domain is required', 'error'); return }
    setSaving(true)
    const photoUrl = await resolvePhotoUrl('')
    await createProject({
      user_id: user.id,
      name: form.name.trim(),
      description: form.desc,
      start_date: form.projectType === 'project' ? (form.start || null) : null,
      due_date:   form.projectType === 'project' ? (form.due   || null) : null,
      status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      emoji: form.emoji || '📁',
      project_type: form.projectType,
      photo_url: photoUrl || null,
      domain: form.domain || null,
    })
    setSaving(false)
    showToast('Project created!', 'success')
    setShowAdd(false)
    resetPhoto()
  }

  const handleEdit = async () => {
    if (!form.name.trim()) { showToast('Project name is required', 'error'); return }
    if (!form.domain) { showToast('Domain is required', 'error'); return }
    setSaving(true)
    const photoUrl = await resolvePhotoUrl(editTarget.photoUrl || '')
    await updateProject(editTarget.id, {
      name: form.name.trim(),
      description: form.desc,
      start_date: form.projectType === 'project' ? (form.start || null) : null,
      due_date:   form.projectType === 'project' ? (form.due   || null) : null,
      status: form.status,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      emoji: form.emoji || '📁',
      project_type: form.projectType,
      photo_url: photoUrl || null,
      domain: form.domain || null,
    })
    setSaving(false)
    showToast('Project updated!', 'success')
    setEditTarget(null)
    resetPhoto()
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
          <select className="filter-select" value={domainF} onChange={e => setDomainF(e.target.value)}>
            <option value="">All Domains</option>
            {data.domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="archive">Archived</option>
          </select>
        </div>

        <div className="grid-3">
          {/* Projects group */}
          {projectItems.length > 0 && <GroupLabel label="Projects" count={projectItems.length} />}
          {projectItems.map(p => (
            <ProjectCard
              key={p.id} project={p}
              onOpen={() => navigate(`/projects/${p.id}`)}
              onEdit={e => openEdit(e, p)}
              onToggle={() => updateProject(p.id, { status: p.status === 'active' ? 'archive' : 'active' })}
            />
          ))}

          {/* Actions group */}
          {actionItems.length > 0 && <GroupLabel label="Actions" count={actionItems.length} />}
          {actionItems.map(p => (
            <ProjectCard
              key={p.id} project={p}
              onOpen={() => navigate(`/projects/${p.id}`)}
              onEdit={e => openEdit(e, p)}
              onToggle={() => updateProject(p.id, { status: p.status === 'active' ? 'archive' : 'active' })}
            />
          ))}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--slate-400)', fontSize: 13 }}>No projects found.</div>
          )}
        </div>
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetPhoto() }} title="New Project"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { setShowAdd(false); resetPhoto() }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Create Project'}</button>
          </div>
        }>
        <ProjectForm form={form} set={set} photoPreview={photoPreview} onPhotoChange={handlePhotoChange} onRemovePhoto={() => { resetPhoto(); setRemovePhoto(true) }} domains={data.domains} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); resetPhoto() }} title={`Edit — ${editTarget?.name || ''}`}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { setEditTarget(null); resetPhoto() }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        }>
        <ProjectForm form={form} set={set} photoPreview={photoPreview} onPhotoChange={handlePhotoChange} onRemovePhoto={() => { resetPhoto(); setRemovePhoto(true) }} domains={data.domains} />
      </Modal>
    </div>
  )
}

function ProjectCard({ project: p, onOpen, onEdit, onToggle }) {
  const { data } = useApp()
  const tasks = data.tasks.filter(t => (t.projectIds || []).includes(p.id))
  const done  = tasks.filter(t => t.status === 'done').length
  const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0

  const headerBg = p.photoUrl
    ? `url(${p.photoUrl}) center/cover no-repeat`
    : 'linear-gradient(135deg, #1e40af, #3b82f6)'

  return (
    <div className="card project-card" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={onOpen}>
      {/* Header: background image or gradient */}
      <div style={{ height: 88, background: headerBg, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 8px 8px', position: 'relative' }}>
        {/* Scrim for readability when photo is set */}
        {p.photoUrl && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,.45) 100%)' }} />
        )}
        {/* Emoji + type badge — bottom left */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 24 }}>{p.emoji}</span>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
            background: p.projectType === 'action' ? 'rgba(245,158,11,.9)' : 'rgba(255,255,255,.85)',
            color: p.projectType === 'action' ? '#fff' : 'var(--slate-700)',
            padding: '2px 7px', borderRadius: 10,
          }}>
            {p.projectType === 'action' ? '⚡ Action' : '📅 Project'}
          </span>
        </div>
        {/* Edit button — top right */}
        <button onClick={onEdit} style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600, color: 'var(--slate-700)' }}>
          ✏️ Edit
        </button>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {p.domain && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--blue-50)', color: 'var(--blue-600)', padding: '2px 7px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>{p.domain}</span>}
            <span className={`badge ${p.status === 'active' ? 'badge-active' : 'badge-archive'} badge-dot`}>{p.status === 'active' ? 'Active' : 'Archived'}</span>
          </div>
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
