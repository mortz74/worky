import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import Avatar from '../components/Avatar'
import MultiSelect from '../components/MultiSelect'
import FileList from '../components/FileList'
import AddFileModal from '../components/AddFileModal'
import ReminderSection from '../components/ReminderSection'

const fmt = d => { if (!d) return '—'; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => { if (!d) return false; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day) < new Date() }

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updateTask, showToast, fetchFilesForTask, addFileToEntity, removeFileFromEntity, setFileArchived } = useApp()
  const t = data.tasks.find(t => t.id === id)
  const [files, setFiles]             = useState([])
  const [showAddFile, setShowAddFile] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft]     = useState('')
  const descRef = useRef(null)

  const loadFiles = useCallback(async () => {
    if (!id) return
    const result = await fetchFilesForTask(id)
    setFiles(result)
  }, [id, fetchFilesForTask])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleAddFile    = async (fileData) => {
    const file = await addFileToEntity('task', id, fileData)
    if (file) { setShowAddFile(false); loadFiles() }
  }
  const handleRemoveFile  = async (fileId) => { await removeFileFromEntity('task', id, fileId); loadFiles() }
  const handleArchiveFile = async (fileId) => { await setFileArchived(fileId, true);  loadFiles() }
  const handleUnarchive   = async (fileId) => { await setFileArchived(fileId, false); loadFiles() }

  if (!t) return <div className="page active"><div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>Task not found.</div></div>

  const projects  = (t.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)
  const o = data.owners.find(o => o.id === t.ownerId)

  const save = async (updates, msg) => {
    const ok = await updateTask(id, updates)
    if (ok && msg) showToast(msg, 'success')
    return ok
  }

  const assigneeOptions = data.assignees.map(a => ({ id: a.id, label: a.name }))

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title" style={{ fontSize: 15 }}>{t.name}</span>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>
      <div className="page-content">
        <div className="detail-grid">

          {/* Left: description + files */}
          <div>
            <div className="card" style={{ padding: 22, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 6 }}>{t.name}</h2>
                  {t.domain && (
                    <span style={{ display: 'inline-block', fontSize: 12, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 10px', borderRadius: 20, fontWeight: 600, marginBottom: 10 }}>
                      🏷 {t.domain}
                    </span>
                  )}
                </div>
                {t.roadmap && <span className="roadmap-flag">🗺 Roadmap</span>}
              </div>

              {/* Description with inline edit */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="form-label" style={{ margin: 0 }}>Description</span>
                  {!editingDesc && (
                    <button
                      onClick={() => { setDescDraft(t.desc || ''); setEditingDesc(true); setTimeout(() => descRef.current?.focus(), 0) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 2, display: 'flex', alignItems: 'center' }}
                      title="Edit description"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {editingDesc ? (
                  <div>
                    <textarea
                      ref={descRef}
                      className="form-textarea"
                      style={{ fontSize: 13.5, lineHeight: 1.6, width: '100%', minHeight: 90 }}
                      value={descDraft}
                      onChange={e => setDescDraft(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
                        onClick={() => { save({ description: descDraft }, 'Description updated'); setEditingDesc(false) }}>
                        Save
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
                        onClick={() => setEditingDesc(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--slate-500)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                    {t.desc || <span style={{ fontStyle: 'italic' }}>No description. Click ✏ to add one.</span>}
                  </p>
                )}
              </div>

              <div className="tags-wrap">
                {(t.tags || []).map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>

            <ReminderSection entityType="task" entityId={id} singleOnly={true} />

            <FileList
              files={files}
              onAdd={() => setShowAddFile(true)}
              onDelete={handleRemoveFile}
              onArchive={handleArchiveFile}
              onUnarchive={handleUnarchive}
            />
            <AddFileModal
              open={showAddFile}
              onClose={() => setShowAddFile(false)}
              onSave={handleAddFile}
            />
          </div>

          {/* Right: inline-editable details */}
          <div>
            <div className="card" style={{ padding: 18, marginBottom: 14 }}>
              <div className="section-title">Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Status</div>
                  <select className="form-select" style={{ fontSize: 13 }}
                    value={t.status}
                    onChange={e => save({ status: e.target.value, ...(e.target.value === 'done' ? { active: false } : {}) }, 'Status updated')}>
                    <option value="todo">Inbox</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Assignees</div>
                  <MultiSelect
                    options={assigneeOptions}
                    value={t.assigneeIds || []}
                    onChange={ids => save({ assignee_ids: ids }, 'Assignees updated')}
                    placeholder="— Unassigned —"
                  />
                </div>

                {o && (
                  <div>
                    <div className="form-label" style={{ marginBottom: 6 }}>Owner</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: o.color, color: '#fff' }}>{o.initials}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Projects</div>
                  <MultiSelect
                    options={data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))}
                    value={t.projectIds || []}
                    onChange={ids => save({ project_ids: ids }, 'Projects updated')}
                    placeholder="— None —"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Start</div>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: 13, padding: '5px 8px' }}
                      value={t.start ? t.start.slice(0, 10) : ''}
                      onChange={e => save({ start_date: e.target.value || null }, 'Start date updated')}
                    />
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Due</div>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: 13, padding: '5px 8px', color: isOverdue(t.due) && t.status !== 'done' ? '#ef4444' : undefined, fontWeight: isOverdue(t.due) && t.status !== 'done' ? 700 : undefined }}
                      value={t.due ? t.due.slice(0, 10) : ''}
                      onChange={e => save({ due_date: e.target.value || null }, 'Due date updated')}
                    />
                  </div>
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Tags</div>
                  <TagsInput key={t.id + (t.tags||[]).join()} initialTags={t.tags || []} onSave={tags => save({ tags }, 'Tags saved')} />
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={t.roadmap} onChange={e => save({ roadmap: e.target.checked }, `Roadmap ${e.target.checked ? 'enabled' : 'disabled'}`)} />
                    Roadmap
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--slate-400)' }}>
                    <input type="checkbox" checked={t.active} readOnly disabled /> Active
                  </label>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function TagsInput({ initialTags, onSave }) {
  const [value, setValue] = useState(initialTags.join(', '))
  return (
    <input className="form-input" style={{ fontSize: 13 }}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onSave(value.split(',').map(s => s.trim()).filter(Boolean))}
      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
      placeholder="tag1, tag2, …"
    />
  )
}
