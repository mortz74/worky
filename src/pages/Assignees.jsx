import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { sb } from '../lib/supabase'
import Modal from '../components/Modal'
import Avatar from '../components/Avatar'

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316']

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Upload a photo file to Supabase Storage, return the public URL (or null on error)
async function uploadPhoto(file, userId, showToast) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
  if (error) { showToast('Photo upload failed: ' + error.message, 'error'); return null }
  const { data } = sb.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

function PhotoPicker({ photoPreview, existingPhotoUrl, color, initials, onPhotoChange, onRemove }) {
  const fileRef = useRef(null)
  const displaySrc = photoPreview || existingPhotoUrl

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
      {/* Circle preview */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: displaySrc ? 'transparent' : color,
          border: '2px dashed var(--slate-300)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative', transition: 'border-color .15s',
        }}
        title="Click to upload photo"
      >
        {displaySrc
          ? <img src={displaySrc} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{initials || '?'}</span>
        }
        {/* Overlay hint */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="20" height="20">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      </div>

      <div>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
          📷 {displaySrc ? 'Change Photo' : 'Upload Photo'}
        </button>
        {displaySrc && (
          <button type="button" className="btn btn-sm btn-ghost" style={{ color: '#ef4444', marginLeft: 6 }} onClick={onRemove}>
            Remove
          </button>
        )}
        <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 5 }}>JPG, PNG or GIF · max 5 MB</div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoChange(f) }}
      />
    </div>
  )
}

function AssigneeForm({ form, set, photoPreview, existingPhotoUrl, onPhotoChange, onRemovePhoto }) {
  return (
    <>
      {/* Photo */}
      <div className="form-group">
        <label className="form-label">Photo</label>
        <PhotoPicker
          photoPreview={photoPreview}
          existingPhotoUrl={existingPhotoUrl}
          color={form.color}
          initials={form.name ? getInitials(form.name) : '?'}
          onPhotoChange={onPhotoChange}
          onRemove={onRemovePhoto}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" />
      </div>
      <div className="form-group">
        <label className="form-label">Department</label>
        <input className="form-input" value={form.dept} onChange={e => set('dept', e.target.value)} placeholder="Engineering" />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>

      {/* Colour picker — used as fallback when no photo */}
      {!photoPreview && !existingPhotoUrl && (
        <div className="form-group">
          <label className="form-label">Avatar Colour (used when no photo)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => set('color', c)} style={{
                width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                border: form.color === c ? '3px solid var(--slate-900)' : '3px solid transparent',
                transition: 'border .15s',
              }} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default function Assignees() {
  const { data, createAssignee, updateAssignee, showToast, user } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', dept: '', notes: '', color: COLORS[0] })
  const [photoFile, setPhotoFile] = useState(null)      // File object to upload
  const [photoPreview, setPhotoPreview] = useState('')  // object URL for preview
  const [removePhoto, setRemovePhoto] = useState(false) // flag to clear existing photo
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filtered = data.assignees.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))

  const resetPhoto = () => { setPhotoFile(null); setPhotoPreview(''); setRemovePhoto(false) }

  const handlePhotoChange = (file) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  const handleRemovePhoto = () => { resetPhoto(); setRemovePhoto(true) }

  const openAdd = () => {
    setForm({ name: '', email: '', dept: '', notes: '', color: COLORS[data.assignees.length % COLORS.length] })
    resetPhoto()
    setShowAdd(true)
  }

  const openEdit = (e, assignee) => {
    e.stopPropagation()
    setEditTarget(assignee)
    setForm({ name: assignee.name, email: assignee.email || '', dept: assignee.dept || '', notes: assignee.notes || '', color: assignee.color || COLORS[0] })
    resetPhoto()
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'error'); return }
    setSaving(true)
    let photoUrl = ''
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile, user.id, showToast) || ''
    }
    await createAssignee({
      user_id: user.id,
      name: form.name.trim(),
      email: form.email,
      dept: form.dept,
      notes: form.notes,
      color: form.color,
      initials: getInitials(form.name),
      photo_url: photoUrl,
    })
    setSaving(false)
    showToast('Assignee added!', 'success')
    setShowAdd(false)
    resetPhoto()
  }

  const handleEdit = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'error'); return }
    setSaving(true)
    let photoUrl = editTarget.photoUrl || ''
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile, user.id, showToast) || photoUrl
    } else if (removePhoto) {
      photoUrl = ''
    }
    await updateAssignee(editTarget.id, {
      name: form.name.trim(),
      email: form.email,
      dept: form.dept,
      notes: form.notes,
      color: form.color,
      initials: getInitials(form.name),
      photo_url: photoUrl,
    })
    setSaving(false)
    showToast('Assignee updated!', 'success')
    setEditTarget(null)
    resetPhoto()
  }

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Assignees <span className="page-subtitle">({filtered.length})</span></span>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Assignee
        </button>
      </div>
      <div className="page-content">
        <div className="toolbar">
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-input" placeholder="Search assignees…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="grid-3">
          {filtered.map(a => {
            const tasks = data.tasks.filter(t => t.assigneeId === a.id)
            const open = tasks.filter(t => t.status !== 'done').length
            return (
              <div key={a.id} className="card" style={{ padding: 20, cursor: 'pointer', position: 'relative' }}
                onClick={() => navigate(`/assignees/${a.id}`)}>
                <button
                  onClick={e => openEdit(e, a)}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'var(--slate-100)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', color: 'var(--slate-500)', fontWeight: 600 }}
                  title="Edit assignee">
                  ✏️ Edit
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <Avatar assignee={a} size={48} />
                  <div style={{ minWidth: 0, paddingRight: 56 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                    {a.dept && <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{a.dept}</div>}
                    {a.email && <div style={{ fontSize: 12, color: 'var(--slate-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--slate-500)' }}>
                  <span><strong>{tasks.length}</strong> tasks</span>
                  <span><strong>{open}</strong> open</span>
                  <span><strong>{tasks.length - open}</strong> done</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--slate-400)', fontSize: 13 }}>No assignees yet.</div>}
        </div>
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetPhoto() }} title="Add Assignee"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowAdd(false); resetPhoto() }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Uploading…' : 'Add Assignee'}</button>
        </>}>
        <AssigneeForm
          form={form} set={set}
          photoPreview={photoPreview}
          existingPhotoUrl=""
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={handleRemovePhoto}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); resetPhoto() }} title={`Edit — ${editTarget?.name || ''}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setEditTarget(null); resetPhoto() }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Uploading…' : 'Save Changes'}</button>
        </>}>
        <AssigneeForm
          form={form} set={set}
          photoPreview={photoPreview}
          existingPhotoUrl={removePhoto ? '' : (editTarget?.photoUrl || '')}
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={handleRemovePhoto}
        />
      </Modal>
    </div>
  )
}
