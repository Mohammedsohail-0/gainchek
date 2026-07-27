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
        toast.error("Couldn't load your plan")
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="loading-text">Loading your plan...</p>
  if (!plan) {
    return (
      <div>
        <h1 className="page-title">My Plan</h1>
        <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-icon">📋</div>
          <p>No active plan yet. Your trainer will assign one shortly.</p>
        </div>
      </div>
    )
  }

  const ordered = DAYS
    .map(d => plan.workoutSplits?.find(s => s.day?.toLowerCase() === d.toLowerCase()))
    .filter(Boolean)

  const currentSplit = ordered.find(s => s.id === selectedSplitId)

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      <h1 className="page-title">{plan.title}</h1>
      {plan.description && (
        <p className="page-subtitle">{plan.description}</p>
      )}

      {/* Day Tabs */}
      <div className="day-tabs" style={{ marginBottom: 24 }}>
        {ordered.map(s => {
          const isToday = s.day?.toLowerCase() === DAYS[new Date().getDay()].toLowerCase()
          return (
            <button
              key={s.id}
              className={`day-tab${selectedSplitId === s.id ? ' active' : ''}${s.isRestDay ? ' rest' : ''}`}
              onClick={() => setSelectedSplitId(s.id)}
              style={{ position: 'relative' }}
            >
              {s.day?.slice(0, 2)}
              {isToday && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)'
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Day Detail */}
      {!currentSplit ? (
        <p className="hint-text">Select a day above.</p>
      ) : currentSplit.isRestDay ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛌</div>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Rest Day</h3>
          <p style={{ color: 'var(--text-muted)' }}>Recovery is part of the program. Enjoy!</p>
        </div>
      ) : (
        <div>
          <div className="section-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="section-title">{currentSplit.name || `${currentSplit.day} Workout`}</div>
              {currentSplit.muscleGroups && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                  {currentSplit.muscleGroups}
                </div>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/client/log/${currentSplit.id}`)}
            >
              Log Workout →
            </button>
          </div>

          {(currentSplit.exercises || []).filter(ex => !ex.isArchived).map((ex) => (
            <div key={ex.id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{ex.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.muscleGroup}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(ex.exerciseSets || []).map(s => (
                  <div key={s.id} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)', padding: '6px 12px',
                    fontSize: '0.8rem', color: 'var(--text-secondary)'
                  }}>
                    Set {s.setNumber}: {s.reps} reps{s.weight != null ? ` @ ${s.weight}kg` : ''}
                  </div>
                ))}
              </div>
              {ex.notes && (
                <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                  {ex.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
