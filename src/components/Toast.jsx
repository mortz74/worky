import { useApp } from '../contexts/AppContext'

export default function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, padding: '10px 18px', borderRadius: 8, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,.15)', pointerEvents: 'none' }}>
      {toast.msg}
    </div>
  )
}
