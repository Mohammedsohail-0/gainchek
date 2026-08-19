import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Autocomplete from '../../components/Autocomplete'
import ExerciseCard from '../../components/ExerciseCard'
import './CreatePlan.css'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['S', 'M', 'Tu', 'W', 'Th', 'F', 'Sa']

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
      const payload = (currentDraft.exercises || []).filter(ex => ex.name && ex.name.trim()).map((ex, i) => ({
        id: ex.id && !ex.id.includes('-') ? ex.id : undefined,
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
    // Validate non-rest days have at least 1 named exercise
    for (const { id, day } of splitIds) {
      const draft = splitDrafts[id]
      if (!draft || draft.isRestDay) continue
      const namedExercises = (draft.exercises || []).filter(e => e.name && e.name.trim().length > 0)
      if (namedExercises.length === 0) {
        toast.error(`${day} has no named exercises. Please add at least 1 exercise or mark it as rest.`)
        return
      }
    }

    setFinishing(true)
    try {
      for (const { id } of splitIds) {
        const draft = splitDrafts[id]
        if (!draft || draft.isRestDay) continue
        const payload = (draft.exercises || []).filter(ex => ex.name && ex.name.trim()).map((ex, i) => ({
          id: ex.id && !ex.id.includes('-') ? ex.id : undefined,
          name: ex.name.trim(),
          muscleGroup: ex.muscleGroup,
          order: i,
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
    <div className="create-plan-container">
      {/* Header & Stepper */}
      <div className="create-plan-header-new">
        <div className="create-plan-title-row" onClick={() => navigate(-1)}>
          <span className="back-arrow-icon">←</span>
          <span>{isTemplate ? 'New Template' : 'New Workout Plan'}</span>
        </div>

        <div className="stepper-container">
          <div className="stepper-line" />
          <div className="stepper-badges">
            <span className={`stepper-pill ${step >= 1 ? 'active' : ''}`}>
              Step 1: Setup
            </span>
            <span className={`stepper-pill ${step >= 2 ? 'active' : ''}`}>
              Step 2 : Exercises
            </span>
          </div>
        </div>
      </div>

      {/* ─── Step 1: Plan Details & Schedule ─────────────────────────────── */}
      {step === 1 && (
        <>
          {/* Plan Title Section */}
          <div className="plan-section-label">
            <span className="green-asterisk">*</span> Plan Title:
          </div>
          <input
            className="plan-title-input"
            placeholder="Untitled Plan..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <textarea
            className="plan-desc-textarea"
            rows={3}
            placeholder="description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Plan Muscles to Train Each Day Section */}
          <div className="plan-section-label" style={{ marginTop: 12 }}>
            <span className="green-asterisk">*</span>Plan muscles to train each day
          </div>

          {/* Days Tabs Selector */}
          <div className="days-nav-row">
            {DAYS.map((d, i) => {
              const isSelected = selectedDay === d
              return (
                <button
                  key={d}
                  type="button"
                  className={`day-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDay(d)}
                >
                  {DAY_SHORT[i]}
                </button>
              )
            })}
          </div>

          {/* Active Day Config Card */}
          <div className="day-config-card">
            <div className="day-card-header">
              <h2 className="day-card-title">{selectedDay}</h2>
              <div className="rest-toggle-wrapper">
                <span className="rest-label">rest</span>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(currentSplit?.isRestDay)}
                    onChange={() => {
                      updateSplit(selectedDay, { isRestDay: !currentSplit?.isRestDay })
                      setMuscleInput('')
                    }}
                  />
                  <span className="slider-round" />
                </label>
              </div>
            </div>

            {!currentSplit?.isRestDay ? (
              <>
                <div className="split-name-row">
                  <span className="split-name-label">Name:</span>
                  <input
                    className="split-name-pill-input"
                    placeholder="e.g. Push Day, Chest Day, Leg D..."
                    value={currentSplit?.name || ''}
                    onChange={e => updateSplit(selectedDay, { name: e.target.value })}
                  />
                </div>

                <div className="muscle-input-row">
                  <Autocomplete
                    value={muscleInput}
                    onChange={setMuscleInput}
                    suggestions={muscleGroupOptions}
                    placeholder="enter muscle group..."
                    onEnter={addMuscleGroup}
                  />
                  <button
                    type="button"
                    className="btn-add-muscle-pill"
                    onClick={addMuscleGroup}
                  >
                    Add
                  </button>
                </div>

                {currentSplit?.muscleGroups?.length > 0 && (
                  <div className="muscle-tags-list">
                    {currentSplit.muscleGroups.map((mg, i) => (
                      <span key={i} className="muscle-tag-chip">
                        {mg}
                        <button
                          type="button"
                          className="remove-tag-btn"
                          onClick={() => removeMuscleGroup(i)}
                          title="Remove muscle group"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#888888', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                Rest & Recovery Day
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-full"
            disabled={!isFormValid || saving}
            onClick={handleNext}
            style={{ width: '100%', borderRadius: 9999, padding: '14px 0', fontWeight: 700 }}
          >
            {saving ? 'Creating Plan...' : 'Next: Add Exercises →'}
          </button>
        </>
      )}

      {/* ─── Step 2: Exercise Builder ─────────────────────────────────────── */}
      {step === 2 && (
        <>
          {/* Day Selector Tabs */}
          <div className="days-nav-row">
            {splitIds.map(({ day, id }) => {
              const dIndex = DAYS.indexOf(day)
              const shortName = dIndex !== -1 ? DAY_SHORT[dIndex] : day.slice(0, 2)
              const isSelected = selectedDay === day
              return (
                <button
                  key={day}
                  type="button"
                  className={`day-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {shortName}
                </button>
              )
            })}
          </div>

          {!currentDraft ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#a0a0a0' }}>
              Loading day...
            </div>
          ) : currentDraft.isRestDay ? (
            <div className="day-summary-card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛌</div>
              <p style={{ color: '#a0a0a0' }}>This is marked as a Rest Day.</p>
            </div>
          ) : (
            <div>
              {/* Day Summary Card */}
              <div className="day-summary-card">
                <h2 className="summary-title">
                  {currentDraft.name || 'Workout'} <span className="summary-day-text">({selectedDay})</span>
                </h2>
                {currentGroups.length > 0 && (
                  <ul className="summary-bullets-list">
                    {currentGroups.map(g => (
                      <li key={g}>o {g}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Target Muscle Selector */}
              <div className="target-muscle-row">
                <span className="target-muscle-label">Target Muscle:</span>
                <select
                  className="target-muscle-select"
                  value={targetMuscle}
                  onChange={e => setTargetMuscle(e.target.value)}
                >
                  {currentGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Exercise Cards */}
              {exercisesForTarget.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onRemove={() => updateDraftExercises(d => ({ ...d, exercises: d.exercises.filter(e => e.id !== ex.id) }))}
                  onUpdate={updater => updateDraftExercises(d => ({ ...d, exercises: d.exercises.map(e => e.id === ex.id ? updater(e) : e) }))}
                  nameOptions={exerciseOptions}
                />
              ))}

              <button type="button" className="btn-add-exercise-pill" onClick={addExercise}>
                + Add Exercise
              </button>

              <p className="helper-text-step2">
                Add at least one named exercise per muscle group to save this day.
              </p>

              <div className="step2-actions-row">
                <button
                  type="button"
                  className="btn-outline-green-pill"
                  onClick={saveDay}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : savedDays[currentDraftId] ? '✓ Save this day' : 'Save this day'}
                </button>
                <button
                  type="button"
                  className="btn-solid-green-pill"
                  onClick={finishPlan}
                  disabled={finishing || !planComplete}
                >
                  {finishing ? 'Saving Plan...' : (isTemplate ? 'Save Template ✓' : 'Finish Plan')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
