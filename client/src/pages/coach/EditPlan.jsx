import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Autocomplete from '../../components/Autocomplete'
import ExerciseCard from '../../components/ExerciseCard'
import "./CreatePlan.css"

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['S', 'M', 'Tu', 'W', 'Th', 'F', 'Sa']

export default function EditPlan({ isTemplate = false }) {
  const { planId, clientId } = useParams()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [splits, setSplits] = useState([])
  const [selectedDay, setSelectedDay] = useState('Sunday')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [muscleInput, setMuscleInput] = useState('')
  const [muscleGroupOptions, setMuscleGroupOptions] = useState([])
  const [targetMuscle, setTargetMuscle] = useState('')
  const [exerciseOptions, setExerciseOptions] = useState([])
  const [localExercises, setLocalExercises] = useState({})
  const [savedDays, setSavedDays] = useState({})

  // Bug 11: Fetch muscle groups from API instead of hardcoding
  useEffect(() => {
    api.get('/library/muscle-groups').then(r => setMuscleGroupOptions(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    api.get(`/workout/plan/${planId}`).then(res => {
      const planData = res.data
      setTitle(planData.title || '')
      setDescription(planData.description || '')

      const activeSplits = planData.workoutSplits || []
      const initialSplits = DAYS.map(dayName => {
        const existing = activeSplits.find(s => s.day?.toLowerCase() === dayName.toLowerCase())
        if (existing) {
          const mgArray = typeof existing.muscleGroups === 'string'
            ? existing.muscleGroups.split(',').map(g => g.trim()).filter(Boolean)
            : (Array.isArray(existing.muscleGroups) ? existing.muscleGroups : [])

          return {
            ...existing,
            day: dayName,
            isRestDay: Boolean(existing.isRestDay),
            name: existing.name || '',
            muscleGroups: mgArray
          }
        }
        return {
          id: `temp-${dayName}`,
          day: dayName,
          isRestDay: true,
          name: '',
          muscleGroups: [],
          exercises: [],
          isNew: true
        }
      })

      setSplits(initialSplits)

      // Initialize local exercises for each split
      const initialExercises = {}
      initialSplits.forEach(s => {
        const rawExes = s.exercises || []
        if (rawExes.length > 0) {
          initialExercises[s.day] = rawExes.map(ex => {
            const rawSets = ex.exerciseSets || ex.sets || []
            return {
              id: ex.id || crypto.randomUUID(),
              name: ex.name || '',
              muscleGroup: ex.muscleGroup || '',
              order: ex.order || 0,
              sets: rawSets.length > 0
                ? rawSets.map((setObj, i) => ({
                    id: setObj.id || crypto.randomUUID(),
                    setNumber: setObj.setNumber || i + 1,
                    reps: setObj.reps !== null && setObj.reps !== undefined ? setObj.reps : '',
                    weight: setObj.weight !== null && setObj.weight !== undefined ? setObj.weight : ''
                  }))
                : [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }]
            }
          })
        } else if (!s.isRestDay && s.muscleGroups.length > 0) {
          initialExercises[s.day] = s.muscleGroups.map((mg, i) => ({
            id: crypto.randomUUID(),
            name: '',
            muscleGroup: mg,
            order: i,
            sets: [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }]
          }))
        } else {
          initialExercises[s.day] = []
        }
      })
      setLocalExercises(initialExercises)

      const firstNonRest = initialSplits.find(s => !s.isRestDay)
      setSelectedDay(firstNonRest ? firstNonRest.day : 'Sunday')
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load plan details')
      setLoading(false)
    })
  }, [planId])

  const currentSplit = splits.find(s => s.day === selectedDay)
  const currentGroups = useMemo(() => currentSplit?.muscleGroups || [], [currentSplit?.muscleGroups])

  // Bug 5: Clear muscleInput when switching days
  useEffect(() => {
    setMuscleInput('')
  }, [selectedDay])

  useEffect(() => {
    if (currentGroups.length && !currentGroups.includes(targetMuscle)) {
      setTargetMuscle(currentGroups[0])
    } else if (!currentGroups.length) {
      setTargetMuscle('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(currentGroups), selectedDay])

  useEffect(() => {
    if (!targetMuscle) return
    api.get('/library/exercises', { params: { muscleGroup: targetMuscle } })
      .then(r => setExerciseOptions(r.data))
      .catch(() => {})
  }, [targetMuscle, selectedDay])

  const currentDayExercises = localExercises[selectedDay] || []

  const exercisesForTarget = currentDayExercises.filter(ex => {
    if (!targetMuscle || currentGroups.length <= 1) return true
    if (!ex.muscleGroup) return true
    return ex.muscleGroup.toLowerCase() === targetMuscle.toLowerCase()
  })

  const displayedExercises = exercisesForTarget.length > 0 ? exercisesForTarget : currentDayExercises

  const updateSplit = (dayName, changes) => {
    setSplits(prev => prev.map(s => s.day === dayName ? { ...s, ...changes } : s))
    setSavedDays(prev => ({ ...prev, [dayName]: false }))

    if (changes.isRestDay === false) {
      setLocalExercises(prev => {
        const list = prev[dayName] || []
        if (list.length === 0) {
          const splitObj = splits.find(s => s.day === dayName)
          const mg = (splitObj?.muscleGroups && splitObj.muscleGroups[0]) || ''
          return {
            ...prev,
            [dayName]: [{
              id: crypto.randomUUID(),
              name: '',
              muscleGroup: mg,
              order: 0,
              sets: [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }]
            }]
          }
        }
        return prev
      })
    }
  }

  const addMuscleGroup = () => {
    if (!muscleInput.trim()) return
    const val = muscleInput.trim()
    const existing = currentSplit?.muscleGroups || []
    if (!existing.some(g => g.toLowerCase() === val.toLowerCase())) {
      const updated = [...existing, val]
      updateSplit(selectedDay, { muscleGroups: updated })
      if (!targetMuscle) setTargetMuscle(val)

      setLocalExercises(prev => {
        const list = prev[selectedDay] || []
        if (list.length === 0 || list.every(e => !e.name)) {
          return {
            ...prev,
            [selectedDay]: [
              ...(list.filter(e => e.name)),
              {
                id: crypto.randomUUID(),
                name: '',
                muscleGroup: val,
                order: list.length,
                sets: [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }]
              }
            ]
          }
        }
        return prev
      })
    }
    setMuscleInput('')
  }

  const removeMuscleGroup = (index) => {
    const updated = (currentSplit?.muscleGroups || []).filter((_, i) => i !== index)
    updateSplit(selectedDay, { muscleGroups: updated })
  }

  const updateDraftExercises = (updater) => {
    setLocalExercises(prev => {
      const currentList = prev[selectedDay] || []
      const nextList = typeof updater === 'function' ? updater(currentList) : updater
      return { ...prev, [selectedDay]: nextList }
    })
    setSavedDays(prev => ({ ...prev, [selectedDay]: false }))
  }

  const addExercise = () => {
    const mg = targetMuscle || currentGroups[0] || ''
    updateDraftExercises(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        muscleGroup: mg,
        order: prev.length,
        sets: [{ id: crypto.randomUUID(), setNumber: 1, reps: '', weight: '' }]
      }
    ])
  }

  const saveCurrentDay = async () => {
    if (!currentSplit) return

    if (!currentSplit.isRestDay) {
      if (!currentSplit.muscleGroups || currentSplit.muscleGroups.length === 0) {
        toast.error(`Please add at least 1 muscle group for ${selectedDay}`)
        return
      }
      const validExes = currentDayExercises.filter(e => e.name && e.name.trim().length > 0)
      if (validExes.length === 0) {
        toast.error(`Please add at least 1 exercise with a name for ${selectedDay}`)
        return
      }
    }

    setSaving(true)
    try {
      // 1. Update plan title/description
      await api.put(`/workout/plan/${planId}`, { title: title.trim(), description })

      // 2. Save or create split
      let splitId = currentSplit.id
      const mgString = (currentSplit.muscleGroups || []).join(', ')

      if (currentSplit.isNew || String(splitId).startsWith('temp-')) {
        const createRes = await api.post('/workout/split', {
          planId,
          day: currentSplit.day,
          isRestDay: currentSplit.isRestDay,
          name: currentSplit.name || null,
          muscleGroups: mgString || null
        })
        splitId = createRes.data.id
        updateSplit(selectedDay, { id: splitId, isNew: false })
      } else {
        await api.put(`/workout/split/${splitId}`, {
          day: currentSplit.day,
          isRestDay: currentSplit.isRestDay,
          name: currentSplit.name || null,
          muscleGroups: mgString || null
        })
      }

      // 3. If not rest day, save exercises
      if (!currentSplit.isRestDay) {
        const payload = currentDayExercises.filter(ex => ex.name && ex.name.trim().length > 0).map((ex, i) => ({
          id: ex.id && !ex.id.includes('-') ? ex.id : undefined,
          name: ex.name.trim(),
          muscleGroup: ex.muscleGroup || targetMuscle || currentGroups[0] || '',
          order: i,
          sets: (ex.sets || []).map((s, j) => ({ setNumber: j + 1, reps: s.reps, weight: s.weight }))
        }))
        await api.post(`/workout/split/${splitId}/exercises`, { exercises: payload })
      }

      setSavedDays(prev => ({ ...prev, [selectedDay]: true }))
      toast.success(`${selectedDay} saved ✓`)

      // Bug 4: Inform user if hidden exercises were also saved
      const totalExercises = currentDayExercises.filter(e => e.name && e.name.trim()).length
      const visibleExercises = exercisesForTarget.filter(e => e.name && e.name.trim()).length
      if (totalExercises > visibleExercises) {
        toast.info(`Saved all ${totalExercises} exercises for ${selectedDay} (${totalExercises - visibleExercises} in other muscle groups)`)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save day')
    } finally {
      setSaving(false)
    }
  }

  const finishEditing = async () => {
    if (!title || !title.trim()) {
      toast.error('Plan title is required')
      return
    }

    for (const split of splits) {
      if (!split.isRestDay) {
        const mgList = split.muscleGroups || []
        if (mgList.length === 0) {
          toast.error(`${split.day} is not marked as rest day. Please add at least 1 muscle group or mark it as rest.`)
          return
        }
        const exList = (localExercises[split.day] || []).filter(e => e.name && e.name.trim().length > 0)
        if (exList.length === 0) {
          toast.error(`${split.day} is not marked as rest day. Please add at least 1 named exercise or mark it as rest.`)
          return
        }
      }
    }

    setSaving(true)
    try {
      // Save plan title & description
      await api.put(`/workout/plan/${planId}`, { title: title.trim(), description })

      // Save all splits
      for (const split of splits) {
        let splitId = split.id
        const mgString = (split.muscleGroups || []).join(', ')

        if (split.isNew || String(splitId).startsWith('temp-')) {
          if (!split.isRestDay || split.name || (split.muscleGroups && split.muscleGroups.length > 0)) {
            const createRes = await api.post('/workout/split', {
              planId,
              day: split.day,
              isRestDay: split.isRestDay,
              name: split.name || null,
              muscleGroups: mgString || null
            })
            splitId = createRes.data.id
          } else {
            continue
          }
        } else {
          await api.put(`/workout/split/${splitId}`, {
            day: split.day,
            isRestDay: split.isRestDay,
            name: split.name || null,
            muscleGroups: mgString || null
          })
        }

        if (!split.isRestDay) {
          const exList = (localExercises[split.day] || []).filter(e => e.name && e.name.trim().length > 0)
          const payload = exList.map((ex, i) => ({
            id: ex.id && !ex.id.includes('-') ? ex.id : undefined,
            name: ex.name.trim(),
            muscleGroup: ex.muscleGroup || (split.muscleGroups && split.muscleGroups[0]) || '',
            order: i,
            sets: (ex.sets || []).map((s, j) => ({ setNumber: j + 1, reps: s.reps, weight: s.weight }))
          }))
          await api.post(`/workout/split/${splitId}/exercises`, { exercises: payload })
        }
      }

      toast.success('Plan updated successfully! ✓')
      if (isTemplate) navigate('/coach/templates')
      else if (clientId) navigate(`/coach/clients/${clientId}`)
      else navigate('/coach')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to finish editing')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#a0a0a0' }}>Loading plan details...</div>

  return (
    <div className="create-plan-container">
      {/* Header */}
      <div className="create-plan-header-new">
        <div className="create-plan-title-row" onClick={() => navigate(-1)}>
          <span className="back-arrow-icon">←</span>
          <span>Edit Plan</span>
        </div>
      </div>

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
      <div className="day-config-card" style={{ marginBottom: 24 }}>
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

            {currentGroups.length > 0 && (
              <div className="muscle-tags-list">
                {currentGroups.map((mg, i) => (
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

      {/* Exercise Builder Section (when not rest day) */}
      {!currentSplit?.isRestDay && (
        <div style={{ marginTop: 24 }}>
          {currentGroups.length > 0 && (
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
          )}

          {displayedExercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onRemove={() => updateDraftExercises(list => list.filter(e => e.id !== ex.id))}
              onUpdate={updater => updateDraftExercises(list => list.map(e => e.id === ex.id ? updater(e) : e))}
              nameOptions={exerciseOptions}
            />
          ))}

          <button type="button" className="btn-add-exercise-pill" onClick={addExercise}>
            + Add Exercise
          </button>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="step2-actions-row" style={{ marginTop: 28 }}>
        <button
          type="button"
          className="btn-outline-green-pill"
          onClick={saveCurrentDay}
          disabled={saving}
        >
          {saving ? 'Saving...' : savedDays[selectedDay] ? '✓ Saved' : 'Save Day Changes'}
        </button>
        <button
          type="button"
          className="btn-solid-green-pill"
          onClick={finishEditing}
          disabled={saving}
        >
          {saving ? 'Saving Plan...' : 'Done Editing ✓'}
        </button>
      </div>
    </div>
  )
}
