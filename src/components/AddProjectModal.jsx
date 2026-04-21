import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import Modal from './Modal'
import MultiSelect from './MultiSelect'

export default function AddProjectModal({ task, open, onClose, onSave }) {
  const { data } = useApp()
  const [projectIds, setProjectIds] = useState([])

  useEffect(() => {
    if (task) setProjectIds(task.projectIds || [])
  }, [task])

  const options = data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))

  return (
    <Modal open={open} onClose={onClose} title="Update Project"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(projectIds)}>Save</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Projects</label>
        <MultiSelect options={options} value={projectIds} onChange={setProjectIds} placeholder="— None —" />
      </div>
    </Modal>
  )
}
