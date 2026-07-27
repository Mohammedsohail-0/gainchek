import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa']

// ─── Autocomplete ─────────────────────────────────────────────────────────────
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
    <div className="autocomplete-wrapper" ref={ref}>
      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }}
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

// ─── ExerciseCard ─────────────────────────────────────────────────────────────
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
    <div className="exercise-block">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <Autocomplete
            value={exercise.name}
            onChange={v => onUpdate(ex => ({ ...ex, name: v }))}
            suggestions={nameOptions}
            placeholder="Exercise name…"
          />
        </div>
        <button className="btn btn-danger btn-sm" onClick={onRemove} title="Remove exercise">×</button>
      </div>

      {/* Sets */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 6, marginBottom: 8 }}>
        {['SET', 'KG', 'REPS', ''].map((h, i) => (
          <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>{h}</span>
        ))}
      </div>
      {exercise.sets.map(s => (
        <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: 6, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {s.setNumber}
          </div>
          <input
            className="form-input"
            type="number"
            value={s.weight}
            onChange={e => updateSet(s.id, 'weight', e.target.value)}
            placeholder="—"
            style={{ padding: '7px 10px', textAlign: 'center' }}
          />
          <input
            className="form-input"
            type="number"
            value={s.reps}
            onChange={e => updateSet(s.id, 'reps', e.target.value)}
            placeholder="—"
            style={{ padding: '7px 10px', textAlign: 'center' }}
          />
          <button
            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }}
            onClick={() => removeSet(s.id)}
          >
            ×
          </button>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addSet} style={{ marginTop: 6, fontSize: '0.78rem' }}>
        + Add Set
      </button>
    </div>
  )
}

