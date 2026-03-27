import { useApp } from '../contexts/AppContext'

export default function Owners() {
  const { data, user } = useApp()

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Owners <span className="page-subtitle">({data.owners.length})</span></span>
      </div>
      <div className="page-content">
        <div className="grid-3">
          {data.owners.map(o => {
            const tasks = data.tasks.filter(t => t.ownerId === o.id)
            const open = tasks.filter(t => t.status !== 'done').length
            const isMe = o.userId === user?.id

            return (
              <div key={o.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div className="avatar" style={{ width: 52, height: 52, fontSize: 19, background: o.color, color: '#fff', flexShrink: 0 }}>{o.initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                      {isMe && <span className="badge badge-active" style={{ fontSize: 10, padding: '2px 6px', flexShrink: 0 }}>You</span>}
                    </div>
                    {o.email && <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.email}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--slate-500)' }}>
                  <span><strong>{tasks.length}</strong> tasks</span>
                  <span><strong>{open}</strong> open</span>
                  <span><strong>{tasks.length - open}</strong> done</span>
                </div>
              </div>
            )
          })}
          {data.owners.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--slate-400)', fontSize: 13 }}>
              No owners found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
