import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { sb } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import FileList from '../components/FileList'
import AddFileModal from '../components/AddFileModal'
import QuickTaskModal from '../components/QuickTaskModal'

const fmt = d => { if (!d) return '—'; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => { if (!d) return false; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day) < new Date() }
const toDatetimeLocal = iso => { if (!iso) return ''; const d = new Date(iso); const pad = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }

function AddDueDateModal({ task, open, onClose, onSave }) {
  const [due, setDue] = useState('')
  useEffect(() => { if (open) setDue(task?.due ? task.due.slice(0, 10) : '') }, [open, task])
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="mini-modal" style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 320, boxShadow: '0 8px 40px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Add Due Date</div>
        <div style={{ marginBottom: 16 }}>
          <div className="form-label" style={{ marginBottom: 4 }}>Due Date</div>
          <input type="date" className="form-input" value={due} onChange={e => setDue(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(due ? due + 'T00:00:00.000Z' : null)}>Save</button>
        </div>
      </div>
    </div>
  )
}

function AddReminderModal({ task, open, onClose, onSave }) {
  const [remindAt, setRemindAt] = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [notes, setNotes] = useState('')
  useEffect(() => { if (open) { setRemindAt(''); setRecurrence('none'); setNotes('') } }, [open])
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="mini-modal" style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Add Reminder — {task?.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>Date &amp; Time</div>
            <input type="datetime-local" className="form-input" style={{ fontSize: 13 }} value={remindAt} onChange={e => setRemindAt(e.target.value)} />
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>Recurrence</div>
            <select className="form-select" style={{ fontSize: 13 }} value={recurrence} onChange={e => setRecurrence(e.target.value)}>
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="form-label" style={{ marginBottom: 4 }}>Notes (optional)</div>
          <input className="form-input" style={{ fontSize: 13 }} placeholder="e.g. Follow up on status" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (!remindAt) return; onSave({ remindAt: new Date(remindAt).toISOString(), recurrence, notes }) }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ task, open, onClose, onConfirm }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="mini-modal" style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 320, boxShadow: '0 8px 40px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete Task?</div>
        <div style={{ fontSize: 13, color: 'var(--slate-600)', marginBottom: 20 }}>"{task?.name}" will be permanently deleted.</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316']
const getInitials = name => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

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
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: 72, height: 72, borderRadius: 10, flexShrink: 0,
          background: displaySrc ? 'transparent' : color,
          border: '2px dashed var(--slate-300)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
        }}
        title="Click to upload photo"
      >
        {displaySrc
          ? <img src={displaySrc} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{initials || '?'}</span>}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 10,
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
          <button type="button" className="btn btn-sm btn-ghost" style={{ color: '#ef4444', marginLeft: 6 }} onClick={onRemove}>Remove</button>
        )}
        <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 5 }}>JPG, PNG or GIF · max 5 MB</div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoChange(f) }} />
    </div>
  )
}

