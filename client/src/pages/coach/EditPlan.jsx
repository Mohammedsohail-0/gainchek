import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Autocomplete (shared) ────────────────────────────────────────────────────
function Autocomplete({ value, onChange, suggestions = [], placeholder }) {
  const [open, setOpen] = useState(false)
  const filtered = !value.trim() ? [] : suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10)

  return (
    <div className="autocomplete-wrapper">
      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.map(s => (
            <div key={s} className="autocomplete-item" onMouseDown={() => { onChange(s); setOpen(false) }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EditPlan({ isTemplate = false }) {
  const { planId, clientId } = useParams()
  const navigate = useNavigate()

  const [plan, setPlan] = useState(null)
  const [splits, setSplits] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exerciseOptions, setExerciseOptions] = useState([])
  const [localExercises, setLocalExercises] = useState({}) // {splitId: exercises[]}
  const [savedSplits, setSavedSplits] = useState({})

  useEffect(() => {
    const actualPlanId = planId
    api.get(`/workout/plan/${actualPlanId}`).then(res => {
      setPlan(res.data)
      const activeSplits = res.data.workoutSplits || []
      const ordered = DAYS.map(d => activeSplits.find(s => s.day?.toLowerCase() === d.toLowerCase())).filter(Boolean)
      setSplits(ordered)
      const first = ordered.find(s => !s.isRestDay)
      setSelectedDay(first?.id || ordered[0]?.id)
      setLoading(false)
    }).catch(() => { toast.error('Failed to load plan'); setLoading(false) })
  }, [planId])

  const currentSplit = splits.find(s => s.id === selectedDay)

  useEffect(() => {
    if (!currentSplit || localExercises[currentSplit.id]) return
    const exes = (currentSplit.exercises || []).map(ex => ({
      ...ex,
      sets: (ex.exerciseSets || []).map(s => ({ id: s.id, setNumber: s.setNumber, reps: s.reps || '', weight: s.weight ?? '' }))
    }))
    setLocalExercises(prev => ({ ...prev, [currentSplit.id]: exes }))
  }, [currentSplit?.id])

  useEffect(() => {
    const mg = currentSplit?.muscleGroups?.split(',')[0]?.trim()
    if (!mg) return
    api.get('/library/exercises', { params: { muscleGroup: mg } }).then(r => setExerciseOptions(r.data)).catch(() => {})
  }, [selectedDay])

  const currentExercises = localExercises[currentSplit?.id] || []

  const updateExercise = (idx, updater) => setLocalExercises(prev => {
    const copy = [...(prev[currentSplit.id] || [])]
    copy[idx] = typeof updater === 'function' ? updater(copy[idx]) : { ...copy[idx], ...updater }
    setSavedSplits(p => { const n = { ...p }; delete n[currentSplit.id]; return n })
    return { ...prev, [currentSplit.id]: copy }
  })

  const removeExercise = (idx) => setLocalExercises(prev => {
    const copy = (prev[currentSplit.id] || []).filter((_, i) => i !== idx)
    setSavedSplits(p => { const n = { ...p }; delete n[currentSplit.id]; return n })
    return { ...prev, [currentSplit.id]: copy }
  })

  const addExercise = () => setLocalExercises(prev => {
    const mg = currentSplit?.muscleGroups?.split(',')[0]?.trim() || ''
    const copy = [...(prev[currentSplit.id] || []), {
      id: crypto.randomUUID(), name: '', muscleGroup: mg, order: 0,
      sets: [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }]
    }]
    return { ...prev, [currentSplit.id]: copy }
  })

  const saveCurrentDay = async () => {
    setSaving(true)
    try {
      const payload = currentExercises.map((ex, i) => ({
        id: ex.id && !ex.id.includes('-') ? ex.id : undefined,
        name: ex.name.trim(), muscleGroup: ex.muscleGroup, order: i,
        sets: (ex.sets || []).map((s, j) => ({ setNumber: j + 1, reps: s.reps, weight: s.weight }))
      }))
      await api.post(`/workout/split/${currentSplit.id}/exercises`, { exercises: payload })
      setSavedSplits(prev => ({ ...prev, [currentSplit.id]: true }))
      toast.success(`${currentSplit.day} saved`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const finishEditing = () => {
    if (isTemplate) navigate('/coach/templates')
    else navigate(`/coach/clients/${clientId}`)
  }

  if (loading) return <p className="loading-text">Loading plan…</p>

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px', animation: 'fadeSlideUp 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn-secondary btn-sm" onClick={finishEditing}>← Back</button>
        <h1 style={{ fontWeight: 800, fontSize: '1.4rem' }}>
          Edit: {plan?.title}
        </h1>
      </div>

      {/* Day Tabs */}
      <div className="day-tabs" style={{ marginBottom: 24 }}>
        {splits.map(s => (
          <button
            key={s.id}
            className={`day-tab${selectedDay === s.id ? ' active' : ''}${s.isRestDay ? ' rest' : ''}`}
            onClick={() => setSelectedDay(s.id)}
          >
            {s.day?.slice(0, 2)}
            {savedSplits[s.id] && !s.isRestDay && (
              <span style={{ color: 'var(--success)', marginLeft: 4 }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Day Editor */}
      {!currentSplit ? (
        <p className="loading-text">Select a day above</p>
      ) : currentSplit.isRestDay ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🛌</div>
          <p style={{ color: 'var(--text-muted)' }}>Rest day — nothing to add.</p>
        </div>
      ) : (
        <div>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div>
              <div className="section-title">{currentSplit.day} — {currentSplit.name || currentSplit.muscleGroups}</div>
            </div>
          </div>

          {/* Exercise list */}
          {currentExercises.map((ex, idx) => (
            <div key={ex.id} className="exercise-block">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <Autocomplete
                    value={ex.name}
                    onChange={v => updateExercise(idx, { name: v })}
                    suggestions={exerciseOptions}
                    placeholder="Exercise name…"
                  />
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeExercise(idx)}>×</button>
              </div>
              {/* Sets */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 36px', gap: 6, marginBottom: 8 }}>
                {['SET', 'KG', 'REPS', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>{h}</span>
                ))}
              </div>
              {(ex.sets || []).map((s, si) => (
                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 36px', gap: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.setNumber}</div>
                  <input className="form-input" type="number" value={s.weight} onChange={e => updateExercise(idx, ex => ({ ...ex, sets: ex.sets.map((ss, j) => j === si ? { ...ss, weight: e.target.value } : ss) }))} placeholder="—" style={{ padding: '7px 10px', textAlign: 'center' }} />
                  <input className="form-input" type="number" value={s.reps} onChange={e => updateExercise(idx, ex => ({ ...ex, sets: ex.sets.map((ss, j) => j === si ? { ...ss, reps: e.target.value } : ss) }))} placeholder="—" style={{ padding: '7px 10px', textAlign: 'center' }} />
                  <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }} onClick={() => updateExercise(idx, ex => ({ ...ex, sets: ex.sets.filter((_, j) => j !== si).map((ss, j) => ({ ...ss, setNumber: j + 1 })) }))}>×</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 6, fontSize: '0.78rem' }} onClick={() => updateExercise(idx, ex => ({ ...ex, sets: [...ex.sets, { id: crypto.randomUUID(), setNumber: ex.sets.length + 1, reps: '', weight: '' }] }))}>
                + Add Set
              </button>
            </div>
          ))}

          <button className="btn btn-secondary" onClick={addExercise} style={{ marginBottom: 20 }}>
            + Add Exercise
          </button>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={saveCurrentDay} disabled={saving}>
              {saving ? 'Saving…' : savedSplits[currentSplit?.id] ? '✓ Saved' : 'Save This Day'}
            </button>
            <button className="btn btn-primary" onClick={finishEditing}>
              Done Editing
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
