import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { sb } from '../lib/supabase'
import Avatar from '../components/Avatar'
import MultiSelect from '../components/MultiSelect'

function AvatarStack({ assignees = [], size = 24 }) {
  if (assignees.length === 0) return <span style={{ color: 'var(--slate-300)', fontSize: 12 }}>—</span>
  const show = assignees.slice(0, 3)
  const extra = assignees.length - show.length
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {show.map((a, i) => (
        <div key={a.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: show.length - i }}>
          <Avatar assignee={a} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          width: size, height: size, borderRadius: '50%', marginLeft: -8,
          background: 'var(--slate-200)', color: 'var(--slate-600)',
          fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff', zIndex: 0,
        }}>+{extra}</div>
      )}
    </div>
  )
}

const fmt = d => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = { name: '', description: '', link: '', assignee_ids: [], project_ids: [] }

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11" style={{ opacity: 0.3, marginLeft: 4 }}>
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  )
  return sortDir === 'asc'
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11" style={{ marginLeft: 4, color: 'var(--blue-500)' }}><polyline points="5 12 12 5 19 12"/></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11" style={{ marginLeft: 4, color: 'var(--blue-500)' }}><polyline points="19 12 12 19 5 12"/></svg>
}

export default function Files() {
  const { user, data, showToast } = useApp()
  const navigate = useNavigate()

  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showArchived, setShowArchived] = useState(false)

  // ── Toolbar filters ────────────────────────────────────────
  const [filterAssigneeIds, setFilterAssigneeIds] = useState([])
  const [filterProjectIds, setFilterProjectIds]   = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  // ── Sort ───────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  // ── 3-dot menu ─────────────────────────────────────────────
  const [menuOpenId, setMenuOpenId] = useState(null)
  const menuRef = useRef(null)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)

  // ── Edit / Delete ──────────────────────────────────────────
  const [editingFile, setEditingFile]     = useState(null) // file object being edited
  const [editForm, setEditForm]           = useState(EMPTY_FORM)
  const [editSaving, setEditSaving]       = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchFiles()
  }, [user])

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const fetchFiles = async () => {
    setLoading(true)
    const { data: rows, error } = await sb
      .from('files')
      .select(`
        *,
        assignee_files(assignee_id, assignees(id, name, color, initials, photo_url)),
        project_files(project_id, projects(id, name, emoji))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Files fetch error:', error)
      setFiles([])
    } else {
      setFiles((rows || []).map(f => ({
        id: f.id,
        name: f.name,
        description: f.description || '',
        link: f.link || '',
        createdAt: f.created_at || '',
        archived: f.archived || false,
        assignees: (f.assignee_files || [])
          .map(af => af.assignees)
          .filter(Boolean)
          .map(a => ({ ...a, photoUrl: a.photo_url })),
        projects: (f.project_files || [])
          .map(pf => pf.projects)
          .filter(Boolean),
      })))
    }
    setLoading(false)
  }

  // ── Filtering ──────────────────────────────────────────────
  const filtered = files.filter(f => {
    if (!showArchived && f.archived) return false

    const q = search.toLowerCase()
    if (q && !f.name.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q)) return false

    if (filterAssigneeIds.length > 0 && !f.assignees.some(a => filterAssigneeIds.includes(a.id))) return false
    if (filterProjectIds.length > 0  && !f.projects.some(p  => filterProjectIds.includes(p.id)))  return false

    if (dateFrom && f.createdAt && f.createdAt < dateFrom) return false
    if (dateTo   && f.createdAt && f.createdAt.slice(0, 10) > dateTo) return false

    return true
  })

  // ── Sorting ────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let va, vb
    if (sortCol === 'name') {
      va = a.name.toLowerCase(); vb = b.name.toLowerCase()
    } else if (sortCol === 'date') {
      va = a.createdAt; vb = b.createdAt
    } else if (sortCol === 'assignee') {
      va = (a.assignees[0]?.name || '').toLowerCase(); vb = (b.assignees[0]?.name || '').toLowerCase()
    } else if (sortCol === 'project') {
      va = (a.projects[0]?.name || '').toLowerCase(); vb = (b.projects[0]?.name || '').toLowerCase()
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const hasFilters = filterAssigneeIds.length > 0 || filterProjectIds.length > 0 || dateFrom || dateTo

  // ── Archive toggle ─────────────────────────────────────────
  const handleToggleArchive = async (file) => {
    setMenuOpenId(null)
    const newVal = !file.archived
    const { error } = await sb.from('files').update({ archived: newVal }).eq('id', file.id).eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return }
    setFiles(fs => fs.map(f => f.id === file.id ? { ...f, archived: newVal } : f))
    showToast(newVal ? 'File archived' : 'File unarchived')
  }

  // ── Edit ──────────────────────────────────────────────────
  const openEdit = (file) => {
    setMenuOpenId(null)
    setEditForm({
      name: file.name,
      description: file.description,
      link: file.link,
      assignee_ids: file.assignees.map(a => a.id),
      project_ids: file.projects.map(p => p.id),
    })
    setEditingFile(file)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editForm.name.trim()) return
    setEditSaving(true)

    const { error } = await sb.from('files')
      .update({ name: editForm.name.trim(), description: editForm.description.trim(), link: editForm.link.trim() })
      .eq('id', editingFile.id).eq('user_id', user.id)

    if (error) { showToast(error.message, 'error'); setEditSaving(false); return }

    // Replace assignee_files
    await sb.from('assignee_files').delete().eq('file_id', editingFile.id).eq('user_id', user.id)
    if (editForm.assignee_ids.length > 0) {
      await sb.from('assignee_files').insert(
        editForm.assignee_ids.map(aid => ({ assignee_id: aid, file_id: editingFile.id, user_id: user.id }))
      )
    }

    // Replace project_files
    await sb.from('project_files').delete().eq('file_id', editingFile.id).eq('user_id', user.id)
    if (editForm.project_ids.length > 0) {
      await sb.from('project_files').insert(
        editForm.project_ids.map(pid => ({ project_id: pid, file_id: editingFile.id, user_id: user.id }))
      )
    }

    const assignees = editForm.assignee_ids.map(id => data.assignees.find(a => a.id === id)).filter(Boolean)
    const projects  = editForm.project_ids.map(id => data.projects.find(p => p.id === id)).filter(Boolean)

    setFiles(fs => fs.map(f => f.id === editingFile.id
      ? { ...f, name: editForm.name.trim(), description: editForm.description.trim(), link: editForm.link.trim(), assignees, projects }
      : f
    ))
    showToast('File updated')
    setEditingFile(null)
    setEditSaving(false)
  }

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async () => {
    const id = confirmDeleteId
    setConfirmDeleteId(null)
    await sb.from('assignee_files').delete().eq('file_id', id).eq('user_id', user.id)
    await sb.from('project_files').delete().eq('file_id', id).eq('user_id', user.id)
    const { error } = await sb.from('files').delete().eq('id', id).eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return }
    setFiles(fs => fs.filter(f => f.id !== id))
    showToast('File deleted')
  }

  // ── New file ───────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    const { data: file, error } = await sb
      .from('files')
      .insert({ name: form.name.trim(), description: form.description.trim(), link: form.link.trim(), user_id: user.id })
      .select()
      .single()

    if (error) { showToast(error.message, 'error'); setSaving(false); return }

    if (form.assignee_ids.length > 0) {
      await sb.from('assignee_files').insert(
        form.assignee_ids.map(aid => ({ assignee_id: aid, file_id: file.id, user_id: user.id }))
      )
    }
    if (form.project_ids.length > 0) {
      await sb.from('project_files').insert(
        form.project_ids.map(pid => ({ project_id: pid, file_id: file.id, user_id: user.id }))
      )
    }

    const assignees = form.assignee_ids.map(id => data.assignees.find(a => a.id === id)).filter(Boolean)
    const projects  = form.project_ids.map(id => data.projects.find(p => p.id === id)).filter(Boolean)

    setFiles(fs => [{
      id: file.id, name: file.name, description: file.description || '',
      link: file.link || '', createdAt: file.created_at || '',
      archived: false, assignees, projects,
    }, ...fs])

    showToast('File created')
    setForm(EMPTY_FORM)
    setShowModal(false)
    setSaving(false)
  }

  const thStyle = col => ({
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    color: sortCol === col ? 'var(--blue-600)' : undefined,
  })

  return (
    <div className="page active">
      <div className="page-header">
        <span className="page-title">Files</span>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New File
        </button>
      </div>

      <div className="page-content">
        {/* ── Toolbar ── */}
        <div className="toolbar" style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ alignSelf: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="search-input"
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: 200 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Assignees</div>
            <MultiSelect
              options={data.assignees.map(a => ({ id: a.id, label: a.name }))}
              value={filterAssigneeIds}
              onChange={setFilterAssigneeIds}
              placeholder="All assignees"
            />
          </div>

          <div style={{ width: 200 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Projects</div>
            <MultiSelect
              options={data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))}
              value={filterProjectIds}
              onChange={setFilterProjectIds}
              placeholder="All projects"
            />
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Date From</div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 13, color: 'var(--slate-700)', background: 'var(--white)' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Date To</div>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 13, color: 'var(--slate-700)', background: 'var(--white)' }} />
          </div>

          {hasFilters && (
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px', alignSelf: 'flex-end' }}
              onClick={() => { setFilterAssigneeIds([]); setFilterProjectIds([]); setDateFrom(''); setDateTo('') }}>
              Clear Filters
            </button>
          )}

          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '5px 12px', alignSelf: 'flex-end', background: showArchived ? 'var(--slate-200)' : undefined, fontWeight: showArchived ? 700 : undefined }}
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? 'Showing All' : 'Show All'}
          </button>
        </div>

        {/* ── Table ── */}
        <div className="card" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</div>
          ) : sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)', fontSize: 13 }}>
              {files.length === 0 ? 'No files yet.' : 'No files match your filters.'}
            </div>
          ) : (
            <table className="task-table">
              <thead>
                <tr>
                  <th style={thStyle('name')} onClick={() => handleSort('name')}>
                    FILE NAME <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th>DESCRIPTION</th>
                  <th style={{ ...thStyle('date'), width: 130 }} onClick={() => handleSort('date')}>
                    DATE <SortIcon col="date" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th style={{ ...thStyle('assignee'), width: 200 }} onClick={() => handleSort('assignee')}>
                    ASSIGNEES <SortIcon col="assignee" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th style={{ ...thStyle('project'), width: 220 }} onClick={() => handleSort('project')}>
                    PROJECTS <SortIcon col="project" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map(file => (
                  <tr key={file.id} style={{ opacity: file.archived ? 0.6 : 1 }}>
                    {/* File Name */}
                    <td style={{ fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.link ? (
                        <a
                          href={file.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: file.archived ? 'var(--slate-400)' : 'var(--blue-600)', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {file.name}
                        </a>
                      ) : (
                        <span style={{ color: file.archived ? 'var(--slate-400)' : undefined }}>{file.name}</span>
                      )}
                    </td>

                    {/* Description */}
                    <td style={{ fontSize: 13, color: 'var(--slate-500)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.description || <span style={{ color: 'var(--slate-300)' }}>—</span>}
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: 12, color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>
                      {fmt(file.createdAt)}
                    </td>

                    {/* Assignees */}
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        {file.assignees.length === 0
                          ? <span style={{ color: 'var(--slate-300)', fontSize: 12 }}>—</span>
                          : (
                            <>
                              <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/assignees/${file.assignees[0].id}`)}>
                                <AvatarStack assignees={file.assignees} size={24} />
                              </div>
                              {file.assignees.length === 1 && (
                                <span style={{ fontSize: 12, cursor: 'pointer' }} onClick={() => navigate(`/assignees/${file.assignees[0].id}`)}>
                                  {file.assignees[0].name}
                                </span>
                              )}
                              {file.assignees.length > 1 && (
                                <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{file.assignees.length} people</span>
                              )}
                            </>
                          )
                        }
                      </div>
                    </td>

                    {/* Projects */}
                    <td>
                      {file.projects.length === 0 ? (
                        <span style={{ color: 'var(--slate-300)', fontSize: 12 }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {file.projects.map(p => (
                            <span key={p.id} onClick={() => navigate(`/projects/${p.id}`)} title={`Go to ${p.name}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 9px', borderRadius: 20,
                                background: 'var(--slate-100)', color: 'var(--slate-700)',
                                border: '1px solid var(--slate-200)',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                              }}>
                              {p.emoji} {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 3-dot menu */}
                    <td style={{ position: 'relative', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpenId(id => id === file.id ? null : file.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'var(--slate-400)', borderRadius: 4 }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                        </svg>
                      </button>
                      {menuOpenId === file.id && (
                        <div ref={menuRef} style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 200,
                          background: 'var(--white)', border: '1px solid var(--slate-200)',
                          borderRadius: 8, boxShadow: 'var(--shadow-lg)', minWidth: 140, padding: '4px 0',
                        }}>
                          {[
                            {
                              label: 'Edit', color: 'var(--slate-700)',
                              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
                              onClick: () => openEdit(file),
                            },
                            {
                              label: file.archived ? 'Unarchive' : 'Archive', color: 'var(--slate-700)',
                              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
                              onClick: () => handleToggleArchive(file),
                            },
                            {
                              label: 'Delete', color: 'var(--red-500)',
                              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
                              onClick: () => { setMenuOpenId(null); setConfirmDeleteId(file.id) },
                            },
                          ].map(item => (
                            <button key={item.label} onClick={item.onClick}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: item.color, textAlign: 'left' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                              {item.icon}{item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Edit File Modal ── */}
      {editingFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setEditingFile(null) }}>
          <div style={{ background: 'var(--white)', borderRadius: 12, width: 480, maxWidth: '95vw', boxShadow: 'var(--shadow-xl)', padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Edit File</span>
              <button onClick={() => setEditingFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>File Name *</label>
                <input autoFocus value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Description</label>
                <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Link (URL)</label>
                <input value={editForm.link} onChange={e => setEditForm(f => ({ ...f, link: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="https://…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Assignees</label>
                  <MultiSelect options={data.assignees.map(a => ({ id: a.id, label: a.name }))}
                    value={editForm.assignee_ids} onChange={ids => setEditForm(f => ({ ...f, assignee_ids: ids }))} placeholder="— Unassigned —" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Projects</label>
                  <MultiSelect options={data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))}
                    value={editForm.project_ids} onChange={ids => setEditForm(f => ({ ...f, project_ids: ids }))} placeholder="— None —" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingFile(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!editForm.name.trim() || editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setConfirmDeleteId(null) }}>
          <div style={{ background: 'var(--white)', borderRadius: 12, width: 380, maxWidth: '95vw', boxShadow: 'var(--shadow-xl)', padding: '28px 28px 24px' }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>Delete File</div>
            <p style={{ fontSize: 14, color: 'var(--slate-600)', marginBottom: 24 }}>
              Are you sure you want to delete <strong>{files.find(f => f.id === confirmDeleteId)?.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--red-500)', color: '#fff', border: 'none' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New File Modal ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={e => { if (e.target === e.currentTarget) { setShowModal(false); setForm(EMPTY_FORM) } }}
        >
          <div style={{ background: 'var(--white)', borderRadius: 12, width: 480, maxWidth: '95vw', boxShadow: 'var(--shadow-xl)', padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>New File</span>
              <button onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>File Name *</label>
                <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="Enter file name" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="Optional description" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Link (URL)</label>
                <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--slate-200)', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="https://…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Assignees</label>
                  <MultiSelect options={data.assignees.map(a => ({ id: a.id, label: a.name }))}
                    value={form.assignee_ids} onChange={ids => setForm(f => ({ ...f, assignee_ids: ids }))} placeholder="— Unassigned —" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', marginBottom: 5, letterSpacing: '.05em', textTransform: 'uppercase' }}>Projects</label>
                  <MultiSelect options={data.projects.map(p => ({ id: p.id, label: p.name, prefix: p.emoji }))}
                    value={form.project_ids} onChange={ids => setForm(f => ({ ...f, project_ids: ids }))} placeholder="— None —" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setForm(EMPTY_FORM) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!form.name.trim() || saving}>
                  {saving ? 'Creating…' : 'Create File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
