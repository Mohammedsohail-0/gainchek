import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Button from '../../components/Button'
import './ClientWorkoutLog.css'

export default function ClientWorkoutLog() {
  const { splitId } = useParams()
  const navigate = useNavigate()

  const [split, setSplit] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Warning Modals State
  const [showFinishWarningModal, setShowFinishWarningModal] = useState(false)
  const [skippedModalConfig, setSkippedModalConfig] = useState(null) // null or { isNextStep: boolean, skippedCount: number }

  // logState[exerciseId][setIdx] = { weight, reps, done }
  const [logState, setLogState] = useState({})

  useEffect(() => {
    const load = async () => {
      try {
        const [planRes, historyRes] = await Promise.all([
          api.get('/client/plan'),
          api.get('/log/history')
        ])
        const logs = Array.isArray(historyRes.data?.logs) ? historyRes.data.logs : (Array.isArray(historyRes.data) ? historyRes.data : [])
        const isSameDay = (a, b) =>
          Boolean(a && b && !isNaN(new Date(a)) && !isNaN(new Date(b)) &&
            new Date(a).getFullYear() === new Date(b).getFullYear() &&
            new Date(a).getMonth() === new Date(b).getMonth() &&
            new Date(a).getDate() === new Date(b).getDate())

        if (logs.some(log => isSameDay(log.loggedAt, new Date()))) {
          toast.info("You've already logged a workout today. Great session!")
          navigate('/client')
          return
        }

        setPlan(planRes.data)
        const found = planRes.data.workoutSplits?.find(s => s.id === splitId)
        if (!found) throw new Error('Split not found')

        const todayDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
        if (found.day && found.day.toLowerCase() !== todayDay) {
          const todayCap = todayDay.charAt(0).toUpperCase() + todayDay.slice(1)
          toast.error(`You can only log today's scheduled workout (${todayCap}).`)
          navigate('/client')
          return
        }

        setSplit(found)

        const init = {}
          ; (found.exercises || []).filter(ex => !ex.isArchived).forEach(ex => {
            const setsArr = ex.exerciseSets || ex.sets || []
            if (setsArr.length > 0) {
              init[ex.id] = setsArr.map(s => ({
                weight: s.weight !== null && s.weight !== undefined && s.weight !== '' ? s.weight : 10,
                reps: s.reps || 12,
                done: false,
              }))
            } else {
              // Default 3 sets fallback
              init[ex.id] = [1, 2, 3].map(() => ({ weight: 10, reps: 12, done: false }))
            }
          })
        setLogState(init)
      } catch {
        toast.error("Couldn't load workout session")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [splitId, navigate])

  const updateSet = useCallback((exId, setIdx, field, value) => {
    setLogState(prev => ({
      ...prev,
      [exId]: (prev[exId] || []).map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
    }))
  }, [])

  const checkSet = useCallback((exId, setIdx) => {
    setLogState(prev => ({
      ...prev,
      [exId]: (prev[exId] || []).map((s, i) => i === setIdx ? { ...s, done: !s.done } : s)
    }))
  }, [])

  const getCompletedSetsCount = () => {
    let count = 0
    const activeExs = (split?.exercises || []).filter(ex => !ex.isArchived)
    activeExs.forEach(ex => {
      const sets = logState[ex.id] || []
      sets.forEach(s => {
        if (s.done) count++
      })
    })
    return count
  }

  const getSkippedSetsCount = () => {
    let count = 0
    const activeExs = (split?.exercises || []).filter(ex => !ex.isArchived)
    activeExs.forEach(ex => {
      const sets = logState[ex.id] || []
      sets.forEach(s => {
        if (!s.done) count++
      })
    })
    return count
  }

  const getSkippedExercisesCount = () => {
    let count = 0
    const activeExs = (split?.exercises || []).filter(ex => !ex.isArchived)
    activeExs.forEach(ex => {
      const sets = logState[ex.id] || []
      const completedInEx = sets.filter(s => s.done).length
      if (completedInEx === 0) count++
    })
    return count
  }

  const handleFinishHereClick = () => {
    if (getCompletedSetsCount() === 0) {
      toast.error('Tap ✓ to complete at least one set before logging.')
      return
    }
    setShowFinishWarningModal(true)
  }

  const handleSubmit = async () => {
    if (!split || !plan) return

    const exercises = []
      ; (split.exercises || []).filter(ex => !ex.isArchived).forEach(ex => {
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
        note: null,
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
      <div className="empty-state" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
        <div className="empty-icon">❌</div>
        <div className="empty-title">Workout Session Not Found</div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/client')} style={{ marginTop: 12 }}>
          Back to Home
        </button>
      </div>
    )
  }

  const activeExercises = (split.exercises || []).filter(ex => !ex.isArchived)

  // Group active exercises by target muscle group
  const muscleGroupsList = []
  activeExercises.forEach(ex => {
    const mg = ex.muscleGroup || 'Workout'
    let existing = muscleGroupsList.find(item => item.muscleGroup.toLowerCase() === mg.toLowerCase())
    if (!existing) {
      existing = { muscleGroup: mg, exercises: [] }
      muscleGroupsList.push(existing)
    }
    existing.exercises.push(ex)
  })

  const currentStep = muscleGroupsList[currentStepIndex] || {
    muscleGroup: 'Workout',
    exercises: activeExercises
  }

  const getCurrentStepSkippedSetsCount = () => {
    let count = 0
    if (!currentStep || !currentStep.exercises) return 0
    currentStep.exercises.forEach(ex => {
      const sets = logState[ex.id] || []
      sets.forEach(s => {
        if (!s.done) count++
      })
    })
    return count
  }

  const isLastStep = muscleGroupsList.length <= 1 || currentStepIndex >= muscleGroupsList.length - 1

  const handleNextStep = () => {
    if (!isLastStep) {
      const currentSkipped = getCurrentStepSkippedSetsCount()
      if (currentSkipped > 0) {
        setSkippedModalConfig({ isNextStep: true, skippedCount: currentSkipped })
      } else {
        setCurrentStepIndex(prev => prev + 1)
        window.scrollTo(0, 0)
      }
    } else {
      if (getCompletedSetsCount() === 0) {
        toast.error('Tap ✓ to complete at least one set before logging.')
        return
      }
      const totalSkipped = getSkippedSetsCount()
      if (totalSkipped > 0) {
        setSkippedModalConfig({ isNextStep: false, skippedCount: totalSkipped })
      } else {
        handleSubmit()
      }
    }
  }

  const proceedToNextStep = () => {
    setSkippedModalConfig(null)
    setCurrentStepIndex(prev => prev + 1)
    window.scrollTo(0, 0)
  }

  const handleBackStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
      window.scrollTo(0, 0)
    } else {
      navigate(-1)
    }
  }

  const currentSkippedSetsCount = getCurrentStepSkippedSetsCount()
  const totalSkippedSetsCount = getSkippedSetsCount()
  const skippedExercisesCount = getSkippedExercisesCount()

  return (
    <div className="workout-log-container">

      {/* ── 1. Top Header Bar ── */}
      <div className="workout-header-bar">
        <button className="finish-here-btn" onClick={handleFinishHereClick} disabled={submitting}>
          Finish here
        </button>
      </div>

      {/* ── 2. Target Muscle Title ── */}
      <div className="target-muscle-section">
        <p className="target-muscle-title">
          <span className="target-muscle-label">Target muscle:</span>{' '}
          <span className="target-muscle-value">{currentStep.muscleGroup}</span>
        </p>
      </div>

      {/* ── 3. Exercise Blocks for Current Muscle Group ── */}
      {currentStep.exercises.map(ex => {
        const sets = logState[ex.id] || []
        const baseSets = ex.exerciseSets || ex.sets || []
        const displaySets = baseSets.length > 0 ? baseSets : [1, 2, 3]

        return (
          <div key={ex.id || ex.name} className="workout-exercise-block">
            <p className="exercise-green-title">{ex.name?.toLowerCase()}</p>

            {/* Table Column Headers */}
            <div className="workout-table-header">
              <span className="header-cell center">SETS</span>
              <span className="header-cell center">WEIGHT</span>
              <span className="header-cell center">REPS</span>
              <span className="header-cell check-icon">✓</span>
            </div>

            {/* Set Row Cards */}
            {displaySets.map((s, si) => {
              const loggedSet = sets[si] || {}
              const isDone = loggedSet.done
              const setNum = s.setNumber || si + 1
              const weightVal = loggedSet.weight !== undefined ? loggedSet.weight : (s.weight ?? 10)
              const repsVal = loggedSet.reps !== undefined ? loggedSet.reps : (s.reps ?? 12)

              return (
                <div key={s.id || si} className={`set-row-card ${isDone ? 'completed' : ''}`}>
                  {/* Set Number */}
                  <span className="set-num-text">{setNum}</span>

                  {/* Weight Input */}
                  <div className="set-input-group">
                    <input
                      type="number"
                      className="set-input"
                      value={weightVal}
                      onChange={e => updateSet(ex.id, si, 'weight', e.target.value)}
                      onWheel={e => e.target.blur()}
                    />
                    <span className="unit-text">KG</span>
                  </div>

                  {/* Reps Input */}
                  <div className="set-input-group">
                    <input
                      type="number"
                      className="set-input"
                      value={repsVal}
                      onChange={e => updateSet(ex.id, si, 'reps', e.target.value)}
                      onWheel={e => e.target.blur()}
                    />
                  </div>

                  {/* Checkbox Square */}
                  <button
                    type="button"
                    className={`set-check-box ${isDone ? 'checked' : ''}`}
                    onClick={() => checkSet(ex.id, si)}
                    aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isDone ? '✓' : ''}
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* ── 4. Bottom Next / Finish Button ── */}
      <button
        className="workout-next-btn"
        onClick={handleNextStep}
        disabled={submitting}
      >
        {submitting ? 'Saving...' : (isLastStep ? 'Finish Workout' : 'Next')}
      </button>

      {/* ── 5. Finish Here Confirmation Modal ── */}
      {showFinishWarningModal && (
        <div className="warning-modal-backdrop" onClick={() => setShowFinishWarningModal(false)}>
          <div className="warning-modal-box" onClick={e => e.stopPropagation()}>
            <div className="warning-modal-header">
              <span style={{ fontSize: '1.4rem' }}>🏁</span>
              <h3 className="warning-modal-title">Finish Workout Early?</h3>
            </div>
            <p className="warning-modal-body">
              Are you sure you want to finish your workout session now?
            </p>
            {(skippedExercisesCount > 0 || totalSkippedSetsCount > 0) && (
              <div className="warning-motivating-sentence" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💪</span>
                  <span>
                    {skippedExercisesCount > 0
                      ? `${skippedExercisesCount} skipped exercise${skippedExercisesCount > 1 ? 's' : ''} remaining`
                      : `${totalSkippedSetsCount} skipped set${totalSkippedSetsCount > 1 ? 's' : ''} remaining`}
                  </span>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Every set counts toward your growth—don't leave gains on the table!
                </span>
              </div>
            )}
            <div className="warning-modal-actions">
              <Button
                variant="primary"
                text={submitting ? 'Saving...' : 'Finish Workout'}
                onClick={() => {
                  setShowFinishWarningModal(false)
                  handleSubmit()
                }}
                disabled={submitting}
              />
              <Button
                variant="secondary"
                text="Keep Going"
                onClick={() => setShowFinishWarningModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Skipped Sets / Exercise Warning Modal ── */}
      {skippedModalConfig && (
        <div className="warning-modal-backdrop" onClick={() => setSkippedModalConfig(null)}>
          <div className="warning-modal-box" onClick={e => e.stopPropagation()}>
            <div className="warning-modal-header">
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <h3 className="warning-modal-title">Skipped Sets Detected</h3>
            </div>
            <div className="warning-motivating-sentence">
              <span>💪</span>
              <span>Every set counts toward your growth—don't leave gains on the table!</span>
            </div>
            <p className="warning-modal-body">
              {skippedModalConfig.isNextStep
                ? `You have ${skippedModalConfig.skippedCount} set${skippedModalConfig.skippedCount > 1 ? 's' : ''} left unchecked in this exercise block.`
                : `You have ${skippedModalConfig.skippedCount} set${skippedModalConfig.skippedCount > 1 ? 's' : ''} left unchecked in this workout session.`}
            </p>
            <div className="warning-modal-actions">
              <Button
                variant="primary"
                text={skippedModalConfig.isNextStep ? 'Next Exercise' : (submitting ? 'Saving...' : 'Finish Anyway')}
                onClick={() => {
                  if (skippedModalConfig.isNextStep) {
                    proceedToNextStep()
                  } else {
                    setSkippedModalConfig(null)
                    handleSubmit()
                  }
                }}
                disabled={submitting}
              />
              <Button
                variant="secondary"
                text="Go Back & Complete"
                onClick={() => setSkippedModalConfig(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




