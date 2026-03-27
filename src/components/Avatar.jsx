import { useState } from 'react'
import { useApp } from '../contexts/AppContext'

// Accepts either assigneeId (string) OR assignee (object) directly
export default function Avatar({ assigneeId, assignee: assigneeProp, size = 28 }) {
  const { getAssignee } = useApp()
  const [imgError, setImgError] = useState(false)
  const a = assigneeProp || getAssignee(assigneeId)
  if (!a) return null

  const style = {
    width: size, height: size, fontSize: size * 0.4,
    background: a.color, color: '#fff', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, flexShrink: 0, overflow: 'hidden',
  }

  if (a.photoUrl && !imgError) {
    return (
      <div style={style}>
        <img
          src={a.photoUrl}
          alt={a.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return <div style={style}>{a.initials}</div>
}
