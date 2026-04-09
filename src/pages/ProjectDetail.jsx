import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import FileList from '../components/FileList'
import AddFileModal from '../components/AddFileModal'
import QuickTaskModal from '../components/QuickTaskModal'

const fmt = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }

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
  const { data, updateTask, deleteTask, createReminder, showToast, fetchFilesForProject, addFileToEntity, removeFileFromEntity, setFileArchived } = useApp()
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
        <button className="btn btn-primary" onClick={() => setShowQuick(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Quick Task
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>← Back</button>
      </div>
      <QuickTaskModal open={showQuick} onClose={() => setShowQuick(false)} defaultProjectIds={[id]} />
      <div className="page-content">
        <div className="detail-grid">
          <div>
            <div className="card" style={{ padding: 22, marginBottom: 16 }}>
              <p style={{ color: 'var(--slate-600)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 14 }}>{p.desc || 'No description.'}</p>
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
              <div className="page-tabs" style={{ margin: 0, padding: '0 18px', borderBottom: '2px solid var(--slate-200)' }}>
                {TABS.map(tab => (
                  <button key={tab.key} className={`page-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                    {tab.label}
                    <span className="page-tab-count">{tabCount(tab.key)}</span>
                  </button>
                ))}
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
          <div className="card" style={{ padding: 18, height: 'fit-content' }}>
            <div className="section-title">Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><div className="form-label" style={{ marginBottom: 4 }}>Status</div><StatusBadge status={p.status} /></div>
              <div><div className="form-label" style={{ marginBottom: 4 }}>Start</div><div style={{ fontSize: 13 }}>{fmt(p.start)}</div></div>
              <div><div className="form-label" style={{ marginBottom: 4 }}>Due</div><div style={{ fontSize: 13 }}>{fmt(p.due)}</div></div>
              <div><div className="form-label" style={{ marginBottom: 4 }}>Tasks</div><div style={{ fontSize: 13 }}>{tasks.length} total · {done} done</div></div>
            </div>
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
    </div>
  )
}
