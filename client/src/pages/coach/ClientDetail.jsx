import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import ClientCard from '../../components/ClientCard'

const GOAL_LABELS = {
  BUILD_MUSCLE: 'Build Muscle',
  LOSE_FAT: 'Lose Fat',
  GET_STRONGER: 'Get Stronger',
  GENERAL_FITNESS: 'General Fitness',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function WorkoutSplitAccordion({ plan }) {
  const [openSplitId, setOpenSplitId] = useState(null)

  if (!plan) return null

  const ordered = DAYS
    .map(d => plan.workoutSplits?.find(s => s.day?.toLowerCase() === d.toLowerCase()))
    .filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ordered.map(split => (
        <div key={split.id} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
          <button
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
            onClick={() => setOpenSplitId(openSplitId === split.id ? null : split.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', width: 80 }}>
                {split.day}
              </span>
              {split.isRestDay ? (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>
                  Rest Day
                </span>
              ) : (
                <span>{split.name || split.day}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!split.isRestDay && split.exercises?.length > 0 && (
                <span className="status-badge status-active">
                  <span className="tick-mark">✓</span> {split.exercises.length} Exercises
                </span>
              )}
              <span style={{ transform: openSplitId === split.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▼
              </span>
            </div>
          </button>

          {openSplitId === split.id && !split.isRestDay && split.exercises?.length > 0 && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-secondary)', background: 'var(--bg)' }}>
              {split.exercises.map(ex => (
                <div key={ex.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ex.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{ex.muscleGroup}</span>
                  </div>
                  {ex.exerciseSets?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {ex.exerciseSets.map(s => (
                        <div
                          key={s.id}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 10px',
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)'
                          }}
                        >
                          Set {s.setNumber}: <strong>{s.reps} reps</strong> {s.weight != null ? `@ ${s.weight}kg` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Plan')

  // Remove dialog
  const [showRemove, setShowRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

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

  return (
    <div>

      <div>
        <ClientCard
          pSize={"md"}
          data={[
            <>
              <div className='client-name'>
                {client.name}
              </div>
              <div>
                <span>{client.user.email}</span>
                <div>
                  <span>age: {client.age}, </span>
                  <span>gender: {client.gender}</span>
                </div>
                <span>Body weight: {latestBw} </span>
                <span>Goal: {(client.goal ? client.goal.replace(/_/g, " ") : "not set yet").toLowerCase()}</span>
              </div>
            </>
          ]}
          others={
            <button>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" /></svg>
            </button>
          }
        >
        </ClientCard>
      </div>
      {/* Client Profile Overview Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--surface-hover)',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--accent)'
          }}>
            {client.name?.[0]?.toUpperCase() || '?'}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 className="page-title" style={{ fontSize: '1.4rem', marginBottom: 4 }}>{client.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
              {client.user?.email || 'No email registered'}
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {client.goal && (
                <span className="status-badge status-active">
                  🎯 {GOAL_LABELS[client.goal] || client.goal}
                </span>
              )}
              {latestBw && (
                <span className="status-badge status-inactive">
                  ⚖️ {latestBw} kg
                </span>
              )}
              {client.age && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                  {client.age} yrs old
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-secondary)', paddingBottom: 8 }}>
        <button
          className={`nav-link${tab === 'Plan' ? ' active' : ''}`}
          onClick={() => setTab('Plan')}
        >
          Active Plan
        </button>
        <button
          className={`nav-link${tab === 'Logs' ? ' active' : ''}`}
          onClick={() => setTab('Logs')}
        >
          Workout History ({logs.length})
        </button>
      </div>

      {/* ─── Plan Tab ──────────────────────────────────────────────────────── */}
      {tab === 'Plan' && (
        <div>
          {activePlan ? (
            <div>
              <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '1.15rem' }}>{activePlan.title}</h3>
                    <span className="status-badge status-active">
                      <span className="tick-mark">✓</span> Active
                    </span>
                  </div>
                  {activePlan.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      {activePlan.description}
                    </p>
                  )}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/coach/clients/${id}/plan/${activePlan.id}/edit`)}
                >
                  Edit Plan
                </button>
              </div>

              <WorkoutSplitAccordion plan={activePlan} />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No Active Workout Plan</div>
              <div className="empty-text">Create a custom workout plan or assign a pre-made template.</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/coach/clients/${id}/plan/create`)}
                >
                  + Create Custom Plan
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/coach/templates')}
                >
                  Use Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Logs Tab ──────────────────────────────────────────────────────── */}
      {tab === 'Logs' && (
        <div>
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

      {/* Remove Client Modal */}
      {showRemove && (
        <div className="sidebar-overlay mobile-open" onClick={() => setShowRemove(false)}>
          <div
            className="card"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: 440,
              zIndex: 210,
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
    </div>
  )
}
