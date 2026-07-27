import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const navigate = useNavigate()
  const { login } = useAuth()

  const [inviteInfo, setInviteInfo] = useState(null)
  const [checkingInvite, setCheckingInvite] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!inviteCode) {
      setCheckingInvite(false)
      return
    }
    api.get(`/auth/validate-invite/${inviteCode}`)
      .then(res => setInviteInfo(res.data))
      .catch(err => setError(err.response?.data?.error || 'Invalid or expired invite link.'))
      .finally(() => setCheckingInvite(false))
  }, [inviteCode])

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/google', {
        credential: tokenResponse.access_token,
        inviteCode,
      })
      login(res.data.token, res.data.role, res.data.name)
      const r = res.data.role?.toLowerCase()
      navigate(r === 'client' ? '/client' : r === 'coach' ? '/coach' : '/gym')
    } catch (err) {
      setError(err.response?.data?.error || 'Sign-up failed. Please try again.')
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
    onError: () => setError('Google sign-in failed.'),
  })

  const handleSignInClick = () => {
    if (!isGoogleConfigured) {
      setError('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in client/.env.')
      return
    }
    googleLogin()
  }

  // No invite code
  if (!inviteCode) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo"><span>Gain</span><span className="logo-accent">Chek</span></div>
          <h2>You need an invite link</h2>
          <p className="auth-subtitle">
            To join as a client, ask your trainer to send you their invite link.
            You can't sign up as a client without one.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Are you a trainer or gym owner? <a href="/login">Sign in here</a>.
          </p>
        </div>
      </div>
    )
  }

  const contextLine = inviteInfo?.type === 'GYM_TO_COACH'
    ? `You've been invited to join ${inviteInfo.gymName || 'a gym'} as a trainer.`
    : inviteInfo?.type === 'COACH_TO_CLIENT'
    ? `You've been invited to train with ${inviteInfo.coachName || 'a trainer'}.`
    : ''

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><span>Gain</span><span className="logo-accent">Chek</span></div>
        <h2>Join GainChek</h2>

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

        {checkingInvite && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <span className="spinner" />
            <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.875rem' }}>
              Validating invite link...
            </p>
          </div>
        )}

        {!checkingInvite && error && (
          <>
            <p className="error-text" style={{ margin: '16px 0' }}>{error}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <a href="/login">Go to sign in →</a>
            </p>
          </>
        )}

        {!checkingInvite && inviteInfo && !error && (
          <>
            {contextLine && (
              <div style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--border-focus)',
                borderRadius: 'var(--r-md)',
                padding: '12px 16px',
                marginBottom: 24,
                fontSize: '0.875rem',
                color: 'var(--accent)',
              }}>
                {contextLine}
              </div>
            )}
            <p className="auth-subtitle">Sign in with Google to create your account.</p>
            {error && <p className="error-text" style={{ marginBottom: 16 }}>{error}</p>}
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
                Continue with Google
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
