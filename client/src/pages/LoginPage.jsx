import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

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
        <div className="auth-logo">
          <span>Gain</span><span className="logo-accent">Chek</span>
        </div>
        <h2>Welcome back</h2>
        <p className="auth-subtitle">
          Sign in with Google or use Quick Demo Sign In. New here? Your account is created automatically.
        </p>

        {!isGoogleConfigured && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--r-md, 8px)',
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: '0.8rem',
            color: '#fca5a5'
          }}>
            ⚠️ Google Client ID is unconfigured in <code>client/.env</code>. You can use <strong>Quick Demo Sign In</strong> below!
          </div>
        )}

        {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}

        {/* Role selector — only for new account creation guidance */}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
          SIGN IN AS
        </p>
        <div className="role-selector" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
          {ROLES.map(r => (
            <button
              key={r.value}
              className={`role-option${selectedRole === r.value ? ' selected' : ''}`}
              onClick={() => setSelectedRole(r.value)}
              type="button"
            >
              <span className="role-icon">{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {selectedRole === 'GYM_OWNER' && (
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Gym Name (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Iron Temple Fitness"
              value={gymName}
              onChange={e => setGymName(e.target.value)}
            />
            <p className="hint-text" style={{ marginTop: 4 }}>Leave blank to use your name</p>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <span className="spinner" />
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

        <p style={{ marginTop: 24, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Client? Use the invite link from your trainer.
        </p>
      </div>
    </div>
  )
}
