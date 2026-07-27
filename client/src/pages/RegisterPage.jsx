import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
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
              isGoogleConfigured && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-in failed. Please try again.')}
                    theme="filled_blue"
                    size="large"
                    width="100%"
                  />
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
