import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { sb } from '../lib/supabase'

const AppContext = createContext(null)

// ── DB → local mappers ────────────────────────────────────────
const mapOwner    = r => ({ id: r.id, name: r.name, email: r.email, role: r.role || 'Owner', color: r.color || '#2563eb', initials: r.initials || r.name.slice(0,2).toUpperCase() })
const mapAssignee = r => ({ id: r.id, name: r.name, email: r.email, dept: r.dept || '', color: r.color || '#3b82f6', initials: r.initials || r.name.slice(0,2).toUpperCase(), notes: r.notes || '', notesUrl: r.notes_url || '', photoUrl: r.photo_url || '', isOwner: r.is_owner || false })
const mapDomain   = r => ({ id: r.id, name: r.name })
const mapProject  = r => ({ id: r.id, name: r.name, desc: r.description || '', start: r.start_date || '', due: r.due_date || '', end: r.end_date || '', status: r.status || 'active', emoji: r.emoji || '📁', tags: r.tags || [], photoUrl: r.photo_url || '', projectType: r.project_type || 'project', domain: r.domain || '' })

// Tasks now carry assigneeIds[] and projectIds[] from the junction tables.
// assigneeId / projectId are kept as the first element for backward-compat display.
const mapTask = r => {
  const assigneeIds = (r.task_assignees || []).map(ta => ta.assignee_id)
  const projectIds  = (r.task_projects  || []).map(tp => tp.project_id)
  return {
    id: r.id,
    name: r.name,
    desc: r.description || '',
    createdAt: r.created_at || '',
    // Legacy single-value helpers (first item)
    assigneeId: assigneeIds[0] || null,
    projectId:  projectIds[0]  || null,
    // Multi-value arrays
    assigneeIds,
    projectIds,
    ownerId: r.owner_id || null,
    status:  r.status || 'todo',
    start:   r.start_date || '',
    due:     r.due_date   || '',
    tags:    r.tags  || [],
    roadmap: r.roadmap || false,
    active:  r.status === 'done' ? false : r.active !== false,
    files:   r.files || [],
    domain:  r.domain || '',
  }
}

// ── Partial local-state converters (snake_case DB → camelCase) ──
const toLocalTask = u => {
  const m = {}
  if ('name'        in u) m.name      = u.name
  if ('description' in u) m.desc      = u.description
  if ('status'      in u) m.status    = u.status
  if ('owner_id'    in u) m.ownerId   = u.owner_id
  if ('start_date'  in u) m.start     = u.start_date
  if ('due_date'    in u) m.due       = u.due_date
  if ('tags'        in u) m.tags      = u.tags
  if ('roadmap'     in u) m.roadmap   = u.roadmap
  if ('active'      in u) m.active    = u.active
  if ('domain'      in u) m.domain    = u.domain
  if (m.status === 'done') m.active = false
  return m
}

const toLocalProject = u => {
  const m = {}
  if ('name'        in u) m.name     = u.name
  if ('description' in u) m.desc     = u.description
  if ('status'      in u) m.status   = u.status
  if ('start_date'  in u) m.start    = u.start_date
  if ('due_date'    in u) m.due      = u.due_date
  if ('end_date'    in u) m.end      = u.end_date
  if ('tags'         in u) m.tags        = u.tags
  if ('emoji'        in u) m.emoji       = u.emoji
  if ('photo_url'    in u) m.photoUrl    = u.photo_url
  if ('project_type' in u) m.projectType = u.project_type
  if ('domain'       in u) m.domain      = u.domain
  return m
}

const toLocalAssignee = u => {
  const m = {}
  if ('name'      in u) m.name     = u.name
  if ('email'     in u) m.email    = u.email
  if ('dept'      in u) m.dept     = u.dept
  if ('notes'     in u) m.notes    = u.notes
  if ('color'     in u) m.color    = u.color
  if ('initials'  in u) m.initials = u.initials
  if ('photo_url'  in u) m.photoUrl  = u.photo_url
  if ('notes_url'  in u) m.notesUrl  = u.notes_url
  if ('is_owner'   in u) m.isOwner   = u.is_owner
  return m
}