// ─── CreatePlan (exported, used for both create and template) ─────────────────
export default function CreatePlan({ isTemplate = false }) {
  const navigate = useNavigate()
  const { clientId } = useParams()

  // Step 1: Plan details + split schedule
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [splits, setSplits] = useState(
    DAYS.map(d => ({ day: d, isRestDay: false, name: '', muscleGroups: [] }))
  )
  const [muscleGroupOptions, setMuscleGroupOptions] = useState([])
  const [muscleInput, setMuscleInput] = useState('')

  // Step 2: Exercise builder
  const [planId, setPlanId] = useState(null)
  const [splitIds, setSplitIds] = useState([]) // [{day, id}]
  const [splitDrafts, setSplitDrafts] = useState({}) // {splitId: {..., exercises: []}}
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

  // Step 2: load each split's data and exercise options when day changes
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

  useEffect(() => {
    if (!currentDraftId) return
    const draft = splitDrafts[currentDraftId]
    if (!draft) return
    const groups = (draft.muscleGroups || '').split(',').map(g => g.trim()).filter(Boolean)
    const firstGroup = groups[0]
    if (!firstGroup) return
    api.get('/library/exercises', { params: { muscleGroup: firstGroup } }).then(r => setExerciseOptions(r.data)).catch(() => {})
  }, [currentDraftId, splitDrafts])

  const currentDraft = splitDrafts[currentDraftId]
  const currentGroups = (currentDraft?.muscleGroups || '').split(',').map(g => g.trim()).filter(Boolean)
  const [targetMuscle, setTargetMuscle] = useState('')

  useEffect(() => {
    if (currentGroups.length && !currentGroups.includes(targetMuscle)) {
      setTargetMuscle(currentGroups[0])
    }
  }, [currentGroups.join(','), currentDraftId])

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
      toast.success(`${selectedDay} saved`)
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
        toast.success('Plan assigned to client!')
        navigate(`/coach/clients/${clientId}`)
      } else {
        toast.success('Template saved!')
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
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px', animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <h1 style={{ fontWeight: 800, fontSize: '1.4rem' }}>
          {step === 1
            ? (isTemplate ? 'New Template' : 'Create Plan')
            : `Add Exercises`}
        </h1>
        {/* Step progress */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2].map(n => (
            <div key={n} style={{
              width: 28, height: 28, borderRadius: '50%', border: '2px solid',
              borderColor: step >= n ? 'var(--accent)' : 'var(--border)',
              background: step > n ? 'var(--accent)' : step === n ? 'var(--accent-dim)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700,
              color: step >= n ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}>{n}</div>
          ))}
        </div>
      </div>

      {/* ─── Step 1: Plan Details + Split Schedule ───────────────────────── */}
      {step === 1 && (
        <div>
          {/* Plan title + description */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Plan Title *</label>
              <input
                className="form-input"
                placeholder="e.g. Push Pull Legs"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Optional notes about this plan…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Day tabs */}
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>
              Configure each day *
            </p>
            <div className="day-tabs" style={{ marginBottom: 16 }}>
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  className={`day-tab${selectedDay === d ? ' active' : ''}${splits.find(s => s.day === d)?.isRestDay ? ' rest' : ''}`}
                  onClick={() => setSelectedDay(d)}
                >
                  <span style={{ display: 'block' }}>{DAY_SHORT[i]}</span>
                </button>
              ))}
            </div>

            {/* Day config */}
            <div style={{ padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedDay}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.85rem', color: currentSplit?.isRestDay ? 'var(--accent)' : 'var(--text-secondary)' }}>Rest Day</span>
                  <div
                    style={{
                      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                      background: currentSplit?.isRestDay ? 'var(--accent)' : 'var(--bg-surface)',
                      border: '1px solid var(--border)', position: 'relative', transition: 'background 0.2s'
                    }}
                    onClick={() => { updateSplit(selectedDay, { isRestDay: !currentSplit?.isRestDay }); setMuscleInput('') }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 2,
                      left: currentSplit?.isRestDay ? 20 : 2, transition: 'left 0.2s'
                    }} />
                  </div>
                </label>
              </div>

              {!currentSplit?.isRestDay && (
                <>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">Session Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Push Day, Chest Day…"
                      value={currentSplit?.name || ''}
                      onChange={e => updateSplit(selectedDay, { name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Muscle Groups *</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {(currentSplit?.muscleGroups || []).map((mg, i) => (
                        <span key={i} className="chip">
                          {mg}
                          <button className="chip-remove" onClick={() => removeMuscleGroup(i)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Autocomplete
                        value={muscleInput}
                        onChange={setMuscleInput}
                        suggestions={muscleGroupOptions}
                        placeholder="Add muscle group…"
                        onEnter={addMuscleGroup}
                      />
                      <button className="btn btn-secondary btn-sm" onClick={addMuscleGroup}>
                        Add
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isFormValid && title.trim() && (
            <p className="hint-text" style={{ marginBottom: 12 }}>
              Add at least one muscle group for each non-rest day.
            </p>
          )}

          <button
            className="btn btn-primary btn-full"
            disabled={!isFormValid || saving}
            onClick={handleNext}
          >
            {saving ? 'Creating…' : 'Next: Add Exercises →'}
          </button>
        </div>
      )}

      {/* ─── Step 2: Exercise Builder ─────────────────────────────────────── */}
      {step === 2 && (
        <div>
          {/* Day tabs */}
          <div className="day-tabs" style={{ marginBottom: 20 }}>
            {splitIds.map(({ day, id }, i) => {
              const draft = splitDrafts[id]
              const isRest = draft?.isRestDay
              const isSaved = savedDays[id]
              return (
                <button
                  key={day}
                  className={`day-tab${selectedDay === day ? ' active' : ''}${isRest ? ' rest' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {DAY_SHORT[DAYS.indexOf(day)] || day}
                  {isSaved && !isRest && <span style={{ color: 'var(--success)', marginLeft: 4 }}>✓</span>}
                </button>
              )
            })}
          </div>

          {!currentDraft ? (
            <p className="loading-text">Loading day…</p>
          ) : currentDraft.isRestDay ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🛌</div>
              <p style={{ color: 'var(--text-muted)' }}>Rest day — nothing to add.</p>
            </div>
          ) : (
            <div>
              {/* Target muscle selector */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <label className="form-label" style={{ whiteSpace: 'nowrap' }}>Target Muscle</label>
                <select
                  className="form-select"
                  value={targetMuscle}
                  onChange={e => setTargetMuscle(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  {currentGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Exercise cards */}
              {exercisesForTarget.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onRemove={() => updateDraftExercises(d => ({ ...d, exercises: d.exercises.filter(e => e.id !== ex.id) }))}
                  onUpdate={updater => updateDraftExercises(d => ({ ...d, exercises: d.exercises.map(e => e.id === ex.id ? updater(e) : e) }))}
                  nameOptions={exerciseOptions}
                />
              ))}

              <button className="btn btn-secondary" onClick={addExercise} style={{ marginBottom: 20 }}>
                + Add Exercise
              </button>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={saveDay}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : savedDays[currentDraftId] ? '✓ Saved' : 'Save This Day'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={finishPlan}
                  disabled={finishing || !planComplete}
                  title={planComplete ? '' : 'Add at least one named exercise per muscle group for all non-rest days'}
                >
                  {finishing ? 'Saving…' : (isTemplate ? 'Save Template' : 'Finish & Assign')}
                </button>
              </div>
              {!planComplete && (
                <p className="hint-text" style={{ marginTop: 12 }}>
                  Add at least one named exercise per muscle group for every non-rest day.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
