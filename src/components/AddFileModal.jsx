import { useState } from 'react'
import Modal from './Modal'

export default function AddFileModal({ open, onClose, onSave }) {
  const [name, setName]   = useState('')
  const [link, setLink]   = useState('')
  const [desc, setDesc]   = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!name.trim())                         e.name = 'File name is required.'
    if (!link.trim())                         e.link = 'Link is required.'
    else if (!link.trim().startsWith('https://')) e.link = 'Link must start with https://'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onSave({ name: name.trim(), link: link.trim(), description: desc.trim() || null })
    setName(''); setLink(''); setDesc(''); setErrors({})
  }

  const handleClose = () => {
    setName(''); setLink(''); setDesc(''); setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add File"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Add File</button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* File Name */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            File Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            className="form-input"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: null })) }}
            placeholder="e.g. Q1 Sales Report"
            autoFocus
          />
          {errors.name && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{errors.name}</div>}
        </div>

        {/* Link */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Google Drive / Sheet Link <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            className="form-input"
            value={link}
            onChange={e => { setLink(e.target.value); setErrors(v => ({ ...v, link: null })) }}
            placeholder="https://docs.google.com/..."
          />
          {errors.link && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{errors.link}</div>}
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Description <span style={{ color: 'var(--slate-400)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </label>
          <input
            className="form-input"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Short description of this file…"
          />
        </div>

      </div>
    </Modal>
  )
}
