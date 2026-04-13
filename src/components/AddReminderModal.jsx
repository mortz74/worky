import { useState, useEffect } from 'react'
import Modal from './Modal'

export default function AddReminderModal({ task, open, onClose, onSave }) {
  const [remindAt, setRemindAt]     = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [notes, setNotes]           = useState('')

  useEffect(() => {
    if (open) { setRemindAt(''); setRecurrence('none'); setNotes('') }
  }, [open])

  const toDatetimeLocal = () => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add Reminder — ${task?.name || ''}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ remindAt, recurrence, notes })}>Set Reminder</button>
        </>
      }>
      <div className="form-group">
        <label className="form-label">Date &amp; Time</label>
        <input className="form-input" type="datetime-local" value={remindAt || toDatetimeLocal()}
          onChange={e => setRemindAt(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Recurrence</label>
        <select className="form-select" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
          <option value="none">One-time</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Notes (optional)</label>
        <input className="form-input" placeholder="e.g. Follow up on status" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}
