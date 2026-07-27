import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
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

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true)
    setError('')
    try {
      // Exchange access token for id token via userinfo
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      }).then(r => r.json())

      const res = await api.post('/auth/google', {
        credential: tokenResponse.access_token,
        role: selectedRole,
        gymName: selectedRole === 'GYM_OWNER' ? gymName : undefined,
        _userInfo: userInfo,
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

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google sign-in failed. Please try again.'),
  })

  const handleSignInClick = () => {
    if (!isGoogleConfigured) {
      setError('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in client/.env.')
      return
    }
    googleLogin()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span>Gain</span><span className="logo-accent">Chek</span>
        </div>
        <h2>Welcome back</h2>
        <p className="auth-subtitle">
          Sign in with Google. New here as a trainer or gym owner? Your account is created automatically on first sign-in.
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
            ⚠️ Google Client ID is not configured. Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>client/.env</code>.
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

        <div className="auth-divider">or continue with</div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <span className="spinner" />
          </div>
        ) : (
          <button className="btn btn-secondary btn-full" onClick={handleSignInClick}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        )}

        <p style={{ marginTop: 24, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Client? Use the invite link from your trainer.
        </p>
      </div>
    </div>
  )
}
