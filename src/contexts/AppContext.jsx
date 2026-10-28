import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { sb } from '../lib/supabase'
import { findFileByLink } from '../lib/fileLink'

const AppContext = createContext(null)

// ── DB → local mappers ────────────────────────────────────────
const mapOwner    = r => ({ id: r.id, name: r.name, email: r.email, role: r.role || 'Owner', color: r.color || '#2563eb', initials: r.initials || r.name.slice(0,2).toUpperCase() })
const mapAssignee = r => ({ id: r.id, name: r.name, email: r.email, dept: r.dept || '', color: r.color || '#3b82f6', initials: r.initials || r.name.slice(0,2).toUpperCase(), notes: r.notes || '', notesUrl: r.notes_url || '', photoUrl: r.photo_url || '', isOwner: r.is_owner || false, authUserId: r.auth_user_id || null, defaultProjectId: r.default_project_id || null })
const mapDomain      = r => ({ id: r.id, name: r.name })
const mapDepartment  = r => ({ id: r.id, name: r.name })
const mapProject  = r => ({ id: r.id, name: r.name, desc: r.description || '', start: r.start_date || '', due: r.due_date || '', end: r.end_date || '', status: r.status || 'active', emoji: r.emoji || '📁', tags: r.tags || [], photoUrl: r.photo_url || '', projectType: r.project_type || 'project', domain: r.domain || '', notesUrl: r.notes_url || '', createdBy: r.created_by || null, taskVisibility: r.task_visibility || 'assigned_only', goalId: r.goal_id || null })
const mapCollaborator = r => ({ id: r.id, projectId: r.project_id, assigneeId: r.assignee_id, userId: r.user_id, createdAt: r.created_at })
const mapReminder = r => ({ id: r.id, entityType: r.entity_type, entityId: r.entity_id, remindAt: r.remind_at, recurrence: r.recurrence || 'none', notes: r.notes || '' })
const mapGoal = r => ({ id: r.id, name: r.name, desc: r.description || '', type: r.type || 'monthly', status: r.status || 'active', start: r.start_date || '', due: r.due_date || '', createdAt: r.created_at || '', createdBy: r.created_by || null })
const mapWorkspaceMember = r => ({
  id: r.id,
  workspaceId: r.workspace_id,
  userId: r.user_id,
  assigneeId: r.assignee_id,
  role: r.role,
  invitedEmail: r.invited_email || '',
  acceptedAt: r.accepted_at || null,
  createdAt: r.created_at,
})

const mapTask = r => {
  const assigneeIds = (r.task_assignees || []).map(ta => ta.assignee_id)
  const projectIds  = (r.task_projects  || []).map(tp => tp.project_id)
  return {
    id: r.id,
    name: r.name,
    desc: r.description || '',
    createdAt: r.created_at || '',
    createdBy: r.created_by || null,
    assigneeId: assigneeIds[0] || null,
    projectId:  projectIds[0]  || null,
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
    goalId:  r.goal_id || null,
  }
}

// ── Partial local-state converters ────────────────────────────
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
  if ('goal_id'     in u) m.goalId    = u.goal_id
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
  if ('notes_url'      in u) m.notesUrl      = u.notes_url
  if ('task_visibility' in u) m.taskVisibility = u.task_visibility
  if ('goal_id'      in u) m.goalId      = u.goal_id
  return m
}

const toLocalAssignee = u => {
  const m = {}
  if ('name'         in u) m.name       = u.name
  if ('email'        in u) m.email      = u.email
  if ('dept'         in u) m.dept       = u.dept
  if ('notes'        in u) m.notes      = u.notes
  if ('color'        in u) m.color      = u.color
  if ('initials'     in u) m.initials   = u.initials
  if ('photo_url'    in u) m.photoUrl   = u.photo_url
  if ('notes_url'    in u) m.notesUrl   = u.notes_url
  if ('is_owner'     in u) m.isOwner    = u.is_owner
  if ('default_project_id' in u) m.defaultProjectId = u.default_project_id
  if ('auth_user_id' in u) m.authUserId = u.auth_user_id
  return m
}

