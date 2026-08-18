

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import ClientCard from '../../components/ClientCard'
import Table from '../../components/Table'
import Button from '../../components/Button'
import useIsMobile from '../../hooks/useIsMobile'
import '../coach/ClientDetail.css'
import './ClientHome.css'

const GOAL_LABELS = {
  BUILD_MUSCLE: 'Build Muscle',
  LOSE_FAT: 'Lose Fat',
  GET_STRONGER: 'Get Stronger',
  GENERAL_FITNESS: 'General Fitness',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const isSameDay = (a, b) =>
  Boolean(a && b && !isNaN(new Date(a)) && !isNaN(new Date(b)) &&
    new Date(a).getFullYear() === new Date(b).getFullYear() &&
    new Date(a).getMonth() === new Date(b).getMonth() &&
    new Date(a).getDate() === new Date(b).getDate())

export default function ClientPlan() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [weightLogs, setWeightLogs] = useState([])
  const [workoutLogs, setWorkoutLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Plan')
  const [selectedExerciseSplit, setSelectedExerciseSplit] = useState(null)

  // Goal Editing State
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  // Bodyweight Logging State
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [submittingWeight, setSubmittingWeight] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)

  const handleSaveGoal = async () => {
    if (!selectedGoal) return
    setSavingGoal(true)
    try {
      const res = await api.put('/client/profile', { goal: selectedGoal })
      setProfile(prev => ({ ...prev, goal: res.data.goal || selectedGoal }))
      toast.success('Goal updated successfully!')
      setIsEditingGoal(false)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to update goal')
    } finally {
      setSavingGoal(false)
    }
  }

  const handleLogWeight = async () => {
    const weightNum = Number(weightInput)
    if (!weightInput || isNaN(weightNum) || weightNum <= 0) {
      toast.error('Please enter a valid weight.')
      return
    }

    setSubmittingWeight(true)
    try {
      const res = await api.post('/client/bodyweight', { weight: weightNum })
      setWeightLogs(prev => [res.data, ...prev])
      setProfile(prev => ({ ...prev, bodyWeight: res.data.weight }))
      setWeightInput('')
      setShowWeightInput(false)
      toast.success('Bodyweight logged!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save bodyweight log.')
    } finally {
      setSubmittingWeight(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, weightRes, historyRes] = await Promise.all([
          api.get('/client/profile'),
          api.get('/client/bodyweight'),
          api.get('/log/history')
        ])
        setProfile(profileRes.data)
        setWeightLogs(Array.isArray(weightRes.data) ? weightRes.data : [])
        setWorkoutLogs(Array.isArray(historyRes.data?.logs) ? historyRes.data.logs : (Array.isArray(historyRes.data) ? historyRes.data : []))

        try {
          const planRes = await api.get('/client/plan')
          setPlan(planRes.data)

          // Check if navigated with an openSplitId in state
          const initialSplitId = location.state?.openSplitId
          if (initialSplitId && planRes.data?.workoutSplits) {
            const split = planRes.data.workoutSplits.find(s => s.id === initialSplitId)
            if (split) {
              const dName = DAYS.find(d => d.toLowerCase() === split.day?.toLowerCase()) || split.day || 'Workout'
              const isRest = split.isRestDay
              let muscles = []
              if (!isRest && split.exercises?.length > 0) {
                muscles = split.exercises.map(ex => ex.muscleGroup).filter(Boolean)
                if (muscles.length === 0) muscles = [split.name || 'Workout']
              } else if (!isRest) {
                muscles = [split.name || 'Workout']
              }
              const uniqueMuscles = Array.from(new Set(muscles))
              const muscleGroupText = isRest ? 'rest' : (uniqueMuscles.join(', ') || split.name || 'Workout')
              const bullets = uniqueMuscles.map((m, idx) => idx < uniqueMuscles.length - 1 ? `${m},` : m)

              setSelectedExerciseSplit({
                dayName: dName,
                dayLower: dName.toLowerCase(),
                isRest,
                muscleGroupText,
                bullets,
                splitObj: split
              })
            }
          }
        } catch (planErr) {
          if (planErr.response?.status !== 404) {
            toast.error("Couldn't load active plan")
          }
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [location.state])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading profile & workout plan...
      </div>
    )
  }

  const latestBw = weightLogs[0]?.weight || profile?.bodyWeight

  const hasLoggedWorkoutToday = workoutLogs.some(log => isSameDay(log.loggedAt, new Date()))

  const rawGoal = profile?.goal
    ? (GOAL_LABELS[profile.goal] || profile.goal.replace(/_/g, ' '))
    : 'not set yet'
  const formattedGoal = rawGoal.charAt(0).toUpperCase() + rawGoal.slice(1).toLowerCase()

  // Prepare workout split days mapping matching ClientDetail format
  const daysList = DAYS.map(dName => {
    const dayLower = dName.toLowerCase()
    const split = plan?.workoutSplits?.find(s => s.day?.toLowerCase() === dayLower)

    if (split) {
      const isRest = split.isRestDay
      let muscles = []
      if (!isRest && split.exercises?.length > 0) {
        muscles = split.exercises.map(ex => ex.muscleGroup).filter(Boolean)
        if (muscles.length === 0) muscles = [split.name || 'Workout']
      } else if (!isRest) {
        muscles = [split.name || 'Workout']
      }

      const uniqueMuscles = Array.from(new Set(muscles))
      const muscleGroupText = isRest ? 'rest' : (uniqueMuscles.join(', ') || split.name || 'Workout')
      const bullets = uniqueMuscles.map((m, idx) => idx < uniqueMuscles.length - 1 ? `${m},` : m)

      return {
        dayName: dName,
        dayLower,
        isRest,
        muscleGroupText,
        bullets,
        splitObj: split
      }
    }

    return {
      dayName: dName,
      dayLower,
      isRest: true,
      muscleGroupText: 'rest',
      bullets: [],
      splitObj: null
    }
  })

  const workoutTableColumns = [
    {
      key: 'day',
      label: 'DAY',
      render: (item) => <span className="day-cell">{item.dayLower}</span>,
    },
    {
      key: 'muscleGroup',
      label: 'MUSCLE GROUP',
      render: (item) => (
        <span className={`muscle-cell ${item.isRest ? 'rest-text' : ''}`}>
          {item.muscleGroupText}
        </span>
      ),
    },
    {
      key: 'action',
      label: '',
      render: (item) => (
        <div className="action-cell">
          {item.isRest ? (
            <span className="rest-text" style={{ fontWeight: 600 }}>
              --
            </span>
          ) : (
            <Button
              variant="secondary"
              text="View exercise"
              className="btn-view-exercise-pill"
              onClick={() => setSelectedExerciseSplit(item)}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="client-detail-page-container">

      {/* ── 1. Client Card Header ── */}
      <div className="client-detail-card-wrapper">
        <ClientCard
          pSize={isMobile ? "md" : "lg"}
          data={[
            <div className='client-card-data-wrapper' key="data">
              <p className='client-card-name'>
                {profile?.name || profile?.user?.name || 'Client 1'}
              </p>
              <div className='client-card-details'>
                age: {profile?.age ?? 'N/A'}, gender: {profile?.gender ?? 'N/A'}
              </div>
              <div className='client-card-bottom-row'>
                <span
                  className="client-card-bw"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setShowWeightInput(prev => !prev)
                    if (!showWeightInput && latestBw) setWeightInput(String(latestBw))
                  }}
                  title="Click to edit body weight"
                >
                  Body weight: {latestBw ? `${latestBw} kg` : 'Set weight'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
                    <path d="M11 4H4a2 2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </span>
              </div>
            </div>
          ]}
          others={
            <div className="client-options-dropdown-wrapper">
              <button
                className="client-card-options-btn"
                aria-label="Client options"
                onClick={() => setShowOptionsMenu(prev => !prev)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3">
                  <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
                </svg>
              </button>
              {showOptionsMenu && (
                <div className="client-options-menu">
                  <button
                    className="options-menu-item"
                    onClick={() => {
                      setShowOptionsMenu(false)
                      setShowWeightInput(prev => !prev)
                      if (latestBw) setWeightInput(String(latestBw))
                    }}
                  >
                    Edit Body Weight
                  </button>
                  <button
                    className="options-menu-item"
                    onClick={() => {
                      setShowOptionsMenu(false)
                      navigate('/client/settings')
                    }}
                  >
                    Settings
                  </button>
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* ── Bodyweight Input Section ── */}
      {showWeightInput && (
        <div className="bodyweight-input-section" style={{ marginTop: 0, marginBottom: 20 }}>
          <p className="bodyweight-label">Enter Today's Body Weight</p>
          <div className="bodyweight-input-wrapper">
            <input
              type="number"
              className="bodyweight-input"
              placeholder="kg"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogWeight(); }}
              min="1"
              step="0.1"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="primary"
              text={submittingWeight ? 'Saving...' : 'Enter'}
              onClick={handleLogWeight}
              disabled={submittingWeight || !weightInput}
            />
            <Button
              variant="secondary"
              text="Cancel"
              onClick={() => setShowWeightInput(false)}
            />
          </div>
        </div>
      )}

      {/* ── 2. Client Goal Tag ── */}
      <span className='client-card-goal'>
        <strong className='client-card-goal-label'>Goal:</strong>{' '}
        <em className='client-card-goal-value'>{formattedGoal}</em>
      </span>

      {/* ── 3. Plan & Analytics Tabs Bar ── */}
      <div className="client-tabs-bar" style={{ marginTop: 16 }}>
        <button
          className={`client-tab-btn ${tab === 'Plan' ? 'active' : ''}`}
          onClick={() => setTab('Plan')}
        >
          Plan
        </button>
        <button
          className={`client-tab-btn ${tab === 'Analytics' ? 'active' : ''}`}
          onClick={() => setTab('Analytics')}
        >
          Analytics
        </button>
      </div>

      {/* ── 4. Main Tab Content (Plan Tab) ── */}
      {tab === 'Plan' && (
        <div className="workout-plan-section">
          <h3 className="mobile-workout-heading" style={{ marginBlock: '20px' }}>
            Workout Plan
          </h3>

          {!plan ? (
            <div className="empty-state" style={{ marginTop: 24 }}>
              <div className="empty-icon">📋</div>
              <div className="empty-title">No Active Plan Assigned</div>
              <div className="empty-text">Your trainer hasn't set up a workout plan for you yet. Reach out to your coach to get started!</div>
            </div>
          ) : !isMobile ? (
            /* Desktop Table View */
            <div className="workout-plan-table-container">
              <Table className="workout-plan-table" columns={workoutTableColumns} data={daysList} />
            </div>
          ) : (
            /* Mobile Card Grid View */
            <div className="workout-cards-grid-mobile">
              {daysList.map(item => (
                <div key={item.dayLower} className="workout-day-card">
                  <div>
                    <div className="card-day-title">{item.dayLower}</div>
                    {item.isRest ? (
                      <div className="rest-text" style={{ fontStyle: 'normal', fontWeight: 500 }}>
                        rest
                      </div>
                    ) : (
                      <ul className="card-muscles-list">
                        {item.bullets.length > 0 ? (
                          item.bullets.map((b, idx) => <li key={idx}>• {b}</li>)
                        ) : (
                          <li>• {item.muscleGroupText}</li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="card-action-bottom">
                    {item.isRest ? (
                      <div className="rest-text" style={{ textAlign: 'center', fontWeight: 600 }}>
                        --
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        text="View exercise"
                        className="btn-view-exercise-pill"
                        onClick={() => setSelectedExerciseSplit(item)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Analytics Tab ── */}
      {tab === 'Analytics' && (
        <div className="workout-history-section" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: 16 }}>Workout History</h3>
          {workoutLogs.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div className="empty-icon">📊</div>
              <div className="empty-title">No Workout Logs Recorded</div>
              <div className="empty-text">When you log workouts on your device, history will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {workoutLogs.map(log => (
                <div key={log.id} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="tick-mark">✓</span>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{log.split?.name || log.split?.day || 'Workout Log'}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(log.loggedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {log.note && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>
                      "{log.note}"
                    </p>
                  )}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {log.exerciseLogs?.length || 0} sets logged
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 6. View Exercise Modal ── */}
      {selectedExerciseSplit && (
        <div className="modal-backdrop" onClick={() => setSelectedExerciseSplit(null)}>
          <div
            className="card exercise-detail-modal"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="exercise-modal-title">
              {selectedExerciseSplit.dayName} — {selectedExerciseSplit.muscleGroupText?.toLowerCase()}
            </h3>

            <div className="modal-exercises-list">
              {selectedExerciseSplit.splitObj?.exercises?.length > 0 ? (
                selectedExerciseSplit.splitObj.exercises.map(ex => {
                  const setsArr = ex.exerciseSets || ex.sets || []

                  return (
                    <div key={ex.id || ex.name} className="modal-exercise-item">
                      <div className="ex-name">{ex.name?.toLowerCase()}</div>
                      <div className="ex-pills-row">
                        {setsArr.length > 0 ? (
                          setsArr.map((s, idx) => {
                            const weightStr = (s.weight !== null && s.weight !== undefined && s.weight !== '' && Number(s.weight) > 0)
                              ? `${s.weight}kg`
                              : 'BW'
                            const repsStr = s.reps ?? '0'
                            return (
                              <span key={s.id || idx} className="ex-set-pill">
                                {weightStr} × {repsStr}
                              </span>
                            )
                          })
                        ) : (
                          <span className="ex-set-pill">
                            {(ex.weight && Number(ex.weight) > 0) ? `${ex.weight}kg` : 'BW'} × {ex.reps || 10}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="no-exercises-text">
                  No specific exercises configured for this split yet.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                variant="secondary"
                text="Close"
                style={{ flex: 1 }}
                onClick={() => setSelectedExerciseSplit(null)}
              />
              {selectedExerciseSplit.splitObj && !selectedExerciseSplit.isRest && (() => {
                const todayDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
                const isTodaySplit = selectedExerciseSplit.dayLower === todayDay

                if (!isTodaySplit) {
                  return (
                    <Button
                      variant="secondary"
                      text={`Scheduled for ${selectedExerciseSplit.dayName}`}
                      disabled
                      style={{ flex: 1, opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  )
                }

                if (hasLoggedWorkoutToday) {
                  return (
                    <Button
                      variant="secondary"
                      text="Logged Today"
                      disabled
                      style={{ flex: 1, opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  )
                }

                return (
                  <Button
                    variant="primary-white-solid"
                    text="Log Workout"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const splitId = selectedExerciseSplit.splitObj.id
                      setSelectedExerciseSplit(null)
                      navigate(`/client/log/${splitId}`)
                    }}
                  />
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



