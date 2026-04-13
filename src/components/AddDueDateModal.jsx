import { useState, useEffect } from 'react'
import Modal from './Modal'

export default function AddDueDateModal({ task, open, onClose, onSave }) {
  const [due, setDue] = useState('')

  useEffect(() => {
    if (task) setDue(task.due ? task.due.slice(0, 10) : '')
  }, [task])

  return (
    <Modal open={open} onClose={onClose} title="Set Due Date"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(due || null)}>Save</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Due Date</label>
        <input className="form-input" type="date" value={due} onChange={e => setDue(e.target.value)} />
      </div>
      {due && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--slate-400)', padding: '4px 0' }} onClick={() => setDue('')}>
            Clear date
          </button>
        </div>
      )}
    </Modal>
  )
}
