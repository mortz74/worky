import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import FileList from '../components/FileList'
import AddFileModal from '../components/AddFileModal'
import QuickTaskModal from '../components/QuickTaskModal'
import AddAssigneeModal from '../components/AddAssigneeModal'

const fmt = d => { if (!d) return '—'; const [y,m,day] = d.slice(0,10).split('-').map(Number); return new Date(y, m-1, day).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }

const TABS = [
  { key: 'tasks',   label: 'Tasks' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'all',     label: 'All Tasks' },
]

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

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, updateTask, updateProject, deleteTask, createReminder, showToast, fetchFilesForProject, addFileToEntity, removeFileFromEntity, setFileArchived, isAdmin, projectCollaborators, addProjectCollaborator, removeProjectCollaborator, setProjectTaskVisibility, currentAssigneeId } = useApp()
  const [activeTab, setActiveTab]     = useState('tasks')
  const [files, setFiles]             = useState([])
  const [showAddFile, setShowAddFile] = useState(false)
  const [showQuick, setShowQuick]     = useState(false)
  const [taskMenuId, setTaskMenuId]   = useState(null)
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 })
  const [addDueDateTask, setAddDueDateTask] = useState(null)
  const [addReminderTask, setAddReminderTask] = useState(null)
  const [deleteTaskId, setDeleteTaskId] = useState(null)
  const [addAssigneeTask, setAddAssigneeTask] = useState(null)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft]     = useState('')
  const descRef = useRef(null)

  const openTaskMenu = (e, taskId) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setTaskMenuId(taskId)
  }

  const loadFiles = useCallback(async () => {
    const result = await fetchFilesForProject(id)
    setFiles(result)
  }, [id, fetchFilesForProject])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleAddFile    = async (fileData) => {
    const file = await addFileToEntity('project', id, fileData)
    if (file) { setShowAddFile(false); loadFiles() }
  }
  const handleRemoveFile  = async (fileId) => { await removeFileFromEntity('project', id, fileId); loadFiles() }
  const handleArchiveFile = async (fileId) => { await setFileArchived(fileId, true);  loadFiles() }
  const handleUnarchive   = async (fileId) => { await setFileArchived(fileId, false); loadFiles() }

  const p = data.projects.find(p => p.id === id)
  if (!p) return <div className="page active"><div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>Project not found.</div></div>

  const saveProject = async (updates, msg) => {
    const ok = await updateProject(id, updates)
    if (ok && msg) showToast(msg, 'success')
    return ok
  }

  const tasks = data.tasks.filter(t => (t.projectIds || []).includes(id))
  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0

  const tabFilter = t => {
    switch (activeTab) {
      case 'tasks':   return t.status !== 'done' && !t.roadmap
      case 'roadmap': return !!t.roadmap
      default:        return true
    }
  }
  const filteredTasks = tasks.filter(tabFilter)
  const tabCount = key => tasks.filter(t => {
    switch (key) {
      case 'tasks':   return t.status !== 'done' && !t.roadmap
      case 'roadmap': return !!t.roadmap
      default:        return true
    }
  }).length

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">{p.emoji} {p.name}</span>
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>← Back</button>
      </div>
      <QuickTaskModal open={showQuick} onClose={() => setShowQuick(false)} defaultProjectIds={[id]} />
      <div className="page-content">
        <div className="detail-grid">
          <div>
            <div className="card" style={{ padding: 22, marginBottom: 16 }}>
              {/* Name + domain */}
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 6 }}>{p.emoji} {p.name}</h2>
              {p.domain && (
                <span style={{ display: 'inline-block', fontSize: 12, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 10px', borderRadius: 20, fontWeight: 600, marginBottom: 10 }}>
                  🏷 {p.domain}
                </span>
              )}

              {/* Inline description */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="form-label" style={{ margin: 0 }}>Description</span>
                  {!editingDesc && (
                    <button
                      onClick={() => { setDescDraft(p.desc || ''); setEditingDesc(true); setTimeout(() => descRef.current?.focus(), 0) }}
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
                        onClick={() => { saveProject({ description: descDraft }, 'Description updated'); setEditingDesc(false) }}>
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
                    {p.desc || <span style={{ fontStyle: 'italic' }}>No description. Click ✏ to add one.</span>}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6 }}>
                  <span>Progress</span><span>{done}/{tasks.length} tasks done</span>
                </div>
                <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blue-500)', borderRadius: 3, transition: 'width .3s' }} />
                </div>
              </div>
              {(p.tags || []).length > 0 && <div className="tags-wrap">{p.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div>}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
              <div className="page-tabs" style={{ margin: 0, padding: '0 18px', borderBottom: '2px solid var(--slate-200)', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flex: 1 }}>
                  {TABS.map(tab => (
                    <button key={tab.key} className={`page-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                      {tab.label}
                      <span className="page-tab-count">{tabCount(tab.key)}</span>
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setShowQuick(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Quick Task
                </button>
              </div>
              <div className="table-scroll"><table className="task-table">
                <thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Due</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {filteredTasks.length === 0
                    ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--slate-400)', fontSize: 13 }}>No tasks in this view.</td></tr>
                    : filteredTasks.map(t => {
                        const assignees = (t.assigneeIds || []).map(aid => data.assignees.find(a => a.id === aid)).filter(Boolean)
                        const firstA = assignees[0]
                        const moreA = assignees.length - 1
                        const hasReminder = data.reminders.some(r => r.entityType === 'task' && r.entityId === t.id)
                        const menuOpen = taskMenuId === t.id
                        return (
                          <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 600 }}>{t.name}{hasReminder && <span title="Has reminder" style={{ marginLeft: 6, fontSize: 12 }}>🔔</span>}</td>
                            <td>
                              {firstA
                                ? <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <Avatar assigneeId={firstA.id} size={24} />
                                    {firstA.name}{moreA > 0 ? ` +${moreA}` : ''}
                                  </div>
                                : '—'
                              }
                            </td>
                            <td><StatusBadge status={t.status} /></td>
                            <td style={{ fontSize: 12 }}>{fmt(t.due)}</td>
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
              onUnarchive={handleUnarchive}
            />
            <AddFileModal
              open={showAddFile}
              onClose={() => setShowAddFile(false)}
              onSave={handleAddFile}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 18, height: 'fit-content' }}>
              <div className="section-title">Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Status</div>
                  <select className="form-select" style={{ fontSize: 13 }}
                    value={p.status || ''}
                    onChange={e => saveProject({ status: e.target.value }, 'Status updated')}>
                    <option value="active">Active</option>
                    <option value="inprogress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                    <option value="archive">Archive</option>
                  </select>
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Start</div>
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: 13, padding: '5px 8px' }}
                    value={p.start ? p.start.slice(0, 10) : ''}
                    onChange={e => saveProject({ start_date: e.target.value || null }, 'Start date updated')}
                  />
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Due</div>
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: 13, padding: '5px 8px' }}
                    value={p.due ? p.due.slice(0, 10) : ''}
                    onChange={e => saveProject({ due_date: e.target.value || null }, 'Due date updated')}
                  />
                </div>

                <div>
                  <div className="form-label" style={{ marginBottom: 4 }}>Tasks</div>
                  <div style={{ fontSize: 13, color: 'var(--slate-600)' }}>{tasks.length} total · {done} done</div>
                </div>

              </div>
            </div>

            {/* Collaborators card — admin only */}
            {isAdmin && (
              <CollaboratorsCard
                project={p}
                projectCollaborators={projectCollaborators.filter(c => c.projectId === id)}
                assignees={data.assignees}
                onAdd={addProjectCollaborator}
                onRemove={removeProjectCollaborator}
                onVisibilityChange={setProjectTaskVisibility}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      </div>
      {taskMenuId && (() => {
        const t = data.tasks.find(t => t.id === taskMenuId)
        const ownerAssignee = data.assignees.find(a => a.id === currentAssigneeId)
        const alreadyOwner = ownerAssignee && (t.assigneeIds || []).includes(ownerAssignee.id)
        const menuItems = [
          { icon: '🔄', label: 'Mark In Progress', onClick: () => { updateTask(taskMenuId, { status: 'inprogress' }); setTaskMenuId(null) } },
          { icon: '✅', label: 'Mark Done', onClick: () => { updateTask(taskMenuId, { status: 'done' }); setTaskMenuId(null) } },
          ...(ownerAssignee && !alreadyOwner ? [{ icon: '👤', label: `Add Assignee to ${ownerAssignee.name}`, onClick: () => { updateTask(taskMenuId, { assignee_ids: [...(t.assigneeIds || []), ownerAssignee.id] }); setTaskMenuId(null) } }] : []),
          { icon: '➕', label: 'Add Assignee', onClick: () => { setAddAssigneeTask(t); setTaskMenuId(null) } },
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
      <AddAssigneeModal
        task={addAssigneeTask}
        open={!!addAssigneeTask}
        onClose={() => setAddAssigneeTask(null)}
        onSave={async (assigneeIds) => { await updateTask(addAssigneeTask.id, { assignee_ids: assigneeIds }); showToast('Assignees updated'); setAddAssigneeTask(null) }}
      />
    </div>
  )
}

// ── Collaborators sidebar card ─────────────────────────────
function CollaboratorsCard({ project, projectCollaborators, assignees, onAdd, onRemove, onVisibilityChange, showToast }) {
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
  const [adding, setAdding] = useState(false)

  const collabAssigneeIds = new Set(projectCollaborators.map(c => c.assigneeId))
  const addableAssignees = assignees.filter(a => !collabAssigneeIds.has(a.id))

  const handleAdd = async () => {
    if (!selectedAssigneeId) return
    setAdding(true)
    const result = await onAdd(project.id, selectedAssigneeId)
    if (result) { showToast('Collaborator added', 'success'); setSelectedAssigneeId('') }
    setAdding(false)
  }

  const handleVisibility = async (v) => {
    await onVisibilityChange(project.id, v)
    showToast(v === 'all' ? 'Collaborators can now see all tasks' : 'Collaborators see only assigned tasks', 'success')
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="section-title" style={{ marginBottom: 12 }}>Collaborators</div>

      {/* Task visibility toggle */}
      <div style={{ marginBottom: 14 }}>
        <div className="form-label" style={{ marginBottom: 6 }}>Task Visibility</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { value: 'assigned_only', label: 'Assigned Only', desc: 'See only their tasks' },
            { value: 'all',           label: 'All Tasks',     desc: 'See every task + auto-assigned' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleVisibility(opt.value)}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                border: project.taskVisibility === opt.value ? '2px solid var(--blue-500)' : '2px solid var(--slate-200)',
                background: project.taskVisibility === opt.value ? 'var(--blue-50)' : 'var(--slate-50)',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: project.taskVisibility === opt.value ? 'var(--blue-700)' : 'var(--slate-700)' }}>{opt.label}</div>
              <div style={{ fontSize: 10, color: 'var(--slate-400)', marginTop: 2 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Collaborator list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {projectCollaborators.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--slate-400)', padding: '4px 0' }}>No collaborators yet.</div>
        )}
        {projectCollaborators.map(c => {
          const a = assignees.find(x => x.id === c.assigneeId)
          if (!a) return null
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--slate-50)', borderRadius: 8, border: '1px solid var(--slate-200)' }}>
              <Avatar assignee={a} size={26} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{a.name}</div>
              <button
                onClick={async () => { await onRemove(c.id); showToast('Collaborator removed', 'success') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', fontSize: 12, padding: '2px 4px', borderRadius: 4 }}
                title="Remove collaborator"
              >✕</button>
            </div>
          )
        })}
      </div>

      {/* Add collaborator */}
      {addableAssignees.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            className="form-select"
            style={{ flex: 1, fontSize: 12 }}
            value={selectedAssigneeId}
            onChange={e => setSelectedAssigneeId(e.target.value)}
          >
            <option value="">— Add collaborator —</option>
            {addableAssignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '5px 10px', whiteSpace: 'nowrap' }}
            onClick={handleAdd}
            disabled={adding || !selectedAssigneeId}
          >
            {adding ? '…' : '+ Add'}
          </button>
        </div>
      )}
    </div>
  )
}
