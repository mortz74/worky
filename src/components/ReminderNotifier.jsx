import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'

const STORAGE_KEY = 'worky-shown-reminders'

function nextRemindAt(remindAt, recurrence) {
  const d = new Date(remindAt)
  if (recurrence === 'daily')   d.setDate(d.getDate() + 1)
  if (recurrence === 'weekly')  d.setDate(d.getDate() + 7)
  if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

function loadShown() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveShown(shown) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(shown)) } catch {}
}

export default function ReminderNotifier() {
  const navigate = useNavigate()
  const { data, updateReminder } = useApp()
  const shownRef = useRef(loadShown())
  const permissionRef = useRef('default')

  // Request notification permission on mount
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted'
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { permissionRef.current = p })
    } else {
      permissionRef.current = Notification.permission
    }
  }, [])

  const getEntityName = (r) => {
    if (r.entityType === 'task') {
      const t = data.tasks.find(t => t.id === r.entityId)
      return t ? t.name : 'Deleted task'
    }
    const p = data.projects.find(p => p.id === r.entityId)
    return p ? `${p.emoji} ${p.name}` : 'Deleted project'
  }

  const fireNotification = (r) => {
    const title = '🔔 ' + getEntityName(r)
    const body = [
      r.notes || '',
      r.recurrence !== 'none' ? `↻ Repeats ${r.recurrence}` : '',
    ].filter(Boolean).join('\n') || 'Tap to open'

    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: r.id,
      requireInteraction: true,   // stay until user acts on it
    })

    n.onclick = () => {
      window.focus()
      navigate(r.entityType === 'task' ? `/tasks/${r.entityId}` : `/projects/${r.entityId}`)
      n.close()
      // Advance recurring
      if (r.recurrence !== 'none') {
        const next = nextRemindAt(r.remindAt, r.recurrence)
        updateReminder(r.id, { remindAt: next, recurrence: r.recurrence, notes: r.notes })
      }
    }

    n.onclose = () => {
      // Advance recurring when dismissed without clicking
      if (r.recurrence !== 'none') {
        const next = nextRemindAt(r.remindAt, r.recurrence)
        updateReminder(r.id, { remindAt: next, recurrence: r.recurrence, notes: r.notes })
      }
    }
  }

  const checkReminders = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const now = new Date()
    const shown = shownRef.current
    const due = data.reminders.filter(r => new Date(r.remindAt) <= now && shown[r.id] !== r.remindAt)
    if (due.length === 0) return

    due.forEach(r => {
      // Mark shown before firing so re-renders don't double-fire
      shownRef.current = { ...shownRef.current, [r.id]: r.remindAt }
      saveShown(shownRef.current)
      fireNotification(r)
    })
  }

  useEffect(() => {
    checkReminders()
    const id = setInterval(checkReminders, 30_000)
    return () => clearInterval(id)
  }, [data.reminders])

  return null  // no in-app UI — uses native OS notifications
}
