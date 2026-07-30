import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Logo from '../components/Logo'

const ROLES = [
  { value: 'COACH', label: 'Trainer', icon: '🏋️' },
  { value: 'GYM_OWNER', label: 'Gym Owner', icon: '🏢' },
]

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('COACH')
  const [gymName, setGymName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        role: selectedRole,
        gymName: selectedRole === 'GYM_OWNER' ? gymName : undefined,
      })
      login(res.data.token, res.data.role, res.data.name)

      const r = res.data.role?.toLowerCase()
      navigate(r === 'gym_owner' ? '/gym' : r === 'client' ? '/client' : '/coach')
    } catch (err) {
      setError(err.response?.data?.error || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleConfigured = Boolean(
    rawClientId &&
    rawClientId !== 'your_google_client_id_here' &&
    rawClientId !== 'your-google-client-id.apps.googleusercontent.com'
  );

  const handleDevSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/dev-login', {
        role: selectedRole,
        gymName: selectedRole === 'GYM_OWNER' ? gymName : undefined,
      })
      login(res.data.token, res.data.role, res.data.name)
      const r = res.data.role?.toLowerCase()
      navigate(r === 'gym_owner' ? '/gym' : r === 'client' ? '/client' : '/coach')
    } catch (err) {
      setError(err.response?.data?.error || 'Dev sign-in failed. Ensure backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Logo height={34} textSize="1.5rem" />
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Welcome back</h2>
        <p className="auth-subtitle">
          Sign in to your account. Select your role below.
        </p>

        {!isGoogleConfigured && (
          <div style={{
            background: 'var(--surface-hover)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: 20,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            💡 Google Sign-In unconfigured. Use <strong>Quick Demo Sign In</strong> below.
          </div>
        )}

        {error && (
          <div className="form-error" style={{ marginBottom: 16, textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Select Role</label>
          <div className="role-selector">
            {ROLES.map(r => (
              <button
                key={r.value}
                className={`role-option${selectedRole === r.value ? ' selected' : ''}`}
                onClick={() => setSelectedRole(r.value)}
                type="button"
              >
                <span style={{ fontSize: '1.5rem' }}>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedRole === 'GYM_OWNER' && (
          <div className="form-group">
            <label className="form-label">Gym Name (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Iron Temple Fitness"
              value={gymName}
              onChange={e => setGymName(e.target.value)}
            />
            <span className="form-help">Leave blank to use default name</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
            Signing in...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-primary btn-full" onClick={handleDevSignIn} type="button">
              ⚡ Quick Demo Sign In ({selectedRole === 'GYM_OWNER' ? 'Gym Owner' : 'Trainer'})
            </button>

            {isGoogleConfigured && (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed. Please try again.')}
                  theme="filled_blue"
                  size="large"
                  width="100%"
                />
              </div>
            )}
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Client? Ask your trainer for an invite link to register.
        </p>
      </div>
    </div>
  )
}
