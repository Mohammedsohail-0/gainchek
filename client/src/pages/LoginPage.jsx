import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Logo from '../components/Logo'
import Button from '../components/Button'
import '../pages/RegisterPage.css'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Multi-role picker state (accounts that have both coach + client profiles)
  const [pendingAuthData, setPendingAuthData] = useState(null)

  const { login } = useAuth()
  const navigate  = useNavigate()

  const goToDashboard = (role) => {
    const r = role?.toLowerCase()
    navigate(r === 'gym_owner' ? '/gym' : r === 'client' ? '/client' : '/coach')
  }

  const handleAuthSuccess = (data) => {
    if (data.multiRole) {
      setPendingAuthData({ token: data.token, role: data.role, name: data.name })
    } else {
      login(data.token, data.role, data.name)
      goToDashboard(data.role)
    }
  }

  const handleRolePick = (chosenRole) => {
    if (!pendingAuthData) return
    login(pendingAuthData.token, chosenRole, pendingAuthData.name)
    setPendingAuthData(null)
    goToDashboard(chosenRole)
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/email-login', { email: email.trim(), password })
      handleAuthSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/google', { credential: credentialResponse.credential })
      handleAuthSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Multi-role picker modal ────────────────────────────────────── */}
      {pendingAuthData && (
        <div className="role-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="role-picker-title">
          <div className="role-picker-card">
            <p className="role-picker-title" id="role-picker-title">Continue as…</p>
            <p className="role-picker-subtitle">
              Your account has both a trainer and client profile.<br />
              How would you like to log in today?
            </p>
            <div className="role-picker-options">
              <button id="login-as-coach-btn" className="role-picker-option" onClick={() => handleRolePick('COACH')}>
                <span className="role-picker-option-icon">🏋️</span>
                <span className="role-picker-option-text">
                  <strong>Login as Trainer</strong>
                  <span>Manage your clients and workout plans</span>
                </span>
              </button>
              <button id="login-as-client-btn" className="role-picker-option" onClick={() => handleRolePick('CLIENT')}>
                <span className="role-picker-option-icon">💪</span>
                <span className="role-picker-option-text">
                  <strong>Login as Client</strong>
                  <span>View your plan and log workouts</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main login card ──────────────────────────────────────────────── */}
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Logo height={34} textSize="1.5rem" />
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Welcome back</h2>
          <p className="auth-subtitle">Sign in to your GainChek account.</p>

          {error && (
            <div className="form-error" style={{ marginBottom: 16, textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Email / Password form */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              id="login-submit-btn"
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-secondary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-secondary)' }} />
          </div>

          {/* Google login */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              theme="filled_blue"
              size="large"
              width="320"
            />
          </div>

          <p style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)' }}>Create a free account</Link>
          </p>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Client? Ask your trainer for an invite link.
          </p>
        </div>
      </div>
    </>
  )
}

