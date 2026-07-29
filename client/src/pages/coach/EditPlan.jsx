import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Autocomplete({ value, onChange, suggestions = [], placeholder }) {
  const [open, setOpen] = useState(false)
  const filtered = !value.trim() ? [] : suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 10)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0, right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border-secondary)',
          borderRadius: 'var(--radius-md)',
          zIndex: 50,
          maxHeight: 180,
          overflowY: 'auto'
        }}>
          {filtered.map(s => (
            <div
              key={s}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid var(--border-secondary)' }}
              onMouseDown={() => { onChange(s); setOpen(false) }}
            >
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
  const [localExercises, setLocalExercises] = useState({})
  const [savedSplits, setSavedSplits] = useState({})

  useEffect(() => {
    api.get(`/workout/plan/${planId}`).then(res => {
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
      toast.success(`${currentSplit.day} saved ✓`)
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading plan details...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={finishEditing}>← Back</button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Edit: {plan?.title}</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={finishEditing}>Done Editing ✓</button>
      </div>

      {/* Day Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
        {splits.map(s => {
          const isSelected = selectedDay === s.id
          return (
            <button
              key={s.id}
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minWidth: 60 }}
              onClick={() => setSelectedDay(s.id)}
            >
              {s.day?.slice(0, 3)} {savedSplits[s.id] && '✓'} {s.isRestDay && '💤'}
            </button>
          )
        })}
      </div>

      {!currentSplit ? null : currentSplit.isRestDay ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛌</div>
          <p style={{ color: 'var(--text-secondary)' }}>Rest Day — no exercises required.</p>
        </div>
      ) : (
        <div>
          {currentExercises.map((ex, idx) => (
            <div key={ex.id || idx} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <Autocomplete
                    value={ex.name}
                    onChange={v => updateExercise(idx, { name: v })}
                    suggestions={exerciseOptions}
                    placeholder="Exercise name..."
                  />
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeExercise(idx)}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 8, marginBottom: 8 }}>
                {['SET', 'KG', 'REPS', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'center' }}>{h}</span>
                ))}
              </div>

              {(ex.sets || []).map((s, sIdx) => (
                <div key={s.id || sIdx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.setNumber}</div>
                  <input
                    className="form-input"
                    type="number"
                    value={s.weight}
                    onChange={e => updateExercise(idx, ex => ({
                      ...ex, sets: ex.sets.map((st, i) => i === sIdx ? { ...st, weight: e.target.value } : st)
                    }))}
                    placeholder="—"
                    style={{ textAlign: 'center', minHeight: 40, padding: '4px 8px' }}
                  />
                  <input
                    className="form-input"
                    type="number"
                    value={s.reps}
                    onChange={e => updateExercise(idx, ex => ({
                      ...ex, sets: ex.sets.map((st, i) => i === sIdx ? { ...st, reps: e.target.value } : st)
                    }))}
                    placeholder="—"
                    style={{ textAlign: 'center', minHeight: 40, padding: '4px 8px' }}
                  />
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => updateExercise(idx, ex => ({
                      ...ex, sets: ex.sets.filter((_, i) => i !== sIdx).map((st, i) => ({ ...st, setNumber: i + 1 }))
                    }))}
                    style={{ minHeight: 36, padding: '4px 8px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => updateExercise(idx, ex => ({
                  ...ex, sets: [...(ex.sets || []), { id: crypto.randomUUID(), setNumber: (ex.sets || []).length + 1, reps: '', weight: '' }]
                }))}
                style={{ marginTop: 8 }}
              >
                + Add Set
              </button>
            </div>
          ))}

          <button className="btn btn-secondary" onClick={addExercise} style={{ marginBottom: 24 }}>
            + Add Exercise
          </button>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={saveCurrentDay} disabled={saving}>
              {saving ? 'Saving...' : 'Save Day Changes ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