export function AppProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData]       = useState({ owners: [], assignees: [], projects: [], tasks: [], domains: [] })
  const [toast, setToast]     = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Data loading ──────────────────────────────────────────
  const loadData = useCallback(async (uid) => {
    const [owners, assignees, projects, tasks, domainsRes] = await Promise.all([
      sb.from('owners').select('*').eq('user_id', uid).order('created_at'),
      sb.from('assignees').select('*').eq('user_id', uid).order('name'),
      sb.from('projects').select('*').eq('user_id', uid).order('created_at'),
      sb.from('tasks')
        .select('*, task_assignees(assignee_id), task_projects(project_id)')
        .eq('user_id', uid)
        .order('created_at'),
      sb.from('domains').select('*').eq('user_id', uid).order('created_at'),
    ])

    // Auto-seed Work / Personal if this user has no domains yet
    let domainRows = domainsRes.data || []
    if (domainRows.length === 0) {
      await sb.from('domains').insert([
        { user_id: uid, name: 'Work' },
        { user_id: uid, name: 'Personal' },
      ])
      const { data: seeded } = await sb.from('domains').select('*').eq('user_id', uid).order('created_at')
      domainRows = seeded || []
    }

    setData({
      owners:    (owners.data    || []).map(mapOwner),
      assignees: (assignees.data || []).map(mapAssignee),
      projects:  (projects.data  || []).map(mapProject),
      tasks:     (tasks.data     || []).map(mapTask),
      domains:   domainRows.map(mapDomain),
    })
  }, [])

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadData(session.user.id)
      setAuthReady(true)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadData(session.user.id)
      else setData({ owners: [], assignees: [], projects: [], tasks: [], domains: [] })
    })
    return () => subscription.unsubscribe()
  }, [loadData])

  const getAssignee = id => data.assignees.find(a => a.id === id)
  const getProject  = id => data.projects.find(p => p.id === id)
  const getOwner    = id => data.owners.find(o => o.id === id)

  // ── Task mutations ────────────────────────────────────────
  // updates may contain regular task fields AND optional:
  //   assignee_ids: string[]   → replaces all rows in task_assignees
  //   project_ids:  string[]   → replaces all rows in task_projects
  const updateTask = useCallback(async (taskId, updates) => {
    const { assignee_ids, project_ids, ...taskFields } = updates

    // 1. Update main tasks table (if any scalar fields changed)
    if (Object.keys(taskFields).length > 0) {
      const { error } = await sb.from('tasks').update(taskFields).eq('id', taskId).eq('user_id', user.id)
      if (error) { showToast(error.message, 'error'); return false }
    }

    // 2. Replace assignees in junction table
    if (assignee_ids !== undefined) {
      await sb.from('task_assignees').delete().eq('task_id', taskId).eq('user_id', user.id)
      if (assignee_ids.length > 0) {
        const { error } = await sb.from('task_assignees').insert(
          assignee_ids.map(aid => ({ task_id: taskId, assignee_id: aid, user_id: user.id }))
        )
        if (error) { showToast(error.message, 'error'); return false }
      }
    }

    // 3. Replace projects in junction table
    if (project_ids !== undefined) {
      await sb.from('task_projects').delete().eq('task_id', taskId).eq('user_id', user.id)
      if (project_ids.length > 0) {
        const { error } = await sb.from('task_projects').insert(
          project_ids.map(pid => ({ task_id: taskId, project_id: pid, user_id: user.id }))
        )
        if (error) { showToast(error.message, 'error'); return false }
      }
    }

    // 4. Update local state
    const localUpdates = toLocalTask(taskFields)
    if (assignee_ids !== undefined) {
      localUpdates.assigneeIds = assignee_ids
      localUpdates.assigneeId  = assignee_ids[0] || null
    }
    if (project_ids !== undefined) {
      localUpdates.projectIds = project_ids
      localUpdates.projectId  = project_ids[0] || null
    }
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, ...localUpdates } : t) }))
    return true
  }, [user, showToast])

  const createTask = useCallback(async (row) => {
    const { assignee_ids = [], project_ids = [], ...taskRow } = row
    const { data: res, error } = await sb.from('tasks').insert(taskRow).select().single()
    if (error) { showToast(error.message, 'error'); return null }

    // Insert junction records
    if (assignee_ids.length > 0) {
      await sb.from('task_assignees').insert(
        assignee_ids.map(aid => ({ task_id: res.id, assignee_id: aid, user_id: row.user_id }))
      )
    }
    if (project_ids.length > 0) {
      await sb.from('task_projects').insert(
        project_ids.map(pid => ({ task_id: res.id, project_id: pid, user_id: row.user_id }))
      )
    }

    const task = mapTask({
      ...res,
      task_assignees: assignee_ids.map(id => ({ assignee_id: id })),
      task_projects:  project_ids.map(id  => ({ project_id:  id })),
    })
    setData(d => ({ ...d, tasks: [...d.tasks, task] }))
    return task
  }, [showToast])

  const deleteTask = useCallback(async (taskId) => {
    await sb.from('task_assignees').delete().eq('task_id', taskId).eq('user_id', user.id)
    await sb.from('task_projects').delete().eq('task_id', taskId).eq('user_id', user.id)
    const { error } = await sb.from('tasks').delete().eq('id', taskId).eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== taskId) }))
    return true
  }, [user, showToast])

  // ── Project mutations ─────────────────────────────────────
  const updateProject = useCallback(async (projectId, updates) => {
    const { error } = await sb.from('projects').update(updates).eq('id', projectId).eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, ...toLocalProject(updates) } : p) }))
    return true
  }, [user, showToast])

  const createProject = useCallback(async (row) => {
    const { data: res, error } = await sb.from('projects').insert(row).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    setData(d => ({ ...d, projects: [...d.projects, mapProject(res)] }))
    return mapProject(res)
  }, [showToast])

  // ── Assignee mutations ────────────────────────────────────
  const updateAssignee = useCallback(async (assigneeId, updates) => {
    const { error } = await sb.from('assignees').update(updates).eq('id', assigneeId).eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, assignees: d.assignees.map(a => a.id === assigneeId ? { ...a, ...toLocalAssignee(updates) } : a) }))
    return true
  }, [user, showToast])

  const createAssignee = useCallback(async (row) => {
    const { data: res, error } = await sb.from('assignees').insert(row).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    setData(d => ({ ...d, assignees: [...d.assignees, mapAssignee(res)] }))
    return mapAssignee(res)
  }, [showToast])

  // ── File mutations ────────────────────────────────────────
  const junctionTable = type =>
    type === 'assignee' ? 'assignee_files'
    : type === 'project' ? 'project_files'
    : 'task_files'

  const junctionFk = type =>
    type === 'assignee' ? 'assignee_id'
    : type === 'project' ? 'project_id'
    : 'task_id'

  const fetchFilesForAssignee = useCallback(async (assigneeId) => {
    const { data: rows, error } = await sb
      .from('assignee_files')
      .select('file_id, files(*)')
      .eq('assignee_id', assigneeId)
      .eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return [] }
    return (rows || []).map(r => r.files).filter(Boolean)
  }, [user, showToast])

  const fetchFilesForProject = useCallback(async (projectId) => {
    const { data: rows, error } = await sb
      .from('project_files')
      .select('file_id, files(*)')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return [] }
    return (rows || []).map(r => r.files).filter(Boolean)
  }, [user, showToast])

  const fetchFilesForTask = useCallback(async (taskId) => {
    const { data: rows, error } = await sb
      .from('task_files')
      .select('file_id, files(*)')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return [] }
    return (rows || []).map(r => r.files).filter(Boolean)
  }, [user, showToast])

  const addFileToEntity = useCallback(async (type, entityId, fileData) => {
    // 1. Create the file record
    const { data: file, error: fileErr } = await sb
      .from('files')
      .insert({ ...fileData, user_id: user.id })
      .select()
      .single()
    if (fileErr) { showToast(fileErr.message, 'error'); return null }

    // 2. Create the junction record
    const table = junctionTable(type)
    const fk    = junctionFk(type)
    const { error: jErr } = await sb
      .from(table)
      .insert({ [fk]: entityId, file_id: file.id, user_id: user.id })
    if (jErr) { showToast(jErr.message, 'error'); return null }

    return file
  }, [user, showToast])

  const removeFileFromEntity = useCallback(async (type, entityId, fileId) => {
    const table = junctionTable(type)
    const fk    = junctionFk(type)
    const { error } = await sb
      .from(table)
      .delete()
      .eq(fk, entityId)
      .eq('file_id', fileId)
      .eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return false }
    return true
  }, [user, showToast])

  const setFileArchived = useCallback(async (fileId, archived) => {
    const { error } = await sb
      .from('files')
      .update({ archived })
      .eq('id', fileId)
      .eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return false }
    return true
  }, [user, showToast])

  // ── Domain mutations ──────────────────────────────────────
  const createDomain = useCallback(async (name) => {
    const { data: res, error } = await sb.from('domains').insert({ name: name.trim(), user_id: user.id }).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    const d = mapDomain(res)
    setData(s => ({ ...s, domains: [...s.domains, d] }))
    return d
  }, [user, showToast])

  const deleteDomain = useCallback(async (domainId) => {
    const { error } = await sb.from('domains').delete().eq('id', domainId).eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return false }
    setData(s => ({ ...s, domains: s.domains.filter(d => d.id !== domainId) }))
    return true
  }, [user, showToast])

  // Sets one assignee as the owner; clears is_owner on all others for this user
  const setOwnerAssignee = useCallback(async (assigneeId) => {
    // Clear existing owner(s) first
    await sb.from('assignees').update({ is_owner: false }).eq('user_id', user.id).eq('is_owner', true)
    // Set the new owner
    const { error } = await sb.from('assignees').update({ is_owner: true }).eq('id', assigneeId).eq('user_id', user.id)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({
      ...d,
      assignees: d.assignees.map(a => ({ ...a, isOwner: a.id === assigneeId }))
    }))
    return true
  }, [user, showToast])

  return (
    <AppContext.Provider value={{
      user, authReady, data, loadData,
      getAssignee, getProject, getOwner,
      updateTask, createTask, deleteTask,
      updateProject, createProject,
      updateAssignee, createAssignee, setOwnerAssignee,
      fetchFilesForAssignee, fetchFilesForProject, fetchFilesForTask,
      addFileToEntity, removeFileFromEntity, setFileArchived,
      createDomain, deleteDomain,
      showToast, toast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
