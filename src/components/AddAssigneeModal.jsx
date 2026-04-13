import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import Modal from './Modal'
import MultiSelect from './MultiSelect'

export default function AddAssigneeModal({ task, open, onClose, onSave }) {
  const { data } = useApp()
  const [assigneeIds, setAssigneeIds] = useState([])

  useEffect(() => {
    if (task) setAssigneeIds(task.assigneeIds || [])
  }, [task])

  const options = data.assignees.map(a => ({ id: a.id, label: a.name }))

  return (
    <Modal open={open} onClose={onClose} title="Manage Assignees"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(assigneeIds)}>Save</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Assignees</label>
        <MultiSelect options={options} value={assigneeIds} onChange={setAssigneeIds} placeholder="— Unassigned —" />
      </div>
    </Modal>
  )
}
