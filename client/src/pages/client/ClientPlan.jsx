import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ClientPlan() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSplitId, setSelectedSplitId] = useState(null)

  useEffect(() => {
    api.get('/client/plan')
      .then(res => {
        setPlan(res.data)
        const today = DAYS[new Date().getDay()]
        const todaySplit = res.data.workoutSplits?.find(s => s.day?.toLowerCase() === today.toLowerCase())
        setSelectedSplitId(todaySplit?.id || res.data.workoutSplits?.[0]?.id)
      })
      .catch(err => {
        if (err.response?.status === 404) return
        toast.error("Couldn't load active plan")
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading workout schedule...
      </div>
    )
  }

  if (!plan) {
    return (
      <div>
        <h1 className="page-title">My Workout Plan</h1>
        <div className="empty-state" style={{ marginTop: 24 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-title">No Active Plan Assigned</div>
          <div className="empty-text">Your trainer hasn't set up a workout plan for you yet. Reach out to your coach to get started!</div>
        </div>
      </div>
    )
  }

  const ordered = DAYS
    .map(d => plan.workoutSplits?.find(s => s.day?.toLowerCase() === d.toLowerCase()))
    .filter(Boolean)

  const currentSplit = ordered.find(s => s.id === selectedSplitId)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">{plan.title}</h1>
        {plan.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{plan.description}</p>
        )}
      </div>

      {/* Day Split Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 24 }}>
        {ordered.map(s => {
          const isToday = s.day?.toLowerCase() === DAYS[new Date().getDay()].toLowerCase()
          const isSelected = selectedSplitId === s.id
          return (
            <button
              key={s.id}
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minWidth: 60, position: 'relative' }}
              onClick={() => setSelectedSplitId(s.id)}
            >
              {s.day?.slice(0, 3)} {s.isRestDay ? '💤' : ''}
              {isToday && (
                <span className="tick-mark" style={{ fontSize: '0.75rem', marginLeft: 4 }}>
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Day Detail View */}
      {!currentSplit ? null : currentSplit.isRestDay ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛌</div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Rest & Recovery Day</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Focus on nutrition, hydration, and sleep to maximize gains.</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>{currentSplit.name || `${currentSplit.day} Session`}</h2>
              {currentSplit.muscleGroups && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  🎯 {currentSplit.muscleGroups}
                </p>
              )}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/client/log/${currentSplit.id}`)}
            >
              Log Workout Session →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(currentSplit.exercises || []).filter(ex => !ex.isArchived).map((ex) => (
              <div key={ex.id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>{ex.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ex.muscleGroup}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(ex.exerciseSets || []).map(s => (
                    <div
                      key={s.id}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)'
                      }}
                    >
                      Set {s.setNumber}: <strong>{s.reps} reps</strong> {s.weight != null ? `@ ${s.weight}kg` : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
