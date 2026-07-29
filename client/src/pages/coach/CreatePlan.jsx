import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa']

function Autocomplete({ value, onChange, suggestions = [], placeholder, onEnter }) {
  const [open, setOpen] = useState(false)
  const [filtered, setFiltered] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    if (!value?.trim()) { setFiltered([]); return }
    const q = value.toLowerCase()
    setFiltered(suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 12))
  }, [value, suggestions])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border-secondary)',
          borderRadius: 'var(--radius-md)',
          zIndex: 50,
          maxHeight: 180,
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
        }}>
          {filtered.map(s => (
            <div
              key={s}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border-secondary)'
              }}
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

function ExerciseCard({ exercise, onRemove, onUpdate, nameOptions }) {
  const addSet = () => onUpdate(ex => ({
    ...ex,
    sets: [...ex.sets, { id: crypto.randomUUID(), setNumber: ex.sets.length + 1, reps: '', weight: '' }]
  }))

  const removeSet = (setId) => onUpdate(ex => {
    const filtered = ex.sets.filter(s => s.id !== setId)
    return { ...ex, sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })) }
  })

  const updateSet = (setId, field, val) => onUpdate(ex => ({
    ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: val } : s)
  }))

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <Autocomplete
            value={exercise.name}
            onChange={v => onUpdate(ex => ({ ...ex, name: v }))}
            suggestions={nameOptions}
            placeholder="Exercise name (e.g. Barbell Bench Press)"
          />
        </div>
        <button className="btn btn-danger btn-sm" onClick={onRemove} title="Remove exercise">
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 8, marginBottom: 8 }}>
        {['SET', 'KG', 'REPS', ''].map((h, i) => (
          <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'center' }}>
            {h}
          </span>
        ))}
      </div>

      {exercise.sets.map(s => (
        <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            {s.setNumber}
          </div>
          <input
            className="form-input"
            type="number"
            value={s.weight}
            onChange={e => updateSet(s.id, 'weight', e.target.value)}
            placeholder="—"
            style={{ textAlign: 'center', minHeight: 40, padding: '4px 8px' }}
          />
          <input
            className="form-input"
            type="number"
            value={s.reps}
            onChange={e => updateSet(s.id, 'reps', e.target.value)}
            placeholder="—"
            style={{ textAlign: 'center', minHeight: 40, padding: '4px 8px' }}
          />
          <button
            className="btn btn-danger btn-sm"
            onClick={() => removeSet(s.id)}
            style={{ minHeight: 36, padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
      ))}

      <button className="btn btn-secondary btn-sm" onClick={addSet} style={{ marginTop: 8 }}>
        + Add Set
      </button>
    </div>
  )
}

