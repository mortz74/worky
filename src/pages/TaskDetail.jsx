import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import EditTaskModal from '../components/EditTaskModal'
import Avatar from '../components/Avatar'
import MultiSelect from '../components/MultiSelect'

const fmt = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => d && new Date(d) < new Date()

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updateTask, showToast } = useApp()
  const t = data.tasks.find(t => t.id === id)
  const [showEdit, setShowEdit] = useState(false)

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
        <button className="btn btn-primary" onClick={() => setShowEdit(true)}>✏️ Edit Task</button>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* Left: description + files */}
          <div>
            <div className="card" style={{ padding: 22, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 6 }}>{t.name}</h2>
                  <p style={{ color: 'var(--slate-500)', fontSize: 13.5, lineHeight: 1.6 }}>{t.desc || 'No description.'}</p>
                </div>
                {t.roadmap && <span className="roadmap-flag">🗺 Roadmap</span>}
              </div>
              <div className="tags-wrap">
                {(t.tags || []).map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div className="section-title">📎 Attachments</div>
              <div className="attach-zone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, color: 'var(--slate-300)', margin: '0 auto 6px', display: 'block' }}>
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
                <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>Click to attach files</div>
              </div>
              {(t.files || []).length === 0 && <div style={{ fontSize: 12.5, color: 'var(--slate-400)', marginTop: 8 }}>No files attached.</div>}
            </div>
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
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
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
                  {projects.length === 0
                    ? <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>—</div>
                    : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {projects.map(p => (
                          <span key={p.id} style={{
                            fontSize: 12, background: 'var(--blue-50)', color: 'var(--blue-700)',
                            padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                          }}>{p.emoji} {p.name}</span>
                        ))}
                      </div>
                  }
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Start</div>
                    <div style={{ fontSize: 13, color: 'var(--slate-600)' }}>{fmt(t.start)}</div>
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Due</div>
                    <div style={{ fontSize: 13, color: isOverdue(t.due) && t.status !== 'done' ? '#ef4444' : 'var(--slate-600)', fontWeight: isOverdue(t.due) && t.status !== 'done' ? 700 : 400 }}>
                      {fmt(t.due)}
                    </div>
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

      <EditTaskModal key={t.id} task={t} open={showEdit} onClose={() => setShowEdit(false)} onSave={save} />
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
