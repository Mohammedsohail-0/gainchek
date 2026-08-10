import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Button from '../../components/Button'
import './CoachSettings.css'

export default function CoachSettings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form field
  const [name, setName] = useState('')

  // Gym invite input
  const [gymInviteInput, setGymInviteInput] = useState('')
  const [joiningGym, setJoiningGym] = useState(false)

  // Client invite generation
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [activeInvite, setActiveInvite] = useState(null) // { inviteCode, inviteLink }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/coach/profile')
        setProfile(res.data)
        setName(res.data.user?.name || '')
      } catch (err) {
        console.error(err)
        toast.error('Failed to load coach settings.')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.put('/coach/profile', { name })
      setProfile(res.data)
      toast.success('Profile updated successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleJoinGym = async () => {
    let code = gymInviteInput.trim()
    if (!code) {
      toast.error('Please enter a gym invite code or link.')
      return
    }

    if (code.includes('invite=')) {
      code = new URLSearchParams(code.split('?')[1] || '').get('invite') || code
    }

    setJoiningGym(true)
    try {
      const res = await api.post('/coach/join-gym', { inviteCode: code })
      setProfile(res.data)
      setGymInviteInput('')
      toast.success(`Successfully joined ${res.data.gym?.name || 'gym'}!`)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Failed to join gym.')
    } finally {
      setJoiningGym(false)
    }
  }

  const handleGenerateClientInvite = async () => {
    setGeneratingInvite(true)
    try {
      const res = await api.post('/coach/invite')
      setActiveInvite(res.data)
      toast.success('Client invite link generated!')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Failed to generate invite.')
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleCopyLink = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const [leavingGym, setLeavingGym] = useState(false)

  const handleLeaveGym = async () => {
    if (!window.confirm('Are you sure you want to leave your affiliated gym facility?')) return
    setLeavingGym(true)
    try {
      const res = await api.post('/coach/leave-gym')
      toast.success(res.data.message || 'Successfully left gym.')
      if (res.data.coach) setProfile(res.data.coach)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Failed to leave gym.')
    } finally {
      setLeavingGym(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading coach settings...
      </div>
    )
  }

  const gymName = profile?.gym?.name

  return (
    <div className="coach-settings-container">
      <div className="coach-settings-header">
        <h1 className="coach-settings-title">Coach Settings</h1>
        <p className="coach-settings-subtitle">Manage your profile, gym affiliation, and recruit new clients.</p>
      </div>

      {/* ── 1. Profile Details Form ── */}
      <form onSubmit={handleSaveProfile} className="coach-settings-card">
        <h2 className="coach-settings-card-title">Profile Details</h2>
        <div className="coach-field-group">
          <label className="coach-label">Display Name</label>
          <input
            type="text"
            className="coach-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </div>
        <div className="coach-field-group">
          <label className="coach-label">Email Address</label>
          <input
            type="email"
            className="coach-input"
            value={profile?.user?.email || ''}
            disabled
            style={{ opacity: 0.7, cursor: 'not-allowed' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button
            variant="primary"
            text={saving ? 'Saving...' : 'Save Profile'}
            type="submit"
            disabled={saving}
          />
        </div>
      </form>

      {/* ── 2. Gym Affiliation & Join Gym ── */}
      <div className="coach-settings-card">
        <h2 className="coach-settings-card-title">Gym Affiliation</h2>
        <div className="gym-info-badge" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {gymName ? gymName : 'Independent Coach'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {gymName ? 'Affiliated Gym Facility' : 'Not linked to a gym facility'}
            </span>
          </div>
          {gymName && (
            <Button
              variant="secondary"
              text={leavingGym ? 'Leaving...' : 'Leave Gym'}
              onClick={handleLeaveGym}
              disabled={leavingGym}
              style={{ fontSize: '0.85rem', padding: '6px 12px', borderColor: 'var(--error, #ff4d4f)', color: 'var(--error, #ff4d4f)' }}
            />
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="coach-label">Join a Gym via Invite Code / Link</label>
          {gymName ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
              You are currently affiliated with {gymName}. You must leave your current gym to join a new facility.
            </p>
          ) : (
            <div className="join-gym-input-row" style={{ marginTop: 6 }}>
              <input
                type="text"
                className="coach-input"
                placeholder="Paste gym invite code or link..."
                value={gymInviteInput}
                onChange={e => setGymInviteInput(e.target.value)}
              />
              <Button
                variant="secondary"
                text={joiningGym ? 'Joining...' : 'Join Gym'}
                onClick={handleJoinGym}
                disabled={joiningGym || !gymInviteInput.trim()}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Client Invitation Generator ── */}
      <div className="coach-settings-card">
        <h2 className="coach-settings-card-title">Client Invitations</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Generate a unique invite link or code to onboard new clients directly under your coaching account.
        </p>

        <Button
          variant="primary"
          text={generatingInvite ? 'Generating...' : 'Generate Client Invite Link'}
          onClick={handleGenerateClientInvite}
          disabled={generatingInvite}
        />

        {activeInvite && (
          <div className="invite-box-generated">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="coach-label">Invite Link</span>
              <span className="invite-code-pill">{activeInvite.inviteLink}</span>
            </div>
            <div className="invite-actions-row">
              <Button
                variant="secondary"
                text="Copy Invite Link"
                onClick={() => handleCopyLink(activeInvite.inviteLink, 'Invite link')}
                style={{ fontSize: '0.85rem', padding: '6px 14px' }}
              />
              <Button
                variant="secondary"
                text="Copy Code"
                onClick={() => handleCopyLink(activeInvite.inviteCode, 'Invite code')}
                style={{ fontSize: '0.85rem', padding: '6px 14px' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