export default function CreatePlan({ isTemplate = false }) {
  const navigate = useNavigate()
  const { clientId } = useParams()

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [splits, setSplits] = useState(
    DAYS.map(d => ({ day: d, isRestDay: false, name: '', muscleGroups: [] }))
  )
  const [muscleGroupOptions, setMuscleGroupOptions] = useState([])
  const [muscleInput, setMuscleInput] = useState('')

  const [planId, setPlanId] = useState(null)
  const [splitIds, setSplitIds] = useState([])
  const [splitDrafts, setSplitDrafts] = useState({})
  const [savedDays, setSavedDays] = useState({})
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [exerciseOptions, setExerciseOptions] = useState([])

  useEffect(() => {
    api.get('/library/muscle-groups').then(r => setMuscleGroupOptions(r.data)).catch(() => {})
  }, [])

  const currentSplit = splits.find(s => s.day === selectedDay)

  const updateSplit = (day, updates) =>
    setSplits(prev => prev.map(s => s.day === day ? { ...s, ...updates } : s))

  const addMuscleGroup = () => {
    if (!muscleInput.trim()) return
    const updated = [...currentSplit.muscleGroups, muscleInput.trim()]
    updateSplit(selectedDay, { muscleGroups: updated })
    setMuscleInput('')
  }

  const removeMuscleGroup = (idx) =>
    updateSplit(selectedDay, { muscleGroups: currentSplit.muscleGroups.filter((_, i) => i !== idx) })

  const isFormValid = title.trim().length > 0 &&
    splits.every(s => s.isRestDay || s.muscleGroups.length > 0)

  const handleNext = async () => {
    setSaving(true)
    try {
      const planRes = await api.post('/workout/plan', {
        title: title.trim(),
        description: description.trim() || null,
        isTemplate,
        clientId: isTemplate ? null : clientId || null,
      })
      setPlanId(planRes.data.id)

      const ids = []
      for (const split of splits) {
        const splitRes = await api.post('/workout/split', {
          planId: planRes.data.id,
          day: split.day,
          isRestDay: split.isRestDay,
          name: split.name || null,
          muscleGroups: split.isRestDay ? null : split.muscleGroups.join(', ')
        })
        ids.push({ day: split.day, id: splitRes.data.id })
      }
      setSplitIds(ids)
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create plan')
    } finally {
      setSaving(false)
    }
  }

  const currentDraftId = splitIds.find(s => s.day === selectedDay)?.id

  useEffect(() => {
    if (step !== 2 || !currentDraftId || splitDrafts[currentDraftId]) return
    api.get(`/workout/split/one/${currentDraftId}`).then(res => {
      const raw = res.data
      const groups = (raw.muscleGroups || '').split(',').map(g => g.trim()).filter(Boolean)
      const defaults = groups
        .filter(g => !(raw.exercises || []).some(e => e.muscleGroup === g))
        .map(g => ({ id: crypto.randomUUID(), name: '', muscleGroup: g, order: 0, sets: [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }] }))
      setSplitDrafts(prev => ({ ...prev, [currentDraftId]: { ...raw, exercises: [...(raw.exercises || []), ...defaults] } }))
    }).catch(() => {})
  }, [step, currentDraftId, splitDrafts])

  const currentDraft = splitDrafts[currentDraftId]
  const currentGroups = (currentDraft?.muscleGroups || '').split(',').map(g => g.trim()).filter(Boolean)
  const [targetMuscle, setTargetMuscle] = useState('')

  useEffect(() => {
    if (currentGroups.length && !currentGroups.includes(targetMuscle)) {
      setTargetMuscle(currentGroups[0])
    }
  }, [currentGroups, currentDraftId])

  useEffect(() => {
    if (!targetMuscle) return
    api.get('/library/exercises', { params: { muscleGroup: targetMuscle } }).then(r => setExerciseOptions(r.data)).catch(() => {})
  }, [targetMuscle])

  const updateDraftExercises = (updater) => {
    setSplitDrafts(prev => ({ ...prev, [currentDraftId]: updater(prev[currentDraftId]) }))
    setSavedDays(prev => { const n = { ...prev }; delete n[currentDraftId]; return n })
  }

  const addExercise = () => {
    if (!targetMuscle) return
    updateDraftExercises(d => ({
      ...d, exercises: [...(d.exercises || []), {
        id: crypto.randomUUID(), name: '', muscleGroup: targetMuscle, order: 0,
        sets: [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }]
      }]
    }))
  }

  const saveDay = async () => {
    if (!currentDraftId || !currentDraft) return
    setSaving(true)
    try {
      const payload = (currentDraft.exercises || []).map((ex, i) => ({
        id: ex.id,
        name: ex.name.trim(),
        muscleGroup: ex.muscleGroup,
        order: i,
        sets: (ex.sets || []).map((s, j) => ({ setNumber: j + 1, reps: s.reps, weight: s.weight }))
      }))
      await api.post(`/workout/split/${currentDraftId}/exercises`, { exercises: payload })
      setSavedDays(prev => ({ ...prev, [currentDraftId]: true }))
      toast.success(`${selectedDay} saved ✓`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save day')
    } finally {
      setSaving(false)
    }
  }

  const finishPlan = async () => {
    setFinishing(true)
    try {
      for (const { id } of splitIds) {
        const draft = splitDrafts[id]
        if (!draft || draft.isRestDay) continue
        const payload = (draft.exercises || []).map((ex, i) => ({
          id: ex.id, name: ex.name.trim(), muscleGroup: ex.muscleGroup, order: i,
          sets: (ex.sets || []).map((s, j) => ({ setNumber: j + 1, reps: s.reps, weight: s.weight }))
        }))
        await api.post(`/workout/split/${id}/exercises`, { exercises: payload })
      }

      if (!isTemplate && clientId) {
        await api.post(`/workout/plan/${planId}/assign`, { clientId })
        toast.success('Plan created & assigned ✓')
        navigate(`/coach/clients/${clientId}`)
      } else {
        toast.success('Template saved successfully ✓')
        navigate('/coach/templates')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to finish plan')
    } finally {
      setFinishing(false)
    }
  }

  const exercisesForTarget = (currentDraft?.exercises || []).filter(e => e.muscleGroup === targetMuscle)
  const allDraftsLoaded = splitIds.every(({ id }) => splitDrafts[id])
  const planComplete = allDraftsLoaded && splitIds.every(({ id }) => {
    const d = splitDrafts[id]
    if (!d || d.isRestDay) return true
    const groups = (d.muscleGroups || '').split(',').map(g => g.trim()).filter(Boolean)
    return groups.every(g => (d.exercises || []).some(e => e.muscleGroup === g && e.name?.trim()))
  })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            {step === 1 ? (isTemplate ? 'New Template' : 'Create Workout Plan') : 'Add Exercises'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`status-badge ${step === 1 ? 'status-active' : 'status-inactive'}`}>
            Step 1: Setup
          </span>
          <span className={`status-badge ${step === 2 ? 'status-active' : 'status-inactive'}`}>
            Step 2: Exercises
          </span>
        </div>
      </div>

      {/* ─── Step 1: Plan Details & Schedule ─────────────────────────────── */}
      {step === 1 && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Plan Title *</label>
              <input
                className="form-input"
                placeholder="e.g. 4-Day Muscle Building Split"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Hypertrophy focus with progressive overload"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Configure Days</h3>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
              {DAYS.map((d, i) => {
                const isSelected = selectedDay === d
                const isRest = splits.find(s => s.day === d)?.isRestDay
                return (
                  <button
                    key={d}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minWidth: 44 }}
                    onClick={() => setSelectedDay(d)}
                  >
                    {DAY_SHORT[i]} {isRest && '💤'}
                  </button>
                )
              })}
            </div>

            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedDay}</span>
                <button
                  type="button"
                  className={`btn btn-sm ${currentSplit?.isRestDay ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { updateSplit(selectedDay, { isRestDay: !currentSplit?.isRestDay }); setMuscleInput('') }}
                >
                  {currentSplit?.isRestDay ? '✓ Rest Day' : 'Mark as Rest Day'}
                </button>
              </div>

              {!currentSplit?.isRestDay && (
                <>
                  <div className="form-group">
                    <label className="form-label">Session Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Upper Body Power"
                      value={currentSplit?.name || ''}
                      onChange={e => updateSplit(selectedDay, { name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Muscle Groups *</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {(currentSplit?.muscleGroups || []).map((mg, i) => (
                        <span key={i} className="status-badge status-active">
                          {mg}
                          <button
                            type="button"
                            onClick={() => removeMuscleGroup(i)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', marginLeft: 6, cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Autocomplete
                        value={muscleInput}
                        onChange={setMuscleInput}
                        suggestions={muscleGroupOptions}
                        placeholder="Add target muscle (Chest, Back...)"
                        onEnter={addMuscleGroup}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={addMuscleGroup}>
                        Add
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            disabled={!isFormValid || saving}
            onClick={handleNext}
          >
            {saving ? 'Creating Plan...' : 'Next: Add Exercises →'}
          </button>
        </div>
      )}

      {/* ─── Step 2: Exercise Builder ─────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
            {splitIds.map(({ day, id }) => {
              const draft = splitDrafts[id]
              const isRest = draft?.isRestDay
              const isSaved = savedDays[id]
              const isSelected = selectedDay === day
              return (
                <button
                  key={day}
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: 60 }}
                  onClick={() => setSelectedDay(day)}
                >
                  {day.slice(0, 3)} {isSaved && '✓'} {isRest && '💤'}
                </button>
              )
            })}
          </div>

          {!currentDraft ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              Loading day...
            </div>
          ) : currentDraft.isRestDay ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛌</div>
              <p style={{ color: 'var(--text-secondary)' }}>This is marked as a Rest Day.</p>
            </div>
          ) : (
            <div>
              <div className="form-group" style={{ maxWidth: 280, marginBottom: 20 }}>
                <label className="form-label">Select Muscle Group</label>
                <select
                  className="form-select"
                  value={targetMuscle}
                  onChange={e => setTargetMuscle(e.target.value)}
                >
                  {currentGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {exercisesForTarget.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onRemove={() => updateDraftExercises(d => ({ ...d, exercises: d.exercises.filter(e => e.id !== ex.id) }))}
                  onUpdate={updater => updateDraftExercises(d => ({ ...d, exercises: d.exercises.map(e => e.id === ex.id ? updater(e) : e) }))}
                  nameOptions={exerciseOptions}
                />
              ))}

              <button className="btn btn-secondary" onClick={addExercise} style={{ marginBottom: 24 }}>
                + Add Exercise
              </button>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={saveDay}
                  disabled={saving}
                >
                  {saving ? 'Saving Day...' : savedDays[currentDraftId] ? '✓ Saved' : 'Save Day'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={finishPlan}
                  disabled={finishing || !planComplete}
                >
                  {finishing ? 'Saving Plan...' : (isTemplate ? 'Save Template ✓' : 'Finish & Assign ✓')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
