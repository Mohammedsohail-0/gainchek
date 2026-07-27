import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function SetRow({ exercise, setIdx, set, loggedSet, onUpdate, onCheck }) {
  return (
    <div className={`log-set-row${loggedSet?.done ? ' done' : ''}`}>
      {/* Set number */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {set.setNumber}
      </div>

      {/* Weight */}
      <input
        className="reps-input"
        type="number"
        value={loggedSet?.weight ?? set.weight ?? ''}
        onChange={e => onUpdate(setIdx, 'weight', e.target.value)}
        placeholder={set.weight != null ? `${set.weight}` : '—'}
      />

      {/* Reps */}
      <input
        className="reps-input"
        type="number"
        value={loggedSet?.reps ?? set.reps ?? ''}
        onChange={e => onUpdate(setIdx, 'reps', e.target.value)}
        placeholder={set.reps || '—'}
      />

      {/* Check */}
      <button
        className={`set-checkbox${loggedSet?.done ? ' checked' : ''}`}
        onClick={() => onCheck(setIdx)}
        aria-label={loggedSet?.done ? 'Undo' : 'Mark done'}
      >
        {loggedSet?.done && <CheckIcon />}
      </button>
    </div>
  )
}

export default function ClientWorkoutLog() {
  const { splitId } = useParams()
  const navigate = useNavigate()

  const [split, setSplit] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // logState[exerciseId][setIdx] = { weight, reps, done }
  const [logState, setLogState] = useState({})

  useEffect(() => {
    // Load the plan and find the split
    const load = async () => {
      try {
        const planRes = await api.get('/client/plan')
        setPlan(planRes.data)
        const found = planRes.data.workoutSplits?.find(s => s.id === splitId)
        if (!found) throw new Error('Split not found')
        setSplit(found)

        // Initialise log state from prescribed sets
        const init = {}
        ;(found.exercises || []).filter(ex => !ex.isArchived).forEach(ex => {
          init[ex.id] = (ex.exerciseSets || []).map(s => ({
            weight: s.weight ?? '',
            reps: s.reps ?? '',
            done: false,
          }))
        })
        setLogState(init)
      } catch {
        toast.error("Couldn't load workout")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [splitId])

  const updateSet = useCallback((exId, setIdx, field, value) => {
    setLogState(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
    }))
  }, [])

  const checkSet = useCallback((exId, setIdx) => {
    setLogState(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, done: !s.done } : s)
    }))
  }, [])

  const totalSets = split ? (split.exercises || []).filter(ex => !ex.isArchived).reduce((acc, ex) => acc + (ex.exerciseSets?.length || 0), 0) : 0

  const doneSets = Object.values(logState).reduce((acc, sets) => acc + sets.filter(s => s.done).length, 0)
  const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0

  const handleSubmit = async () => {
    if (!split || !plan) return

    const exercises = []
    ;(split.exercises || []).filter(ex => !ex.isArchived).forEach(ex => {
      const sets = logState[ex.id] || []
      sets.forEach((s, j) => {
        if (!s.done) return
        exercises.push({
          exerciseId: ex.id,
          setNumber: j + 1,
          weightUsed: s.weight !== '' && s.weight != null ? Number(s.weight) : null,
          repsActual: s.reps !== '' && s.reps != null ? Number(s.reps) : null,
        })
      })
    })

    if (exercises.length === 0) {
      toast.error('Check off at least one set to log the workout.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/log/workout', {
        planId: plan.id,
        splitId: split.id,
        note: note.trim() || null,
        exercises,
      })
      toast.success('Workout logged! Great work 💪')
      navigate('/client')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save workout')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="loading-text">Loading workout...</p>
  if (!split) return (
    <div className="empty-state">
      <div className="empty-icon">❌</div>
      <p>Workout not found.</p>
    </div>
  )

  const activeExercises = (split.exercises || []).filter(ex => !ex.isArchived)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: 2 }}>
            {split.name || split.day + ' Workout'}
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {split.muscleGroups}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>
            {doneSets}/{totalSets} sets
          </span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Exercises */}
      {activeExercises.map(ex => {
        const sets = logState[ex.id] || []
        return (
          <div key={ex.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{ex.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.muscleGroup}</div>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '4px 10px' }}>
                {sets.filter(s => s.done).length}/{sets.length} done
              </span>
            </div>

            {/* Sets header */}
            <div className="log-sets-header">
              <span style={{ textAlign: 'center' }}>SET</span>
              <span style={{ textAlign: 'center' }}>KG</span>
              <span style={{ textAlign: 'center' }}>REPS</span>
              <span />
            </div>

            {/* Set rows */}
            {(ex.exerciseSets || []).map((s, si) => (
              <SetRow
                key={s.id}
                exercise={ex}
                setIdx={si}
                set={s}
                loggedSet={sets[si]}
                onUpdate={(idx, field, val) => updateSet(ex.id, idx, field, val)}
                onCheck={(idx) => checkSet(ex.id, idx)}
              />
            ))}

            {ex.notes && (
              <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                💡 {ex.notes}
              </p>
            )}
          </div>
        )
      })}

      {/* Note */}
      <div className="card" style={{ marginBottom: 24 }}>
        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Session Note (optional)</label>
        <textarea
          className="form-textarea"
          placeholder="How did this session feel? Any PRs? Notes for your trainer…"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
        />
      </div>

      {/* Submit */}
      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={handleSubmit}
        disabled={submitting || doneSets === 0}
        style={{ marginBottom: 32 }}
      >
        {submitting ? 'Saving…' : `Finish Workout${doneSets > 0 ? ` (${doneSets} sets)` : ''} 💪`}
      </button>

      {doneSets === 0 && (
        <p className="log-progress-note">Check off at least one set to finish.</p>
      )}
    </div>
  )
}
