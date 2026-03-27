import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [tab, setTab]         = useState('signin')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async e => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/dashboard')
  }

  const handleSignUp = async e => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
    const { data: authData, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name, initials } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (authData.user) {
      await sb.from('owners').insert({ user_id: authData.user.id, name, email, role: 'Owner', color: '#2563eb', initials })
    }
    setLoading(false)
    setSuccess('Account created! Check your email to confirm, then sign in.')
  }

  return (
    <div id="loginScreen">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="28" height="28"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div className="login-logo-text">Wor<span>ky</span></div>
          <div className="login-subtitle">Your smart task workspace</div>
        </div>

        <div className="login-tabs">
          <div className={`login-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => setTab('signin')}>Sign In</div>
          <div className={`login-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => setTab('signup')}>Sign Up</div>
        </div>

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn}>
            <div className="login-form-group">
              <label className="login-label">Email</label>
              <input className="login-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="login-form-group">
              <label className="login-label">Password</label>
              <input className="login-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error   && <div className="login-error visible">{error}</div>}
            {success && <div className="login-success visible">{success}</div>}
            <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <div className="login-form-group">
              <label className="login-label">Full Name</label>
              <input className="login-input" type="text" placeholder="Amit Kumar" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="login-form-group">
              <label className="login-label">Email</label>
              <input className="login-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="login-form-group">
              <label className="login-label">Password</label>
              <input className="login-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error   && <div className="login-error visible">{error}</div>}
            {success && <div className="login-success visible">{success}</div>}
            <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create Account'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
