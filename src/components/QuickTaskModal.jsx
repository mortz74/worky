import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import Modal from './Modal'
import MultiSelect from './MultiSelect'

export default function QuickTaskModal({ open, onClose, defaultProjectIds = [], defaultAssigneeIds = [] }) {
  const { data, createTask, showToast, user } = useApp()
  const [name, setName] = useState('')
  const [projectIds, setProjectIds] = useState(defaultProjectIds)
  const [assigneeIds, setAssigneeIds] = useState(defaultAssigneeIds)
  const [saving, setSaving] = useState(false)

  // Sync defaults when they change (e.g. modal reopens with different context)
  useEffect(() => { setProjectIds(defaultProjectIds) }, [defaultProjectIds.join(',')])
  useEffect(() => { setAssigneeIds(defaultAssigneeIds) }, [defaultAssigneeIds.join(',')])

  const reset = () => {
    setName('')
    setProjectIds(defaultProjectIds)
    setAssigneeIds(defaultAssigneeIds)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!name.trim()) { showToast('Task name is required', 'error'); return }
    setSaving(true)
    const inheritedDomain = projectIds.length > 0
      ? (data.projects.find(p => p.id === projectIds[0])?.domain || null)
      : null
    const task = await createTask({
      user_id: user.id,
      name: name.trim(),
      description: '',
      status: 'todo',   // Quick Task → Inbox (todo)
      active: true,
      roadmap: false,
      assignee_ids: assigneeIds,
      project_ids: projectIds,
      domain: inheritedDomain || null,
      owner_id: null,
      start_date: null,
      due_date: null,
      tags: [],
    })
    setSaving(false)
    if (task) { showToast('Task added to Inbox!', 'success'); handleClose() }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
  }

  const projectOptions = data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))
  const assigneeOptions = data.assignees.map(a => ({ id: a.id, label: a.name }))

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Quick Task"
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Add to Inbox'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Task Name *</label>
        <input
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="What needs to be done?"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Projects</label>
          <MultiSelect options={projectOptions} value={projectIds} onChange={setProjectIds} placeholder="— None —" />
        </div>
        <div className="form-group">
          <label className="form-label">Assignees</label>
          <MultiSelect options={assigneeOptions} value={assigneeIds} onChange={setAssigneeIds} placeholder="— Unassigned —" />
        </div>
      </div>
    </Modal>
  )
}
