import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import "./ClientDetail.css"
import api from '../../services/api'
import ClientCard from '../../components/ClientCard'
import Table from '../../components/Table'
import useIsMobile from '../../hooks/useIsMobile'
import Button from '../../components/Button'

const GOAL_LABELS = {
  BUILD_MUSCLE: 'Build Muscle',
  LOSE_FAT: 'Lose Fat',
  GET_STRONGER: 'Get Stronger',
  GENERAL_FITNESS: 'General Fitness',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']



export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Plan')
  const isMobile = useIsMobile()

  // Modals & Menu state
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [selectedExerciseSplit, setSelectedExerciseSplit] = useState(null)
  const optionsMenuRef = useRef(null)

  // Template Assign Modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [assigningTemplate, setAssigningTemplate] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target)) {
        setShowOptionsMenu(false)
      }
    }
    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showOptionsMenu])

  const load = useCallback(async () => {
    try {
      const [clientRes, logsRes] = await Promise.all([
        api.get(`/coach/clients/${id}`),
        api.get(`/log/history/${id}`)
      ])
      setClient(clientRes.data)
      setLogs(logsRes.data)
      try {
        const planRes = await api.get(`/workout/activePlan/${id}`)
        setActivePlan(planRes.data)
      } catch (e) {
        if (e.response?.status !== 404) toast.error("Couldn't load active plan")
      }
    } catch {
      toast.error('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await api.delete(`/coach/clients/${id}`)
      toast.success('Client removed')
      navigate('/coach')
    } catch {
      toast.error('Failed to remove client')
    } finally {
      setRemoving(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await api.put(`/coach/clients/${id}`, { notes: editNotes })
      setClient(prev => ({
        ...prev,
        notes: res.data?.notes !== undefined ? res.data.notes : editNotes
      }))
      toast.success('Client notes updated')
      setShowEditModal(false)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to update client notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleOpenAssignModal = async () => {
    setShowAssignModal(true)
    setLoadingTemplates(true)
    try {
      const res = await api.get('/workout/plan/templates')
      const tmpls = res.data || []
      setTemplates(tmpls)
      if (tmpls.length > 0) {
        setSelectedTemplateId(tmpls[0].id)
      } else {
        setSelectedTemplateId(null)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleAssignTemplate = async (templateIdToAssign) => {
    const targetId = templateIdToAssign || selectedTemplateId
    if (!targetId) return
    setAssigningTemplate(true)
    try {
      await api.post(`/workout/plan/${targetId}/assign`, { clientId: id })
      toast.success('Template assigned successfully ✓')
      setShowAssignModal(false)
      load()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Failed to assign template')
    } finally {
      setAssigningTemplate(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading client profile...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="empty-state">
        <div className="empty-icon">❌</div>
        <div className="empty-title">Client Not Found</div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/coach')} style={{ marginTop: 12 }}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  const bwLogs = client.bodyWeightLogs || []
  const latestBw = bwLogs[0]?.weight

  const rawGoal = client.goal
    ? (GOAL_LABELS[client.goal] || client.goal.replace(/_/g, ' '))
    : 'not set yet'
  const formattedGoal = rawGoal.charAt(0).toUpperCase() + rawGoal.slice(1).toLowerCase()

  // Prepare workout split days mapping
  const daysList = DAYS.map(dName => {
    const dayLower = dName.toLowerCase()
    const split = activePlan?.workoutSplits?.find(s => s.day?.toLowerCase() === dayLower)

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
      muscleGroupText: activePlan ? 'rest' : '—',
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
            <button
              className="btn-view-exercise-pill"
              onClick={() => setSelectedExerciseSplit(item)}
            >
              View exercise
            </button>
          )}
        </div>
      ),
    },
  ]

  const actionButtons = (
    <div className="client-plan-actions">
      <button
        className="btn-white-pill"
        onClick={handleOpenAssignModal}
      >
        Assign Plan
      </button>
      <button
        className="btn-white-pill"
        onClick={() => {
          if (activePlan?.id) {
            navigate(`/coach/clients/${id}/plan/${activePlan.id}/edit`)
          } else {
            toast.error('No plan assigned')
          }
        }}
      >
        Edit Plan
      </button>
    </div>
  )

  return (
    <div className="client-detail-page-container">

      {/* ── 1. Client Card Header ── */}
      <div className="client-detail-card-wrapper">
        <ClientCard
          pSize={isMobile ? "md" : "lg"}
          data={[
            <div className='client-card-data-wrapper'>
              <p className='client-card-name'>
                {client.name}
              </p>
              <div className='client-card-email'>
                {client.user?.email}
              </div>
              <div className='client-card-details'>
                age: {client.age ?? 'N/A'}, gender: {client.gender ?? 'N/A'}
              </div>
              <div className='client-card-bottom-row'>
                {latestBw && (
                  <span className="client-card-bw">Body weight: {latestBw}</span>
                )}
              </div>
            </div>
          ]}
          others={
            <div className="client-options-dropdown-wrapper" ref={optionsMenuRef}>
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
                      setEditNotes(client?.notes ?? client?.note ?? '')
                      setShowEditModal(true)
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
                      <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-277l80-80v357q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l57 57q12 12 18 26.5t6 30.5q0 15-6 30t-18 27L430-360H360Zm480-480-57-57 57 57ZM440-440h57l279-279-29-28-28-29-279 279v57Zm279-279-28-29 28 29 29 28-29-28Z" />
                    </svg>
                    Edit client
                  </button>
                  <button
                    className="options-menu-item danger"
                    onClick={() => {
                      setShowOptionsMenu(false)
                      setShowRemove(true)
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
                      <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
                    </svg>
                    Remove client
                  </button>
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* ── 2. Client Notes Bar ── */}
      <span className='client-card-goal'>
        <strong className='client-card-goal-label'>Goal:</strong>{' '}
        <em className='client-card-goal-value'>{formattedGoal}</em>
      </span>
      <div className="client-notes-bar">
        <span className="client-notes-label">Notes:</span>
        <span className="client-notes-content">
          {client.notes || client.note || 'No notes added'}
        </span>
      </div>

      {/* ── 3. Action Buttons & Navigation (Mobile vs Desktop) ── */}
      {isMobile ? (
        <>
          <div className="mobile-actions-wrapper">
            {actionButtons}
          </div>

          <div className="client-tabs-bar">
            <button
              className={`client-tab-btn ${tab === 'Plan' ? 'active' : ''}`}
              onClick={() => setTab('Plan')}
            >
              Plan
            </button>
            <button
              className={`client-tab-btn ${tab === 'Analytics' || tab === 'Logs' ? 'active' : ''}`}
              onClick={() => setTab('Analytics')}
            >
              Analytics
            </button>
          </div>
        </>
      ) : null}

      {/* ── 4. Main Tab Content ── */}
      {(tab === 'Plan' || !isMobile) && (
        <div className="workout-plan-section">
          {!isMobile && (
            <div className="workout-plan-header-desktop">
              <h3 className="workout-plan-title">
                <span className="title-bold">Workout Plan:</span>{' '}
                <span className="title-sub">{activePlan?.title || 'Push, Pull, Leg'}</span>
              </h3>
              {actionButtons}
            </div>
          )}

          {isMobile && (
            <h3 className="mobile-workout-heading">Workout Plan</h3>
          )}

          {/* Table View for Desktop */}
          {!isMobile ? (
            <div className="workout-plan-table-container">
              <Table className={"workout-plan-table"} columns={workoutTableColumns} data={daysList} />
            </div>
          ) : (
            /* Card Grid View for Mobile */
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
                      <button
                        className="btn-view-exercise-pill"
                        onClick={() => setSelectedExerciseSplit(item)}
                      >
                        View exercise
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Analytics / Workout Logs Tab (When active) ── */}
      {isMobile && tab === 'Analytics' && (
        <div className="analytics-section">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No Workout Logs Recorded</div>
              <div className="empty-text">When {client.name} logs a workout on their device, history will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map(log => (
                <div key={log.id} className="card" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="tick-mark">✓</span>
                      <span style={{ fontWeight: 600 }}>{log.split?.name || log.split?.day || 'Workout Log'}</span>
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
                    {log.exerciseLogs?.length || 0} sets logged successfully
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
                  No specific exercises configured for this split yet. Click 'Edit Plan' to add exercises.
                </div>
              )}
            </div>

            <button className="exercise-modal-close-btn" onClick={() => setSelectedExerciseSplit(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── 7. Remove Client Modal ── */}
      {showRemove && (
        <div className="modal-backdrop" onClick={() => setShowRemove(false)}>
          <div
            className="card"
            style={{
              width: '90%',
              maxWidth: 440,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12 }}>Remove {client.name}?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              They will be unassigned from your active clients list. Their past workout history is preserved.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRemove(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger-confirm"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── 8. Edit Client Modal ── */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div
            className="card edit-client-modal"
            style={{
              width: '90%',
              maxWidth: 480,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header-row" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Edit Client</h3>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="edit-client-form">
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaaaaa', marginBottom: 4 }}>
                  Client Name
                </label>
                <input
                  type="text"
                  value={client?.name || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #333333',
                    background: '#1a1a1a',
                    color: '#888888',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff', fontWeight: 600, marginBottom: 6 }}>
                  Notes <span style={{ fontSize: '0.78rem', color: '#888888', fontWeight: 400 }}>(Only editable field)</span>
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes about client goals, injuries, preferences..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #333333',
                    background: '#0d0d0d',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Select Plan to Assign Modal ── */}
      {showAssignModal && (
        <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div
            className="card assign-plan-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="assign-modal-header">
              <h3 className="assign-modal-title">Select a Plan to assign</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAssignModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><path d="M0 0h24v24H0V0z" fill="none" /><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" /></svg>
              </button>
            </div>

            <div className="assign-templates-list">
              {loadingTemplates ? (
                <div className="no-templates-text">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="no-templates-text">No templates available</div>
              ) : (
                templates.map(t => {
                  const isSelected = selectedTemplateId === t.id
                  return (
                    <div
                      key={t.id}
                      className={`assign-template-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedTemplateId(t.id)}
                    >
                      <div className={`radio-dot ${isSelected ? 'selected' : ''}`}>
                        {isSelected && <div className="radio-dot-inner" />}
                      </div>
                      <span className="template-title">{t.title}</span>
                      {isSelected && (
                        <button
                          className="assign-arrow-btn"
                          disabled={assigningTemplate}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAssignTemplate(t.id)
                          }}
                          title="Assign this template"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                            <path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="assign-modal-divider">
              <div className="divider-line" />
              <span className="divider-text">OR</span>
              <div className="divider-line" />
            </div>

            <Button
              className="btn-outline-white-pill"
              variant="primary-white"
              text="Create new plan"
              onClick={() => {
                setShowAssignModal(false)
                navigate(`/coach/clients/${id}/plan/create`)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

