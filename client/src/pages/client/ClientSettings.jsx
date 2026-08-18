import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Button from '../../components/Button'
import './ClientSettings.css'

const GOAL_OPTIONS = [
  { value: 'BUILD_MUSCLE', label: 'Build Muscle' },
  { value: 'LOSE_FAT', label: 'Lose Fat' },
  { value: 'GET_STRONGER', label: 'Get Stronger' },
  { value: 'GENERAL_FITNESS', label: 'General Fitness' },
]

const calculateAgeFromDob = (dobString) => {
  if (!dobString) return null
  const birthDate = new Date(dobString)
  if (isNaN(birthDate.getTime())) return null
  const today = new Date()
  let ageVal = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    ageVal--
  }
  return ageVal >= 0 ? ageVal : null
}

export default function ClientSettings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [goal, setGoal] = useState('BUILD_MUSCLE')

  // Invite code input
  const [inviteInput, setInviteInput] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/client/profile')
        setProfile(res.data)
        setName(res.data.name || res.data.user?.name || '')
        if (res.data.dob) {
          const formattedDob = new Date(res.data.dob).toISOString().split('T')[0]
          setDob(formattedDob)
        }
        setGender(res.data.gender || '')
        setBodyWeight(res.data.bodyWeight ? String(res.data.bodyWeight) : '')
        setGoal(res.data.goal || 'BUILD_MUSCLE')
      } catch (err) {
        console.error(err)
        toast.error('Failed to load profile settings.')
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
      const computedAge = calculateAgeFromDob(dob)
      const payload = {
        name,
        goal,
        dob: dob || null,
        age: computedAge,
        gender: gender || null,
        bodyWeight: bodyWeight ? Number(bodyWeight) : null,
      }
      const res = await api.put('/client/profile', payload)
      setProfile(prev => ({ ...prev, ...res.data }))
      toast.success('Profile updated successfully!')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleRedeemInvite = async () => {
    let code = inviteInput.trim()
    if (!code) {
      toast.error('Please enter an invite code or link.')
      return
    }

    if (code.includes('invite=')) {
      code = new URLSearchParams(code.split('?')[1] || '').get('invite') || code
    } else if (code.includes('/invite/')) {
      code = code.split('/invite/')[1].split('?')[0].split('/')[0] || code
    }

    setRedeeming(true)
    try {
      const res = await api.post('/client/redeem-invite', { inviteCode: code })
      toast.success(res.data.message || 'Invite redeemed successfully!')
      if (res.data.profile) {
        setProfile(res.data.profile)
      }
      setInviteInput('')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to redeem invite.')
    } finally {
      setRedeeming(false)
    }
  }

  const [leavingCoach, setLeavingCoach] = useState(false)
  const [leavingGym, setLeavingGym] = useState(false)

  const handleLeaveCoach = async () => {
    if (!window.confirm('Are you sure you want to leave your personal trainer?')) return
    setLeavingCoach(true)
    try {
      const res = await api.post('/client/leave-coach')
      toast.success(res.data.message || 'Successfully left trainer.')
      if (res.data.profile) setProfile(res.data.profile)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Failed to leave trainer.')
    } finally {
      setLeavingCoach(false)
    }
  }

  const handleLeaveGym = async () => {
    if (!window.confirm('Are you sure you want to leave your gym facility?')) return
    setLeavingGym(true)
    try {
      const res = await api.post('/client/leave-gym')
      toast.success(res.data.message || 'Successfully left gym.')
      if (res.data.profile) setProfile(res.data.profile)
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
        Loading settings...
      </div>
    )
  }

  const trainerName = profile?.coach?.user?.name || profile?.coach?.name
  const trainerEmail = profile?.coach?.user?.email
  const gymName = profile?.coach?.gym?.name || profile?.memberships?.find(m => m.isActive)?.gym?.name
  const calculatedAge = calculateAgeFromDob(dob) ?? profile?.age

  return (
    <div className="settings-page-container">
      <div className="settings-header">
        <h1 className="settings-title">Account Settings</h1>
        <p className="settings-subtitle">Manage your personal profile, fitness goals, and trainer links.</p>
      </div>

      {/* ── 1. Profile Details Form ── */}
      <form onSubmit={handleSaveProfile} className="settings-card">
        <h2 className="settings-card-title">Profile Details</h2>
        <div className="settings-form-grid">
          <div className="settings-field-group full-width">
            <label className="settings-label">Full Name</label>
            <input
              type="text"
              className="settings-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="settings-field-group">
            <label className="settings-label">Birth Date</label>
            <input
              type="date"
              className="settings-input"
              value={dob}
              onChange={e => setDob(e.target.value)}
            />
          </div>

          <div className="settings-field-group">
            <label className="settings-label">Age</label>
            <div className="settings-read-only-value">
              {calculatedAge !== null && calculatedAge !== undefined ? `${calculatedAge} years` : 'Not set'}
            </div>
          </div>

          <div className="settings-field-group">
            <label className="settings-label">Gender</label>
            <select
              className="settings-select"
              value={gender}
              onChange={e => setGender(e.target.value)}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="settings-field-group">
            <label className="settings-label">Body Weight (kg)</label>
            <input
              type="number"
              className="settings-input"
              value={bodyWeight}
              onChange={e => setBodyWeight(e.target.value)}
              placeholder="kg"
              min="1"
              step="0.1"
            />
          </div>

          <div className="settings-field-group full-width">
            <label className="settings-label">Fitness Goal</label>
            <select
              className="settings-select"
              value={goal}
              onChange={e => setGoal(e.target.value)}
            >
              {GOAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            text={saving ? 'Saving...' : 'Save Profile'}
            type="submit"
            disabled={saving}
          />
        </div>
      </form>

      {/* ── 2. Trainer & Gym Connection ── */}
      <div className="settings-card">
        <h2 className="settings-card-title">Trainer & Gym Affiliation</h2>

        <div className="settings-info-box" style={{ justifyContent: 'space-between' }}>
          <div className="info-content">
            <span className="info-title">Personal Trainer</span>
            <span className="info-sub">
              {trainerName ? `${trainerName} (${trainerEmail || 'Linked'})` : 'No personal trainer assigned'}
            </span>
          </div>
          {trainerName && (
            <Button
              variant="secondary"
              text={leavingCoach ? 'Leaving...' : 'Leave Trainer'}
              onClick={handleLeaveCoach}
              disabled={leavingCoach}
              style={{ fontSize: '0.85rem', padding: '6px 12px', borderColor: 'var(--error, #ff4d4f)', color: 'var(--error, #ff4d4f)' }}
            />
          )}
        </div>

        <div className="settings-info-box" style={{ justifyContent: 'space-between' }}>
          <div className="info-content">
            <span className="info-title">Gym Facility</span>
            <span className="info-sub">
              {gymName ? gymName : 'No gym facility linked'}
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
          <label className="settings-label">Join a Gym or Trainer via Invite Code / Link</label>
          {trainerName && gymName ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
              You are currently linked to both a personal trainer and a gym facility. Leave your current trainer or gym to join a new one.
            </p>
          ) : (
            <div className="invite-input-row">
              <input
                type="text"
                className="settings-input"
                placeholder="Paste invite code or link here..."
                value={inviteInput}
                onChange={e => setInviteInput(e.target.value)}
              />
              <Button
                variant="secondary"
                text={redeeming ? 'Joining...' : 'Redeem'}
                onClick={handleRedeemInvite}
                disabled={redeeming || !inviteInput.trim()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