export function AppProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [authReady, setAuthReady]   = useState(false)
  const [workspaceId, setWorkspaceId]           = useState(null)
  const [isAdmin, setIsAdmin]                   = useState(false)
  const [currentAssigneeId, setCurrentAssigneeId] = useState(null)
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [projectCollaborators, setProjectCollaborators] = useState([])
  const projectCollaboratorsRef = useRef([])
  const dataRef = useRef({ owners: [], assignees: [], projects: [], tasks: [], domains: [], departments: [], reminders: [], goals: [] })
  const [data, setData]             = useState({ owners: [], assignees: [], projects: [], tasks: [], domains: [], departments: [], reminders: [], goals: [] })
  const [toast, setToast]           = useState(null)

  // Keep latest values in refs so callbacks always have current values without stale closures
  const workspaceIdRef = useRef(null)
  useEffect(() => { workspaceIdRef.current = workspaceId }, [workspaceId])
  useEffect(() => { projectCollaboratorsRef.current = projectCollaborators }, [projectCollaborators])
  useEffect(() => { dataRef.current = data }, [data])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Workspace resolution ──────────────────────────────────
  // Returns the workspaceId to use for all subsequent data loads
  const resolveWorkspace = useCallback(async (uid, email) => {
    // Look up existing membership
    const { data: membership, error: wmErr } = await sb
      .from('workspace_members')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()

    // If workspace_members query errored (table issue, RLS, etc.) fall back immediately
    if (wmErr) {
      setWorkspaceId(uid)
      setIsAdmin(true)
      setCurrentAssigneeId(null)
      workspaceIdRef.current = uid
      return uid
    }

    if (membership) {
      setWorkspaceId(membership.workspace_id)
      setIsAdmin(membership.role === 'admin')
      setCurrentAssigneeId(membership.assignee_id || null)
      workspaceIdRef.current = membership.workspace_id
      return membership.workspace_id
    }

    // No membership by user_id — check for a pending invite row by email
    if (email) {
      const { data: pending } = await sb
        .from('workspace_members')
        .select('*')
        .eq('invited_email', email)
        .is('user_id', null)
        .maybeSingle()

      if (pending) {
        // Accept the invite: fill in user_id and accepted_at, link assignee to auth account
        await sb.from('workspace_members').update({
          user_id: uid,
          accepted_at: new Date().toISOString(),
        }).eq('id', pending.id)
        if (pending.assignee_id) {
          await sb.from('assignees').update({ auth_user_id: uid }).eq('id', pending.assignee_id)
        }
        setWorkspaceId(pending.workspace_id)
        setIsAdmin(pending.role === 'admin')
        setCurrentAssigneeId(pending.assignee_id || null)
        workspaceIdRef.current = pending.workspace_id
        return pending.workspace_id
      }

      // No pending invite either — try to auto-match by email to an existing assignee
      const { data: matched } = await sb
        .from('assignees')
        .select('id, user_id')
        .eq('email', email)
        .maybeSingle()

      if (matched) {
        const wsId = matched.user_id
        await sb.from('workspace_members').insert({
          workspace_id: wsId,
          user_id: uid,
          assignee_id: matched.id,
          role: 'member',
          invited_email: email,
          accepted_at: new Date().toISOString(),
        })
        await sb.from('assignees').update({ auth_user_id: uid }).eq('id', matched.id)
        setWorkspaceId(wsId)
        setIsAdmin(false)
        setCurrentAssigneeId(matched.id)
        workspaceIdRef.current = wsId
        return wsId
      }
    }

    // Fallback: treat as admin of their own workspace
    setWorkspaceId(uid)
    setIsAdmin(true)
    setCurrentAssigneeId(null)
    workspaceIdRef.current = uid
    return uid
  }, [])

  // ── localStorage cache helpers ────────────────────────────
  const CACHE_KEY = 'worky-data-cache'

  const saveCache = (wsId, payload) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ wsId, ts: Date.now(), payload })) } catch {}
  }

  const restoreCache = (wsId) => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return false
      const { wsId: cachedWsId, payload } = JSON.parse(raw)
      if (cachedWsId !== wsId) return false
      setData(payload)
      return true
    } catch { return false }
  }

  // ── Data loading ──────────────────────────────────────────
  const loadData = useCallback(async (wsId) => {
    const [owners, assignees, projects, tasks, domainsRes, departmentsRes, remindersRes, collaboratorsRes, goalsRes] = await Promise.all([
      sb.from('owners').select('*').eq('user_id', wsId).order('created_at'),
      sb.from('assignees').select('*').eq('user_id', wsId).order('name'),
      sb.from('projects').select('*').eq('user_id', wsId).order('created_at'),
      sb.from('tasks')
        .select('*, task_assignees(assignee_id), task_projects(project_id)')
        .eq('user_id', wsId)
        .order('created_at'),
      sb.from('domains').select('*').eq('user_id', wsId).order('created_at'),
      sb.from('departments').select('*').eq('user_id', wsId).order('name'),
      sb.from('reminders').select('*').eq('user_id', wsId).order('remind_at'),
      sb.from('project_collaborators').select('*').eq('user_id', wsId).order('created_at'),
      sb.from('goals').select('*').eq('user_id', wsId).order('created_at'),
    ])
    setProjectCollaborators((collaboratorsRes.data || []).map(mapCollaborator))

    let domainRows = domainsRes.data || []
    if (domainRows.length === 0) {
      await sb.from('domains').insert([
        { user_id: wsId, name: 'Work' },
        { user_id: wsId, name: 'Personal' },
      ])
      const { data: seeded } = await sb.from('domains').select('*').eq('user_id', wsId).order('created_at')
      domainRows = seeded || []
    }

    const fresh = {
      owners:      (owners.data    || []).map(mapOwner),
      assignees:   (assignees.data || []).map(mapAssignee),
      projects:    (projects.data  || []).map(mapProject),
      tasks:       (tasks.data     || []).map(mapTask),
      domains:     domainRows.map(mapDomain),
      departments: (departmentsRes.data || []).map(mapDepartment),
      reminders:   (remindersRes.data || []).map(mapReminder),
      goals:       (goalsRes.data || []).map(mapGoal),
    }
    setData(fresh)
    saveCache(wsId, fresh)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkspaceMembers = useCallback(async (wsId) => {
    const { data: rows } = await sb
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', wsId)
      .order('created_at')
    setWorkspaceMembers((rows || []).map(mapWorkspaceMember))
  }, [])

  // ── Auth ──────────────────────────────────────────────────
  // onAuthStateChange only sets user state — no DB queries inside the callback.
  // DB queries inside auth callbacks compete for the worky-auth storage lock and
  // produce "lock was stolen" errors. Data loading is handled in a separate effect.
  useEffect(() => {
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) {
        setData({ owners: [], assignees: [], projects: [], tasks: [], domains: [], departments: [], reminders: [], goals: [] })
        setWorkspaceMembers([])
        try { localStorage.removeItem('worky-data-cache') } catch {}
        setWorkspaceId(null)
        setIsAdmin(false)
        setCurrentAssigneeId(null)
      }
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load data once user is known — restore cache immediately, then refresh from DB in background
  useEffect(() => {
    if (!user) return
    const init = async () => {
      const wsId = await resolveWorkspace(user.id, user.email)
      restoreCache(wsId)                                          // paint instantly from cache
      await Promise.all([loadData(wsId), loadWorkspaceMembers(wsId)]) // then refresh silently
    }
    init()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const getAssignee = id => data.assignees.find(a => a.id === id)
  const getProject  = id => data.projects.find(p => p.id === id)
  const getOwner    = id => data.owners.find(o => o.id === id)

  // ── Task mutations ────────────────────────────────────────
  const updateTask = useCallback(async (taskId, updates) => {
    const { assignee_ids, project_ids, ...taskFields } = updates
    const wsId = workspaceIdRef.current

    if (assignee_ids !== undefined && assignee_ids.length > 0 && !taskFields.status) {
      const current = data.tasks.find(t => t.id === taskId)
      if (current?.status === 'todo') taskFields.status = 'inprogress'
    }

    if (Object.keys(taskFields).length > 0) {
      const { error } = await sb.from('tasks').update(taskFields).eq('id', taskId).eq('user_id', wsId)
      if (error) { showToast(error.message, 'error'); return false }
    }

    if (assignee_ids !== undefined) {
      await sb.from('task_assignees').delete().eq('task_id', taskId).eq('user_id', wsId)
      if (assignee_ids.length > 0) {
        const { error } = await sb.from('task_assignees').insert(
          assignee_ids.map(aid => ({ task_id: taskId, assignee_id: aid, user_id: wsId }))
        )
        if (error) { showToast(error.message, 'error'); return false }
      }
    }

    if (project_ids !== undefined) {
      await sb.from('task_projects').delete().eq('task_id', taskId).eq('user_id', wsId)
      if (project_ids.length > 0) {
        const { error } = await sb.from('task_projects').insert(
          project_ids.map(pid => ({ task_id: taskId, project_id: pid, user_id: wsId }))
        )
        if (error) { showToast(error.message, 'error'); return false }
      }
    }

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
  }, [data.tasks, showToast])

  // Default project for a set of assignees: the project most of them share as their default.
  // No defaults, or a tie for the top spot → null (leave blank).
  const defaultProjectFor = useCallback((assigneeIds = []) => {
    const counts = {}
    assigneeIds.forEach(id => {
      const pid = dataRef.current.assignees.find(a => a.id === id)?.defaultProjectId
      if (pid) counts[pid] = (counts[pid] || 0) + 1
    })
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (ranked.length === 0) return null
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return null
    return dataRef.current.projects.some(p => p.id === ranked[0][0]) ? ranked[0][0] : null
  }, [])

  const createTask = useCallback(async (row) => {
    const wsId = workspaceIdRef.current
    let { assignee_ids = [], project_ids = [], ...taskRow } = row

    // No project chosen → fall back to the assignees' default project
    if (project_ids.length === 0) {
      const dp = defaultProjectFor(assignee_ids)
      if (dp) {
        project_ids = [dp]
        if (!taskRow.domain) taskRow.domain = dataRef.current.projects.find(p => p.id === dp)?.domain || null
      }
    }

    // For projects with task_visibility='all', auto-include all collaborators
    const allAssigneeIds = new Set(assignee_ids)
    project_ids.forEach(pid => {
      const proj = dataRef.current.projects.find(p => p.id === pid)
      if (proj?.taskVisibility === 'all') {
        projectCollaboratorsRef.current
          .filter(c => c.projectId === pid)
          .forEach(c => allAssigneeIds.add(c.assigneeId))
      }
    })

    const finalAssigneeIds = [...allAssigneeIds]
    if (finalAssigneeIds.length > 0 && taskRow.status === 'todo') taskRow.status = 'inprogress'

    taskRow.user_id    = wsId
    taskRow.created_by = user?.id

    const { data: res, error } = await sb.from('tasks').insert(taskRow).select().single()
    if (error) { showToast(error.message, 'error'); return null }

    if (finalAssigneeIds.length > 0) {
      await sb.from('task_assignees').insert(
        finalAssigneeIds.map(aid => ({ task_id: res.id, assignee_id: aid, user_id: wsId }))
      )
    }
    if (project_ids.length > 0) {
      await sb.from('task_projects').insert(
        project_ids.map(pid => ({ task_id: res.id, project_id: pid, user_id: wsId }))
      )
    }

    const task = mapTask({
      ...res,
      task_assignees: finalAssigneeIds.map(id => ({ assignee_id: id })),
      task_projects:  project_ids.map(id  => ({ project_id:  id })),
    })
    setData(d => ({ ...d, tasks: [...d.tasks, task] }))
    return task
  }, [user, showToast])

  const deleteTask = useCallback(async (taskId) => {
    const wsId = workspaceIdRef.current
    await sb.from('task_assignees').delete().eq('task_id', taskId).eq('user_id', wsId)
    await sb.from('task_projects').delete().eq('task_id', taskId).eq('user_id', wsId)
    const { error } = await sb.from('tasks').delete().eq('id', taskId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== taskId) }))
    return true
  }, [showToast])

  // ── Project mutations ─────────────────────────────────────
  const updateProject = useCallback(async (projectId, updates) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb.from('projects').update(updates).eq('id', projectId).eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, projects: d.projects.map(p => p.id === projectId ? { ...p, ...toLocalProject(updates) } : p) }))
    return true
  }, [showToast])

  const createProject = useCallback(async (row) => {
    const wsId = workspaceIdRef.current
    const projectRow = { ...row, user_id: wsId, created_by: user?.id }
    const { data: res, error } = await sb.from('projects').insert(projectRow).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    setData(d => ({ ...d, projects: [...d.projects, mapProject(res)] }))
    return mapProject(res)
  }, [user, showToast])

  // ── Project collaborator mutations ────────────────────────
  const addProjectCollaborator = useCallback(async (projectId, assigneeId) => {
    const wsId = workspaceIdRef.current
    const existing = projectCollaboratorsRef.current.find(
      c => c.projectId === projectId && c.assigneeId === assigneeId
    )
    if (existing) { showToast('Already a collaborator', 'error'); return null }

    const { data: res, error } = await sb.from('project_collaborators').insert({
      project_id: projectId, assignee_id: assigneeId, user_id: wsId,
    }).select().single()
    if (error) { showToast(error.message, 'error'); return null }

    const collab = mapCollaborator(res)
    setProjectCollaborators(cs => [...cs, collab])

    // If project task_visibility = 'all', assign this collaborator to all existing project tasks
    const proj = dataRef.current.projects.find(p => p.id === projectId)
    if (proj?.taskVisibility === 'all') {
      const projectTasks = dataRef.current.tasks.filter(t => (t.projectIds || []).includes(projectId))
      for (const task of projectTasks) {
        if (!(task.assigneeIds || []).includes(assigneeId)) {
          const newIds = [...(task.assigneeIds || []), assigneeId]
          await sb.from('task_assignees').insert({ task_id: task.id, assignee_id: assigneeId, user_id: wsId })
          setData(d => ({
            ...d,
            tasks: d.tasks.map(t => t.id === task.id
              ? { ...t, assigneeIds: newIds, assigneeId: newIds[0] }
              : t
            )
          }))
        }
      }
    }
    return collab
  }, [showToast])

  const removeProjectCollaborator = useCallback(async (collaboratorId) => {
    const { error } = await sb.from('project_collaborators').delete().eq('id', collaboratorId)
    if (error) { showToast(error.message, 'error'); return false }
    setProjectCollaborators(cs => cs.filter(c => c.id !== collaboratorId))
    return true
  }, [showToast])

  const setProjectTaskVisibility = useCallback(async (projectId, visibility) => {
    const wsId = workspaceIdRef.current
    const ok = await updateProject(projectId, { task_visibility: visibility })
    if (!ok) return false
    // If switching to 'all', assign all current collaborators to all project tasks
    if (visibility === 'all') {
      const collabs = projectCollaboratorsRef.current.filter(c => c.projectId === projectId)
      const projectTasks = dataRef.current.tasks.filter(t => (t.projectIds || []).includes(projectId))
      for (const task of projectTasks) {
        const newAssigneeIds = new Set(task.assigneeIds || [])
        const toInsert = []
        collabs.forEach(c => {
          if (!newAssigneeIds.has(c.assigneeId)) {
            newAssigneeIds.add(c.assigneeId)
            toInsert.push({ task_id: task.id, assignee_id: c.assigneeId, user_id: wsId })
          }
        })
        if (toInsert.length > 0) {
          await sb.from('task_assignees').insert(toInsert)
          const ids = [...newAssigneeIds]
          setData(d => ({
            ...d,
            tasks: d.tasks.map(t => t.id === task.id
              ? { ...t, assigneeIds: ids, assigneeId: ids[0] }
              : t
            )
          }))
        }
      }
    }
    return true
  }, [updateProject, showToast])

  // ── Assignee mutations ────────────────────────────────────
  const updateAssignee = useCallback(async (assigneeId, updates) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb.from('assignees').update(updates).eq('id', assigneeId).eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, assignees: d.assignees.map(a => a.id === assigneeId ? { ...a, ...toLocalAssignee(updates) } : a) }))
    return true
  }, [showToast])

  const createAssignee = useCallback(async (row) => {
    const wsId = workspaceIdRef.current
    const { data: res, error } = await sb.from('assignees').insert({ ...row, user_id: wsId }).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    setData(d => ({ ...d, assignees: [...d.assignees, mapAssignee(res)] }))
    return mapAssignee(res)
  }, [showToast])

  // ── Workspace member mutations ────────────────────────────
  // Links an existing assignee as a workspace member (admin action)
  const addWorkspaceMember = useCallback(async (assigneeId) => {
    const wsId = workspaceIdRef.current
    const assignee = data.assignees.find(a => a.id === assigneeId)
    if (!assignee) return null

    const { data: existing } = await sb
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', wsId)
      .eq('assignee_id', assigneeId)
      .maybeSingle()
    if (existing) { showToast('Already a member', 'error'); return null }

    const { data: res, error } = await sb.from('workspace_members').insert({
      workspace_id: wsId,
      user_id: assignee.authUserId || null,
      assignee_id: assigneeId,
      role: 'member',
      invited_email: assignee.email,
    }).select().single()

    if (error) { showToast(error.message, 'error'); return null }
    const member = mapWorkspaceMember(res)
    setWorkspaceMembers(ms => [...ms, member])
    showToast(`${assignee.name} added to workspace`, 'success')
    return member
  }, [data.assignees, showToast])

  const removeWorkspaceMember = useCallback(async (memberId) => {
    const { error } = await sb.from('workspace_members').delete().eq('id', memberId)
    if (error) { showToast(error.message, 'error'); return false }
    setWorkspaceMembers(ms => ms.filter(m => m.id !== memberId))
    showToast('Member removed', 'success')
    return true
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
    const wsId = workspaceIdRef.current
    if (!wsId) return []
    const { data: rows, error } = await sb
      .from('assignee_files')
      .select('file_id, pinned, files(*)')
      .eq('assignee_id', assigneeId)
      .eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return [] }
    return (rows || []).filter(r => r.files).map(r => ({ ...r.files, pinned: !!r.pinned }))
  }, [showToast])

  const fetchFilesForProject = useCallback(async (projectId) => {
    const wsId = workspaceIdRef.current
    if (!wsId) return []
    const { data: rows, error } = await sb
      .from('project_files')
      .select('file_id, pinned, files(*)')
      .eq('project_id', projectId)
      .eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return [] }
    return (rows || []).filter(r => r.files).map(r => ({ ...r.files, pinned: !!r.pinned }))
  }, [showToast])

  const fetchFilesForTask = useCallback(async (taskId) => {
    const wsId = workspaceIdRef.current
    if (!wsId) return []
    const { data: rows, error } = await sb
      .from('task_files')
      .select('file_id, files(*)')
      .eq('task_id', taskId)
      .eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return [] }
    return (rows || []).map(r => r.files).filter(Boolean)
  }, [showToast])

  const addFileToEntity = useCallback(async (type, entityId, fileData) => {
    const wsId = workspaceIdRef.current
    let file
    const { data: inserted, error: fileErr } = await sb
      .from('files')
      .insert({ ...fileData, user_id: wsId, created_by: user?.id })
      .select()
      .single()
    if (fileErr) {
      // Same link already exists (unique on files.link_key): link the existing file instead
      const existing = fileErr.code === '23505' ? await findFileByLink(fileData.link) : null
      if (!existing) { showToast(fileErr.message, 'error'); return null }
      file = existing
    } else {
      file = inserted
    }

    const table = junctionTable(type)
    const fk    = junctionFk(type)
    const { error: jErr } = await sb
      .from(table)
      .insert({ [fk]: entityId, file_id: file.id, user_id: wsId })
    if (jErr) {
      if (jErr.code === '23505') { showToast('This file is already linked here', 'error'); return null }
      showToast(jErr.message, 'error'); return null
    }
    if (inserted !== file) showToast('File already existed — linked the existing one')

    // File added from an assignee's page → also file it under that assignee's default project
    if (type === 'assignee') {
      const dp = defaultProjectFor([entityId])
      if (dp) await sb.from('project_files').upsert(
        { project_id: dp, file_id: file.id, user_id: wsId },
        { onConflict: 'project_id,file_id', ignoreDuplicates: true })
    }

    return file
  }, [user, showToast, defaultProjectFor])

  const removeFileFromEntity = useCallback(async (type, entityId, fileId) => {
    const wsId = workspaceIdRef.current
    const table = junctionTable(type)
    const fk    = junctionFk(type)
    const { error } = await sb
      .from(table)
      .delete()
      .eq(fk, entityId)
      .eq('file_id', fileId)
      .eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    return true
  }, [showToast])

  const setFileArchived = useCallback(async (fileId, archived) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb
      .from('files')
      .update({ archived })
      .eq('id', fileId)
      .eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    return true
  }, [showToast])

  const setFileContext = useCallback(async (fileId, context) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb
      .from('files')
      .update({ context })
      .eq('id', fileId)
      .eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    return true
  }, [showToast])

  // Pinning is per entity (stored on the junction row), so a file can be pinned on one page and not another
  const setFilePinned = useCallback(async (type, entityId, fileId, pinned) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb
      .from(junctionTable(type))
      .update({ pinned })
      .eq(junctionFk(type), entityId)
      .eq('file_id', fileId)
      .eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    return true
  }, [showToast])

  // ── Department mutations ──────────────────────────────────
  const createDepartment = useCallback(async (name) => {
    const wsId = workspaceIdRef.current
    const { data: res, error } = await sb.from('departments').insert({ name: name.trim(), user_id: wsId }).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    const d = mapDepartment(res)
    setData(s => ({ ...s, departments: [...s.departments, d].sort((a, b) => a.name.localeCompare(b.name)) }))
    return d
  }, [showToast])

  const deleteDepartment = useCallback(async (deptId) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb.from('departments').delete().eq('id', deptId).eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(s => ({ ...s, departments: s.departments.filter(d => d.id !== deptId) }))
    return true
  }, [showToast])

  // ── Domain mutations ──────────────────────────────────────
  const createDomain = useCallback(async (name) => {
    const wsId = workspaceIdRef.current
    const { data: res, error } = await sb.from('domains').insert({ name: name.trim(), user_id: wsId }).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    const d = mapDomain(res)
    setData(s => ({ ...s, domains: [...s.domains, d] }))
    return d
  }, [showToast])

  const deleteDomain = useCallback(async (domainId) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb.from('domains').delete().eq('id', domainId).eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(s => ({ ...s, domains: s.domains.filter(d => d.id !== domainId) }))
    return true
  }, [showToast])

  // ── Reminder mutations ────────────────────────────────────
  const createReminder = useCallback(async ({ entityType, entityId, remindAt, recurrence = 'none', notes = '' }) => {
    const wsId = workspaceIdRef.current
    const { data: res, error } = await sb.from('reminders').insert({
      user_id: wsId, created_by: user?.id,
      entity_type: entityType, entity_id: entityId,
      remind_at: remindAt, recurrence, notes,
    }).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    const r = mapReminder(res)
    setData(d => ({ ...d, reminders: [...d.reminders, r] }))
    return r
  }, [user, showToast])

  const updateReminder = useCallback(async (reminderId, { remindAt, recurrence, notes }) => {
    const { error } = await sb.from('reminders').update({
      remind_at: remindAt, recurrence, notes,
    }).eq('id', reminderId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, reminders: d.reminders.map(r => r.id === reminderId ? { ...r, remindAt, recurrence, notes } : r) }))
    return true
  }, [showToast])

  const deleteReminder = useCallback(async (reminderId) => {
    const { error } = await sb.from('reminders').delete().eq('id', reminderId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({ ...d, reminders: d.reminders.filter(r => r.id !== reminderId) }))
    return true
  }, [showToast])

  // ── Goal mutations ────────────────────────────────────────
  const createGoal = useCallback(async (row) => {
    const wsId = workspaceIdRef.current
    const goalRow = { ...row, user_id: wsId, created_by: user?.id }
    const { data: res, error } = await sb.from('goals').insert(goalRow).select().single()
    if (error) { showToast(error.message, 'error'); return null }
    const goal = mapGoal(res)
    setData(d => ({ ...d, goals: [...d.goals, goal] }))
    return goal
  }, [user, showToast])

  const updateGoal = useCallback(async (goalId, updates) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb.from('goals').update(updates).eq('id', goalId).eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({
      ...d,
      goals: d.goals.map(g => g.id === goalId ? mapGoal({
        id: g.id, name: g.name, description: g.desc, type: g.type, status: g.status,
        start_date: g.start, due_date: g.due, created_at: g.createdAt, created_by: g.createdBy,
        ...updates,
      }) : g),
    }))
    return true
  }, [showToast])

  const deleteGoal = useCallback(async (goalId) => {
    const wsId = workspaceIdRef.current
    const { error } = await sb.from('goals').delete().eq('id', goalId).eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({
      ...d,
      goals: d.goals.filter(g => g.id !== goalId),
      tasks: d.tasks.map(t => t.goalId === goalId ? { ...t, goalId: null } : t),
      projects: d.projects.map(p => p.goalId === goalId ? { ...p, goalId: null } : p),
    }))
    return true
  }, [showToast])

  // ── Owner assignee ────────────────────────────────────────
  const setOwnerAssignee = useCallback(async (assigneeId) => {
    const wsId = workspaceIdRef.current
    await sb.from('assignees').update({ is_owner: false }).eq('user_id', wsId).eq('is_owner', true)
    const { error } = await sb.from('assignees').update({ is_owner: true }).eq('id', assigneeId).eq('user_id', wsId)
    if (error) { showToast(error.message, 'error'); return false }
    setData(d => ({
      ...d,
      assignees: d.assignees.map(a => ({ ...a, isOwner: a.id === assigneeId }))
    }))
    return true
  }, [showToast])

  return (
    <AppContext.Provider value={{
      user, authReady, data, loadData,
      workspaceId, isAdmin, currentAssigneeId,
      workspaceMembers,
      projectCollaborators,
      getAssignee, getProject, getOwner,
      updateTask, createTask, deleteTask, defaultProjectFor,
      updateProject, createProject,
      addProjectCollaborator, removeProjectCollaborator, setProjectTaskVisibility,
      updateAssignee, createAssignee, setOwnerAssignee,
      addWorkspaceMember, removeWorkspaceMember, loadWorkspaceMembers,
      fetchFilesForAssignee, fetchFilesForProject, fetchFilesForTask,
      addFileToEntity, removeFileFromEntity, setFileArchived, setFileContext, setFilePinned,
      createDepartment, deleteDepartment,
      createDomain, deleteDomain,
      createReminder, updateReminder, deleteReminder,
      createGoal, updateGoal, deleteGoal,
      showToast, toast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
