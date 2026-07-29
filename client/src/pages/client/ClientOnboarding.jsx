import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const GOALS = [
  { value: 'BUILD_MUSCLE', label: 'Build Muscle', icon: '💪', desc: 'Hypertrophy & size' },
  { value: 'LOSE_FAT', label: 'Lose Fat', icon: '🔥', desc: 'Cut & lean out' },
  { value: 'GET_STRONGER', label: 'Get Stronger', icon: '🏋️', desc: 'Strength & power' },
  { value: 'GENERAL_FITNESS', label: 'General Fitness', icon: '⚡', desc: 'Health & overall wellness' },
]

export default function ClientOnboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [bodyWeight, setBodyWeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFinish = async () => {
    setSaving(true)
    try {
      await api.put('/client/profile', {
        goal,
        bodyWeight: bodyWeight ? Number(bodyWeight) : undefined,
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
      })
      toast.success('Profile set up! Welcome to GainChek ✓')
      navigate('/client')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        {/* Brand Header */}
        <div className="auth-logo">
          GainChek <span className="tick-mark">✓</span>
        </div>
        <p className="auth-subtitle">Let's personalize your training profile</p>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2].map(n => (
            <div
              key={n}
              style={{
                width: step === n ? 32 : 12,
                height: 6,
                borderRadius: 'var(--radius-full)',
                background: step >= n ? 'var(--accent)' : 'var(--border-secondary)',
                transition: 'all var(--transition-fast)'
              }}
            />
          ))}
        </div>

        {/* ─── Step 1: Goal ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.25rem' }}>
              What's your primary goal?
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
              Your trainer uses this to build your workout splits.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {GOALS.map(g => {
                const isSelected = goal === g.value
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: 14,
                      background: isSelected ? 'var(--accent-dim)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-secondary)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{g.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {g.label}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {g.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="tick-mark" style={{ fontSize: '1.2rem' }}>✓</span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              className="btn btn-primary btn-full"
              disabled={!goal}
              onClick={() => setStep(2)}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ─── Step 2: Body Stats ───────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.25rem' }}>
              Tell us about yourself
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
              Optional details to help track your progress over time.
            </p>

            <div style={{ marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label">Current Weight (kg)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 75"
                  value={bodyWeight}
                  onChange={e => setBodyWeight(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 25"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={saving}
                onClick={handleFinish}
              >
                {saving ? 'Saving...' : 'Finish Setup ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
