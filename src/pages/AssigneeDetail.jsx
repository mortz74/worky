import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'

const fmt = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) }
const isOverdue = d => d && new Date(d) < new Date()

export default function AssigneeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = useApp()

  const a = data.assignees.find(a => a.id === id)
  if (!a) return (
    <div className="page active">
      <div className="page-content" style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>Assignee not found.</div>
    </div>
  )

  const tasks = data.tasks.filter(t => (t.assigneeIds || []).includes(id))
  const open = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done')
  const overdue = tasks.filter(t => isOverdue(t.due) && t.status !== 'done')

  const byStatus = {
    todo: tasks.filter(t => t.status === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    review: tasks.filter(t => t.status === 'review').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    done: done.length,
  }

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Assignee Detail</span>
        <button className="btn btn-secondary" onClick={() => navigate('/assignees')}>← Back</button>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>

          {/* Left: task list */}
          <div>
            {/* Profile card */}
            <div className="card" style={{ padding: 22, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20 }}>
              <Avatar assignee={a} size={72} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', marginBottom: 4 }}>{a.name}</div>
                {a.dept && <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 2 }}>{a.dept}</div>}
                {a.email && <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>{a.email}</div>}
                {a.notes && <div style={{ fontSize: 13, color: 'var(--slate-600)', marginTop: 8, fontStyle: 'italic' }}>{a.notes}</div>}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Tasks', value: tasks.length, color: 'var(--blue-500)' },
                { label: 'Open', value: open.length, color: '#f59e0b' },
                { label: 'Overdue', value: overdue.length, color: '#ef4444' },
                { label: 'Done', value: done.length, color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Task table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--slate-100)', fontWeight: 700, fontSize: 13 }}>
                Tasks ({tasks.length})
              </div>
              <table className="task-table">
                <thead>
                  <tr><th>Task</th><th>Project</th><th>Status</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {tasks.length === 0
                    ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: 'var(--slate-400)', fontSize: 13 }}>No tasks assigned.</td></tr>
                    : tasks.map(t => {
                        const projs = (t.projectIds || []).map(pid => data.projects.find(p => p.id === pid)).filter(Boolean)
                        const projLabel = projs.length === 0 ? '—'
                          : projs.length === 1 ? `${projs[0].emoji} ${projs[0].name}`
                          : `${projs[0].emoji} ${projs[0].name} +${projs.length - 1}`
                        return (
                          <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 600 }}>{t.name}</td>
                            <td style={{ fontSize: 12, color: 'var(--slate-500)' }}>{projLabel}</td>
                            <td><StatusBadge status={t.status} /></td>
                            <td style={{ fontSize: 12, color: isOverdue(t.due) && t.status !== 'done' ? '#ef4444' : 'var(--slate-500)', fontWeight: isOverdue(t.due) && t.status !== 'done' ? 700 : 400 }}>
                              {fmt(t.due)}
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: breakdown */}
          <div className="card" style={{ padding: 18 }}>
            <div className="section-title">Status Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <StatusBadge status={status} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--slate-700)' }}>{count}</span>
                </div>
              ))}
            </div>
            {tasks.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate-500)', marginBottom: 6 }}>
                  <span>Completion</span>
                  <span>{done.length}/{tasks.length}</span>
                </div>
                <div style={{ height: 6, background: 'var(--slate-100)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${Math.round(done.length / tasks.length * 100)}%`, background: '#10b981', borderRadius: 3, transition: 'width .3s' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
