import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

function SetRow({ setIdx, set, loggedSet, onUpdate, onCheck }) {
  const isDone = loggedSet?.done
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 1fr 1fr 48px',
      gap: 8,
      marginBottom: 8,
      alignItems: 'center',
      padding: '6px 8px',
      borderRadius: 'var(--radius-md)',
      background: isDone ? 'var(--accent-dim)' : 'transparent',
      border: `1px solid ${isDone ? 'var(--accent)' : 'transparent'}`,
      transition: 'all var(--transition-fast)'
    }}>
      {/* Set Number */}
      <div style={{ textAlign: 'center', color: isDone ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>
        {set.setNumber}
      </div>

      {/* Weight Input */}
      <input
        className="form-input"
        type="number"
        value={loggedSet?.weight ?? set.weight ?? ''}
        onChange={e => onUpdate(setIdx, 'weight', e.target.value)}
        placeholder={set.weight != null ? `${set.weight}` : '—'}
        style={{ textAlign: 'center', minHeight: 40, padding: '4px 8px' }}
      />

      {/* Reps Input */}
      <input
        className="form-input"
        type="number"
        value={loggedSet?.reps ?? set.reps ?? ''}
        onChange={e => onUpdate(setIdx, 'reps', e.target.value)}
        placeholder={set.reps || '—'}
        style={{ textAlign: 'center', minHeight: 40, padding: '4px 8px' }}
      />

      {/* Check Mark Button */}
      <button
        type="button"
        className={`btn btn-sm ${isDone ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => onCheck(setIdx)}
        aria-label={isDone ? 'Mark set incomplete' : 'Mark set completed'}
        style={{ minHeight: 40, width: 44, padding: 0, fontSize: '1.1rem' }}
      >
        {isDone ? '✓' : ''}
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
    const load = async () => {
      try {
        const planRes = await api.get('/client/plan')
        setPlan(planRes.data)
        const found = planRes.data.workoutSplits?.find(s => s.id === splitId)
        if (!found) throw new Error('Split not found')
        setSplit(found)

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
        toast.error("Couldn't load workout session")
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
  const progressPercent = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0

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
      toast.error('Tap ✓ to complete at least one set before logging.')
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
      toast.success('Workout logged! Great session ✓')
      navigate('/client')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save workout log')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading workout session...
      </div>
    )
  }

  if (!split) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <div className="empty-title">Workout Session Not Found</div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/client')} style={{ marginTop: 12 }}>
          Back to Home
        </button>
      </div>
    )
  }

  const activeExercises = (split.exercises || []).filter(ex => !ex.isArchived)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: '1.3rem', marginBottom: 2 }}>
            {split.name || `${split.day} Session`}
          </h1>
          {split.muscleGroups && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              🎯 {split.muscleGroups}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Workout Progress</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>
            {doneSets} / {totalSets} sets completed <span className="tick-mark">✓</span>
          </span>
        </div>

        <div style={{ width: '100%', height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--accent)',
            borderRadius: 4,
            transition: 'width var(--transition-fast)'
          }} />
        </div>
      </div>

      {/* Exercises & Sets */}
      {activeExercises.map(ex => {
        const sets = logState[ex.id] || []
        const completedSetsCount = sets.filter(s => s.done).length

        return (
          <div key={ex.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 2 }}>{ex.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ex.muscleGroup}</span>
              </div>
              <span className={`status-badge ${completedSetsCount > 0 ? 'status-active' : 'status-inactive'}`}>
                {completedSetsCount > 0 && <span className="tick-mark">✓</span>} {completedSetsCount}/{sets.length}
              </span>
            </div>

            {/* Sets Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 48px', gap: 8, marginBottom: 8, padding: '0 8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'center' }}>SET</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'center' }}>KG</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'center' }}>REPS</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'center' }}>DONE</span>
            </div>

            {/* Set Rows */}
            {(ex.exerciseSets || []).map((s, si) => (
              <SetRow
                key={s.id}
                setIdx={si}
                set={s}
                loggedSet={sets[si]}
                onUpdate={(idx, field, val) => updateSet(ex.id, idx, field, val)}
                onCheck={(idx) => checkSet(ex.id, idx)}
              />
            ))}
          </div>
        )
      })}

      {/* Session Note Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Session Notes (Optional)</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="How did this workout feel? Any personal records or notes..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        className="btn btn-primary btn-full"
        onClick={handleSubmit}
        disabled={submitting || doneSets === 0}
        style={{ marginBottom: 32 }}
      >
        {submitting ? 'Saving Session...' : `Finish Workout (${doneSets} sets completed) ✓`}
      </button>
    </div>
  )
}
