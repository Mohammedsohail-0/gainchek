import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Logo from '../components/Logo'
import api from '../services/api'
import './RegisterPage.css'

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const navigate = useNavigate()
  const { token, role, name: userName, login } = useAuth()

  // ── Invite-code flow state ──────────────────────────────────────────────
  const [inviteInfo, setInviteInfo] = useState(null)
  const [checkingInvite, setCheckingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    if (!inviteCode) {
      setCheckingInvite(false)
      return
    }
    api.get(`/auth/validate-invite/${inviteCode}`)
      .then(res => setInviteInfo(res.data))
      .catch(err => setInviteError(err.response?.data?.error || 'Invalid or expired invite link.'))
      .finally(() => setCheckingInvite(false))
  }, [inviteCode])

  const handleGoogleInviteSuccess = async (credentialResponse) => {
    setInviteLoading(true)
    setInviteError('')
    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        inviteCode,
      })
      login(res.data.token, res.data.role, res.data.name)
      const r = res.data.role?.toLowerCase()
      navigate(r === 'client' ? '/client' : r === 'coach' ? '/coach' : '/gym')
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Sign-up failed. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleLoggedInAccept = async () => {
    setAccepting(true)
    setInviteError('')
    try {
      await api.post('/client/redeem-invite', { inviteCode })
      const r = role?.toLowerCase() || 'client'
      navigate(r === 'client' ? '/client' : r === 'coach' ? '/coach' : '/gym')
    } catch (err) {
      setInviteError(err.response?.data?.error || err.response?.data?.message || 'Failed to accept invite.')
    } finally {
      setAccepting(false)
    }
  }

  // ── Coach sign-up flow state ────────────────────────────────────────────
  // step: 'method' | 'email-form' | 'otp' | 'google'
  const [step, setStep] = useState('method')
  const [coachName, setCoachName] = useState('')
  const [coachEmail, setCoachEmail] = useState('')
  const [pendingId, setPendingId] = useState(null)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef([])

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const isGoogleConfigured = Boolean(
    import.meta.env.VITE_GOOGLE_CLIENT_ID &&
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your_google_client_id_here' &&
    import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com'
  )

  // ── Google coach sign-up ────────────────────────────────────────────────
  const handleGoogleCoachSuccess = async (credentialResponse) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        role: 'COACH',
      })
      login(res.data.token, res.data.role, res.data.name)
      // New coaches go to settings to complete profile; existing go to dashboard
      navigate('/coach/settings?onboard=1')
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-up failed. Please try again.')
      setLoading(false)
    }
  }

  // ── Email sign-up: send OTP ─────────────────────────────────────────────
  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (!coachName.trim()) { setError('Please enter your name.'); return }
    if (!coachEmail.trim()) { setError('Please enter your email.'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/email-signup', { email: coachEmail.trim(), name: coachName.trim() })
      setPendingId(res.data.pendingId)
      setStep('otp')
      setResendCooldown(60)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP input helpers ───────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  // ── Email OTP verification ──────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    const otpCode = otp.join('')
    if (otpCode.length < 6) { setError('Please enter the full 6-digit code.'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-email', { pendingId, otp: otpCode })
      login(res.data.token, res.data.role, res.data.name)
      navigate('/coach/settings?onboard=1')
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/email-signup', { email: coachEmail.trim(), name: coachName.trim() })
      setPendingId(res.data.pendingId)
      setOtp(['', '', '', '', '', ''])
      setResendCooldown(60)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Invite-code flow render ─────────────────────────────────────────────
  if (inviteCode) {
    const contextLine = inviteInfo?.type === 'GYM_TO_COACH'
      ? `You've been invited to join ${inviteInfo.gymName || 'a gym'} as a trainer.`
      : inviteInfo?.type === 'COACH_TO_CLIENT'
      ? `You've been invited to train with ${inviteInfo.coachName || 'a trainer'}.`
      : ''

    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Logo height={34} textSize="1.5rem" />
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Join GainChek</h2>

          {checkingInvite && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
              Validating invite link...
            </div>
          )}

          {!checkingInvite && inviteError && (
            <div className="empty-state" style={{ margin: '16px 0' }}>
              <div className="empty-title" style={{ color: 'var(--error)' }}>Invalid Invite Link</div>
              <div className="empty-text">{inviteError}</div>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
                Go to Sign In
              </Link>
            </div>
          )}

          {!checkingInvite && inviteInfo && !inviteError && (
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

              {inviteLoading ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
                  Processing account...
                </div>
              ) : (
                isGoogleConfigured && (
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: token ? 8 : 16 }}>
                    <GoogleLogin
                      onSuccess={handleGoogleInviteSuccess}
                      onError={() => setInviteError('Google sign-in failed. Please try again.')}
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

  // ── Coach sign-up flow ──────────────────────────────────────────────────
  return (
    <div className="auth-page register-page">
      <div className="auth-card register-card">

        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Logo height={34} textSize="1.5rem" />
        </div>

        {/* Back arrow for sub-steps */}
        {step !== 'method' && (
          <button
            className="register-back-btn"
            onClick={() => { setStep(step === 'otp' ? 'email-form' : 'method'); setError('') }}
            aria-label="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M400-80 40-440l360-360 56 57-263 263h727v80H193l263 263-56 57Z"/>
            </svg>
            Back
          </button>
        )}

        {/* ── Step: Method chooser ── */}
        {step === 'method' && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 6 }}>Start for free</h2>
            <p className="auth-subtitle" style={{ marginBottom: 28 }}>
              Create your trainer account — no credit card needed.
            </p>

            {error && <div className="form-error" style={{ marginBottom: 16, textAlign: 'center' }}>⚠️ {error}</div>}

            <div className="register-methods">
              {isGoogleConfigured && !loading && (
                <div className="register-method-google">
                  <p className="register-method-label">Continue with Google</p>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                      onSuccess={handleGoogleCoachSuccess}
                      onError={() => setError('Google sign-up failed. Please try again.')}
                      theme="filled_blue"
                      size="large"
                      text="signup_with"
                      width="320"
                    />
                  </div>
                </div>
              )}

              {loading && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
                  Creating your account...
                </div>
              )}

              {!loading && (
                <>
                  {isGoogleConfigured && (
                    <div className="register-divider">
                      <span>or</span>
                    </div>
                  )}

                  <button
                    id="signup-with-email-btn"
                    className="btn btn-secondary btn-full register-email-btn"
                    onClick={() => { setStep('email-form'); setError('') }}
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                      <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/>
                    </svg>
                    Sign up with Email
                  </button>
                </>
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 28 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
            </p>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
              Client? Ask your trainer for their invite link.
            </p>
          </>
        )}

        {/* ── Step: Email form ── */}
        {step === 'email-form' && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 6 }}>Create your account</h2>
            <p className="auth-subtitle" style={{ marginBottom: 24 }}>
              We'll send a verification code to your email.
            </p>

            {error && <div className="form-error" style={{ marginBottom: 16, textAlign: 'center' }}>⚠️ {error}</div>}

            <form onSubmit={handleEmailSignup} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="coach-name">Your Name</label>
                <input
                  id="coach-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Johnson"
                  value={coachName}
                  onChange={e => setCoachName(e.target.value)}
                  autoFocus
                  autoComplete="name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="coach-email">Email Address</label>
                <input
                  id="coach-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={coachEmail}
                  onChange={e => setCoachEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <Button
                variant="primary"
                text={loading ? 'Sending code...' : 'Send Verification Code'}
                type="submit"
                disabled={loading}
                style={{ width: '100%', marginTop: 8 }}
              />
            </form>
          </>
        )}

        {/* ── Step: OTP verification ── */}
        {step === 'otp' && (
          <>
            <div className="otp-header">
              <div className="otp-email-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="currentColor">
                  <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/>
                </svg>
              </div>
              <h2 style={{ marginBottom: 6 }}>Check your email</h2>
              <p className="auth-subtitle" style={{ marginBottom: 0 }}>
                We sent a 6-digit code to<br />
                <strong style={{ color: 'var(--text-primary)' }}>{coachEmail}</strong>
              </p>
            </div>

            {error && <div className="form-error" style={{ margin: '12px 0', textAlign: 'center' }}>⚠️ {error}</div>}

            <form onSubmit={handleVerifyOtp} noValidate>
              <div className="otp-inputs" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    id={`otp-digit-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`otp-digit ${digit ? 'filled' : ''}`}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="primary"
                text={loading ? 'Verifying...' : 'Verify & Create Account'}
                type="submit"
                disabled={loading || otp.join('').length < 6}
                style={{ width: '100%', marginTop: 20 }}
              />
            </form>

            <div className="otp-resend">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Didn't get the code?{' '}
                {resendCooldown > 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    Resend
                  </button>
                )}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Code expires in 10 minutes
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
