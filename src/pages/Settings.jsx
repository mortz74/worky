import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import Avatar from '../components/Avatar'

export default function Settings() {
  const {
    data, isAdmin, workspaceMembers,
    createDomain, deleteDomain,
    createDepartment, deleteDepartment,
    addWorkspaceMember, removeWorkspaceMember,
    showToast,
  } = useApp()

  const [activeTab, setActiveTab] = useState('domains')
  const [newDomain, setNewDomain] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)
  const [newDept, setNewDept] = useState('')
  const [addingDept, setAddingDept] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [selectedNewMember, setSelectedNewMember] = useState('')
  const [removingId, setRemovingId] = useState(null)

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return
    if (data.domains.some(d => d.name.toLowerCase() === newDomain.trim().toLowerCase())) {
      showToast('Domain already exists', 'error'); return
    }
    setAddingDomain(true)
    await createDomain(newDomain.trim())
    setNewDomain('')
    setAddingDomain(false)
    showToast('Domain added', 'success')
  }

  const handleAddMember = async () => {
    if (!selectedNewMember) return
    setAddingMember(true)
    await addWorkspaceMember(selectedNewMember)
    setSelectedNewMember('')
    setAddingMember(false)
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from the workspace?`)) return
    setRemovingId(memberId)
    await removeWorkspaceMember(memberId)
    setRemovingId(null)
  }

  // Assignees not yet workspace members (and not the admin themselves)
  const memberAssigneeIds = new Set(workspaceMembers.map(m => m.assigneeId).filter(Boolean))
  const invitableAssignees = data.assignees.filter(a => !memberAssigneeIds.has(a.id))

  const handleAddDept = async () => {
    if (!newDept.trim()) return
    if (data.departments.some(d => d.name.toLowerCase() === newDept.trim().toLowerCase())) {
      showToast('Department already exists', 'error'); return
    }
    setAddingDept(true)
    await createDepartment(newDept.trim())
    setNewDept('')
    setAddingDept(false)
    showToast('Department added', 'success')
  }

  const tabs = isAdmin
    ? [{ id: 'domains', label: 'Domains' }, { id: 'departments', label: 'Departments' }, { id: 'team', label: 'Team' }]
    : [{ id: 'domains', label: 'Domains' }, { id: 'departments', label: 'Departments' }]

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Settings</span>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: 600 }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--slate-200)', paddingBottom: 0 }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 16px', fontSize: 14, fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? 'var(--blue-600)' : 'var(--slate-500)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--blue-600)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Domains tab */}
          {activeTab === 'domains' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>Domains</div>
                <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                  Domains categorise your projects and tasks (e.g. Work, Personal).
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {data.domains.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--slate-400)', padding: '10px 0' }}>No domains yet.</div>
                )}
                {data.domains.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--slate-50)', borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>🏷 {d.name}</span>
                    {isAdmin && (
                      <button
                        onClick={async () => { await deleteDomain(d.id); showToast(`"${d.name}" deleted`, 'success') }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
                        title="Delete domain"
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: 13 }}
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                    placeholder="New domain name…"
                  />
                  <button className="btn btn-primary" onClick={handleAddDomain} disabled={addingDomain || !newDomain.trim()}>
                    {addingDomain ? 'Adding…' : '+ Add'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Departments tab */}
          {activeTab === 'departments' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>Departments</div>
                <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                  Departments appear as a dropdown when adding or editing assignees.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {data.departments.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--slate-400)', padding: '10px 0' }}>No departments yet.</div>
                )}
                {data.departments.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--slate-50)', borderRadius: 8, border: '1px solid var(--slate-200)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>🏢 {d.name}</span>
                    {isAdmin && (
                      <button
                        onClick={async () => { await deleteDepartment(d.id); showToast(`"${d.name}" deleted`, 'success') }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
                        title="Delete department"
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: 13 }}
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddDept()}
                    placeholder="New department name…"
                  />
                  <button className="btn btn-primary" onClick={handleAddDept} disabled={addingDept || !newDept.trim()}>
                    {addingDept ? 'Adding…' : '+ Add'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Team tab — admin only */}
          {activeTab === 'team' && isAdmin && (
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>Team Members</div>
                  <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                    Members can log in and see tasks they created or are assigned to. To join, they sign up at the app URL using their email address.
                  </div>
                </div>

                {/* Member list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {workspaceMembers.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--slate-400)', padding: '10px 0' }}>No members yet.</div>
                  )}
                  {workspaceMembers.map(m => {
                    const assignee = data.assignees.find(a => a.id === m.assigneeId)
                    const isActive = !!m.acceptedAt
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--slate-50)', borderRadius: 10, border: '1px solid var(--slate-200)' }}>
                        {assignee
                          ? <Avatar assignee={assignee} size={34} />
                          : <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--slate-500)' }}>?</div>
                        }
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>
                            {assignee?.name || m.invitedEmail || 'Unknown'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>
                            {assignee?.email || m.invitedEmail || ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Role badge */}
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: m.role === 'admin' ? '#dbeafe' : '#f0fdf4',
                            color: m.role === 'admin' ? '#1d4ed8' : '#15803d',
                          }}>
                            {m.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                          {/* Status badge */}
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                            background: isActive ? '#f0fdf4' : '#fef9c3',
                            color: isActive ? '#166534' : '#854d0e',
                          }}>
                            {isActive ? '● Active' : '○ Pending'}
                          </span>
                          {/* Remove button (can't remove yourself as admin) */}
                          {m.role !== 'admin' && (
                            <button
                              onClick={() => handleRemoveMember(m.id, assignee?.name || 'member')}
                              disabled={removingId === m.id}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}
                              title="Remove member"
                            >
                              {removingId === m.id ? '…' : '✕'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add member */}
                {invitableAssignees.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 8 }}>Add Assignee as Member</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        className="form-select"
                        style={{ flex: 1, fontSize: 13 }}
                        value={selectedNewMember}
                        onChange={e => setSelectedNewMember(e.target.value)}
                      >
                        <option value="">— Select assignee —</option>
                        {invitableAssignees.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.email || 'no email'})</option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary"
                        onClick={handleAddMember}
                        disabled={addingMember || !selectedNewMember}
                      >
                        {addingMember ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Onboarding instructions */}
              <div style={{ padding: '14px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>How members join</div>
                <ol style={{ fontSize: 13, color: '#1d4ed8', margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                  <li>Add the person as an <strong>Assignee</strong> first (with their email address).</li>
                  <li>Add them as a member above.</li>
                  <li>They go to the Worky app URL and sign up with the same email.</li>
                  <li>On first login, they're automatically linked to their profile and can see their tasks.</li>
                </ol>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
