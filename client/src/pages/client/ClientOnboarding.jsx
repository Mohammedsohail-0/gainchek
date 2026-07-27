import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const GOALS = [
  { value: 'BUILD_MUSCLE', label: 'Build Muscle', icon: '💪', desc: 'Hypertrophy & size' },
  { value: 'LOSE_FAT', label: 'Lose Fat', icon: '🔥', desc: 'Cut & lean out' },
  { value: 'GET_STRONGER', label: 'Get Stronger', icon: '🏋️', desc: 'Strength & power' },
  { value: 'GENERAL_FITNESS', label: 'General Fitness', icon: '⚡', desc: 'Health & wellness' },
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
      toast.success('Profile set up! Welcome to GainChek.')
      navigate('/client')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(0,229,200,0.06) 0%, transparent 60%), var(--bg-base)'
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.6rem' }}>
            <span>Gain</span><span style={{ color: 'var(--accent)' }}>Chek</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Let's set up your profile</p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {[1, 2].map(n => (
            <div key={n} style={{
              width: step > n ? 24 : 8, height: 8, borderRadius: 4,
              background: step >= n ? 'var(--accent)' : 'var(--bg-card-2)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {/* ─── Step 1: Goal ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: 8, textAlign: 'center' }}>
              What's your primary goal?
            </h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 28, fontSize: '0.9rem' }}>
              This helps your trainer customise your experience.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px',
                    background: goal === g.value ? 'var(--accent-dim)' : 'var(--bg-card)',
                    border: `1px solid ${goal === g.value ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s', color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ fontSize: '1.6rem' }}>{g.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{g.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{g.desc}</div>
                  </div>
                  {goal === g.value && (
                    <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '1.1rem' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-full" disabled={!goal} onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        )}

        {/* ─── Step 2: Body Stats ───────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: 8, textAlign: 'center' }}>
              Tell us about yourself
            </h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 28, fontSize: '0.9rem' }}>
              Optional, but helps your trainer. You can update this any time.
            </p>
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Current Weight (kg)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 75"
                  value={bodyWeight}
                  onChange={e => setBodyWeight(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
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
                <select className="form-select" value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={handleFinish}>
                {saving ? 'Saving…' : "Let's go! 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
