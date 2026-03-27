import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'

const fmt = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = useApp()
  const p = data.projects.find(p => p.id === id)
  if (!p) return <div className="page active"><div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>Project not found.</div></div>
  const tasks = data.tasks.filter(t => (t.projectIds || []).includes(id))
  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">{p.emoji} {p.name}</span>
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>← Back</button>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
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
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="task-table">
                <thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Due</th></tr></thead>
                <tbody>
                  {tasks.length === 0
                    ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: 'var(--slate-400)', fontSize: 13 }}>No tasks in this project.</td></tr>
                    : tasks.map(t => {
                        const assignees = (t.assigneeIds || []).map(aid => data.assignees.find(a => a.id === aid)).filter(Boolean)
                        const firstA = assignees[0]
                        const moreA = assignees.length - 1
                        return (
                          <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 600 }}>{t.name}</td>
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
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>
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
    </div>
  )
}