function AssigneeForm({ form, set, photoPreview, existingPhotoUrl, onPhotoChange, onRemovePhoto }) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Photo</label>
        <PhotoPicker
          photoPreview={photoPreview} existingPhotoUrl={existingPhotoUrl}
          color={form.color} initials={form.name ? getInitials(form.name) : '?'}
          onPhotoChange={onPhotoChange} onRemove={onRemovePhoto}
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
      <div className="form-group">
        <label className="form-label">Notes Link</label>
        <input className="form-input" type="url" value={form.notesUrl} onChange={e => set('notesUrl', e.target.value)} placeholder="https://docs.google.com/…" />
      </div>
      {!photoPreview && !existingPhotoUrl && (
        <div className="form-group">
          <label className="form-label">Avatar Colour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <div key={c} onClick={() => set('color', c)} style={{
                width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                border: form.color === c ? '3px solid var(--slate-900)' : '3px solid transparent',
              }} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const TABS = [
  { key: 'tasks',   label: 'Tasks' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'all',     label: 'All Tasks' },
]

export default function AssigneeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updateAssignee, updateTask, deleteTask, createReminder, showToast, user, fetchFilesForAssignee, addFileToEntity, removeFileFromEntity, setFileArchived } = useApp()

  const [activeTab, setActiveTab]     = useState('tasks')
  const [files, setFiles]             = useState([])
  const [showAddFile, setShowAddFile] = useState(false)
  const [showQuick, setShowQuick]     = useState(false)
  const [taskMenuId, setTaskMenuId]   = useState(null)
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 })
  const [addDueDateTask, setAddDueDateTask] = useState(null)
  const [addReminderTask, setAddReminderTask] = useState(null)
  const [deleteTaskId, setDeleteTaskId] = useState(null)

  const openTaskMenu = (e, taskId) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setTaskMenuId(taskId)
  }

  // Edit state
  const [showEdit, setShowEdit]       = useState(false)
  const [form, setForm]               = useState({ name: '', email: '', dept: '', notes: '', notesUrl: '', color: COLORS[0] })
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [removePhoto, setRemovePhoto] = useState(false)
  const [saving, setSaving]           = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const resetPhoto = () => { setPhotoFile(null); setPhotoPreview(''); setRemovePhoto(false) }

  const loadFiles = useCallback(async () => {
    const result = await fetchFilesForAssignee(id)
    setFiles(result)
  }, [id, fetchFilesForAssignee])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleAddFile      = async (fileData) => {
    const file = await addFileToEntity('assignee', id, fileData)
    if (file) { setShowAddFile(false); loadFiles() }
  }
  const handleRemoveFile   = async (fileId) => { await removeFileFromEntity('assignee', id, fileId); loadFiles() }
  const handleArchiveFile  = async (fileId) => { await setFileArchived(fileId, true);  loadFiles() }
  const handleUnarchiveFile = async (fileId) => { await setFileArchived(fileId, false); loadFiles() }

  const openEdit = (a) => {
    setForm({ name: a.name, email: a.email || '', dept: a.dept || '', notes: a.notes || '', notesUrl: a.notesUrl || '', color: a.color || COLORS[0] })
    resetPhoto()
    setShowEdit(true)
  }

  const handleEdit = async (a) => {
    if (!form.name.trim()) { showToast('Name is required', 'error'); return }
    setSaving(true)
    let photoUrl = a.photoUrl || ''
    if (photoFile) {
      photoUrl = await uploadPhoto(photoFile, user.id, showToast) || photoUrl
    } else if (removePhoto) {
      photoUrl = ''
    }
    await updateAssignee(id, {
      name: form.name.trim(),
      email: form.email,
      dept: form.dept,
      notes: form.notes,
      notes_url: form.notesUrl.trim() || null,
      color: form.color,
      initials: getInitials(form.name),
      photo_url: photoUrl,
    })
    setSaving(false)
    showToast('Assignee updated!', 'success')
    setShowEdit(false)
    resetPhoto()
  }

  const a = data.assignees.find(a => a.id === id)
  if (!a) return (
    <div className="page active">
      <div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>Assignee not found.</div>
    </div>
  )

  const tasks   = data.tasks.filter(t => (t.assigneeIds || []).includes(id))
  const open    = tasks.filter(t => t.status !== 'done')
  const done    = tasks.filter(t => t.status === 'done')
  const overdue = tasks.filter(t => isOverdue(t.due) && t.status !== 'done')

  const byStatus = {
    todo:       tasks.filter(t => t.status === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    review:     tasks.filter(t => t.status === 'review').length,
    blocked:    tasks.filter(t => t.status === 'blocked').length,
    done:       done.length,
  }

  const tabFilter = t => {
    switch (activeTab) {
      case 'tasks':   return t.status === 'inprogress' && !t.roadmap
      case 'roadmap': return !!t.roadmap
      default:        return true
    }
  }

  const filteredTasks = tasks.filter(tabFilter)
  const tabCount = key => tasks.filter(t => {
    switch (key) {
      case 'tasks':   return t.status === 'inprogress' && !t.roadmap
      case 'roadmap': return !!t.roadmap
      default:        return true
    }
  }).length

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Assignee Detail</span>
        <button className="btn btn-primary" onClick={() => setShowQuick(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Quick Task
        </button>
        <button className="btn btn-secondary" onClick={() => openEdit(a)}>✏️ Edit</button>
        <button className="btn btn-secondary" onClick={() => navigate('/assignees')}>← Back</button>
      </div>
      <QuickTaskModal open={showQuick} onClose={() => setShowQuick(false)} defaultAssigneeIds={[id]} />
      <div className="page-content">
        <div className="detail-grid">

          {/* Left column */}
          <div>
            {/* Profile card */}
            <div className="card" style={{ padding: 22, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 22 }}>
              {/* Square photo */}
              <Avatar assignee={a} size={120} shape="square" />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 4 }}>{a.name}</div>
                {a.dept  && <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 2 }}>{a.dept}</div>}
                {a.email && <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{a.email}</div>}
                {a.notes && <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 8, fontStyle: 'italic' }}>{a.notes}</div>}
                {a.notesUrl && (
                  <a
                    href={a.notesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 13, color: 'var(--blue-600)', textDecoration: 'none', fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Notes
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="stats-mini-grid">
              {[
                { label: 'Total Tasks', value: tasks.length,   color: 'var(--blue-500)' },
                { label: 'Open',        value: open.length,    color: '#f59e0b' },
                { label: 'Overdue',     value: overdue.length, color: '#ef4444' },
                { label: 'Done',        value: done.length,    color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Task table with tabs */}
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
              <div className="page-tabs" style={{ margin: 0, padding: '0 18px', borderBottom: '2px solid var(--slate-200)' }}>
                {TABS.map(tab => (
                  <button key={tab.key} className={`page-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                    {tab.label}
                    <span className="page-tab-count">{tabCount(tab.key)}</span>
                  </button>
                ))}
              </div>
              <div className="table-scroll"><table className="task-table">
                <thead>
                  <tr><th>Task</th><th>Project</th><th>Status</th><th>Due</th><th style={{ width: 40 }}></th></tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0
                    ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--slate-400)', fontSize: 13 }}>No tasks in this view.</td></tr>
                    : filteredTasks.map(t => {
                        const projs = (t.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)
                        const projLabel = projs.length === 0 ? '—'
                          : projs.length === 1 ? `${projs[0].emoji} ${projs[0].name}`
                          : `${projs[0].emoji} ${projs[0].name} +${projs.length - 1}`
                        const hasReminder = data.reminders.some(r => r.entityType === 'task' && r.entityId === t.id)
                        const menuOpen = taskMenuId === t.id
                        return (
                          <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 600 }}>{t.name}{hasReminder && <span title="Has reminder" style={{ marginLeft: 6, fontSize: 12 }}>🔔</span>}</td>
                            <td style={{ fontSize: 12, color: 'var(--slate-500)' }}>{projLabel}</td>
                            <td><StatusBadge status={t.status} /></td>
                            <td style={{ fontSize: 12, color: isOverdue(t.due) && t.status !== 'done' ? '#ef4444' : 'var(--slate-500)', fontWeight: isOverdue(t.due) && t.status !== 'done' ? 700 : 400 }}>
                              {fmt(t.due)}
                            </td>
                            <td style={{ width: 40 }} onClick={e => e.stopPropagation()}>
                              <button
                                className="btn btn-icon"
                                onClick={e => openTaskMenu(e, menuOpen ? null : t.id)}
                                style={{ padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
                                title="More actions"
                              >
                                <svg viewBox="0 0 16 4" fill="currentColor" width="16" height="4"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="14" cy="2" r="1.5"/></svg>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table></div>
            </div>

            {/* Files section */}
            <FileList
              files={files}
              onAdd={() => setShowAddFile(true)}
              onDelete={handleRemoveFile}
              onArchive={handleArchiveFile}
              onUnarchive={handleUnarchiveFile}
            />
            <AddFileModal open={showAddFile} onClose={() => setShowAddFile(false)} onSave={handleAddFile} />
          </div>

          {/* Right: status breakdown */}
          <div className="card" style={{ padding: 18 }}>
            <div className="section-title">Status Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <StatusBadge status={status} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate-700)' }}>{count}</span>
                </div>
              ))}
            </div>
            {tasks.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6 }}>
                  <span>Completion</span>
                  <span>{done.length}/{tasks.length}</span>
                </div>
                <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${Math.round(done.length / tasks.length * 100)}%`, background: '#10b981', borderRadius: 3, transition: 'width .3s' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {taskMenuId && (() => {
        const t = data.tasks.find(t => t.id === taskMenuId)
        const menuItems = [
          { icon: '✅', label: 'Mark Done', onClick: () => { updateTask(taskMenuId, { status: 'done' }); setTaskMenuId(null) } },
          { divider: true },
          { icon: '📅', label: 'Add Due Date', onClick: () => { setAddDueDateTask(t); setTaskMenuId(null) } },
          { icon: '🔔', label: 'Add Reminder', onClick: () => { setAddReminderTask(t); setTaskMenuId(null) } },
          { divider: true },
          { icon: '🗺', label: 'Add to Roadmap', onClick: () => { updateTask(taskMenuId, { roadmap: true }); setTaskMenuId(null) } },
          { divider: true },
          { icon: '✏️', label: 'Edit', onClick: () => { navigate(`/tasks/${taskMenuId}`); setTaskMenuId(null) } },
          { icon: '🗑️', label: 'Delete', danger: true, onClick: () => { setDeleteTaskId(taskMenuId); setTaskMenuId(null) } },
        ]
        return (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setTaskMenuId(null)} />
            <div className="dropdown-menu open" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 100, minWidth: 210 }}>
              {menuItems.map((item, i) =>
                item.divider
                  ? <div key={i} className="dropdown-divider" />
                  : <div key={i} className="dropdown-item" style={item.danger ? { color: '#ef4444' } : {}} onClick={item.onClick}>
                      {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}{item.label}
                    </div>
              )}
            </div>
          </>
        )
      })()}
      <AddDueDateModal
        task={addDueDateTask}
        open={!!addDueDateTask}
        onClose={() => setAddDueDateTask(null)}
        onSave={async due => { await updateTask(addDueDateTask.id, { due }); showToast('Due date saved'); setAddDueDateTask(null) }}
      />
      <AddReminderModal
        task={addReminderTask}
        open={!!addReminderTask}
        onClose={() => setAddReminderTask(null)}
        onSave={async ({ remindAt, recurrence, notes }) => { await createReminder({ entityType: 'task', entityId: addReminderTask.id, remindAt, recurrence, notes }); showToast('Reminder set'); setAddReminderTask(null) }}
      />
      <DeleteConfirmModal
        task={data.tasks.find(t => t.id === deleteTaskId)}
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={async () => { await deleteTask(deleteTaskId); showToast('Task deleted'); setDeleteTaskId(null) }}
      />

      {/* Edit modal */}
      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); resetPhoto() }}
        title={`Edit — ${a.name}`}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => { setShowEdit(false); resetPhoto() }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => handleEdit(a)} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        }
      >
        <AssigneeForm
          form={form} set={set}
          photoPreview={photoPreview}
          existingPhotoUrl={removePhoto ? '' : (a.photoUrl || '')}
          onPhotoChange={f => { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); setRemovePhoto(false) }}
          onRemovePhoto={() => { resetPhoto(); setRemovePhoto(true) }}
        />
      </Modal>
    </div>
  )
}
