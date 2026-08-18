import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import api from '../services/api'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const navigate = useNavigate()
  const { token, role, name: userName } = useAuth()

  const [inviteInfo, setInviteInfo] = useState(null)
  const [checkingInvite, setCheckingInvite] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [accepting, setAccepting] = useState(false)

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
      const { login } = useAuth()
      login(res.data.token, res.data.role, res.data.name)
      const r = res.data.role?.toLowerCase()
      navigate(r === 'client' ? '/client' : r === 'coach' ? '/coach' : '/gym')
    } catch (err) {
      setError(err.response?.data?.error || 'Sign-up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoggedInAccept = async () => {
    setAccepting(true)
    setError('')
    try {
      const res = await api.post('/client/redeem-invite', { inviteCode })
      const r = role?.toLowerCase() || 'client'
      navigate(r === 'client' ? '/client' : r === 'coach' ? '/coach' : '/gym')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to accept invite.')
    } finally {
      setAccepting(false)
    }
  }

  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleConfigured = Boolean(
    rawClientId &&
    rawClientId !== 'your_google_client_id_here' &&
    rawClientId !== 'your-google-client-id.apps.googleusercontent.com'
  );

  if (!inviteCode) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            GainChek <span className="tick-mark">✓</span>
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Invite required</h2>
          <p className="auth-subtitle">
            To join as a client, ask your trainer for their invite link.
          </p>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" className="btn btn-secondary btn-full">
              Go to Sign In →
            </Link>
          </div>
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
        <div className="auth-logo">
          GainChek <span className="tick-mark">✓</span>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Join GainChek</h2>

        {checkingInvite && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            Validating invite link...
          </div>
        )}

        {!checkingInvite && error && (
          <div className="empty-state" style={{ margin: '16px 0' }}>
            <div className="empty-title" style={{ color: 'var(--error)' }}>Invalid Invite Link</div>
            <div className="empty-text">{error}</div>
            <Link to="/login" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
              Go to Sign In
            </Link>
          </div>
        )}

        {!checkingInvite && inviteInfo && !error && (
          <>
            {contextLine && (
              <div style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: 20,
                fontSize: '0.9rem',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span className="tick-mark">✓</span>
                <span>{contextLine}</span>
              </div>
            )}

            {token ? (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <p className="auth-subtitle" style={{ marginBottom: 16 }}>
                  You are signed in as <strong>{userName || 'Client'}</strong>.
                </p>
                <Button
                  variant="primary"
                  text={accepting ? 'Accepting invite...' : 'Accept Invite & Link Account'}
                  onClick={handleLoggedInAccept}
                  disabled={accepting}
                  style={{ width: '100%', marginBottom: 16 }}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Or sign in with a different Google account below:
                </p>
              </div>
            ) : (
              <p className="auth-subtitle">Sign in with Google to accept your invite and set up your account.</p>
            )}
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
                Processing account...
              </div>
            ) : (
              isGoogleConfigured && (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: token ? 8 : 16 }}>
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
