import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

const GOAL_LABELS = {
  BUILD_MUSCLE: 'Build Muscle',
  LOSE_FAT: 'Lose Fat',
  GET_STRONGER: 'Get Stronger',
  GENERAL_FITNESS: 'General Fitness',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function WorkoutSplitAccordion({ plan }) {
  const [openSplitId, setOpenSplitId] = useState(null)

  if (!plan) return <p className="empty-state">No active plan assigned.</p>

  const ordered = DAYS
    .map(d => plan.workoutSplits?.find(s => s.day?.toLowerCase() === d.toLowerCase()))
    .filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ordered.map(split => (
        <div key={split.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button
            style={{
              width: '100%', padding: '14px 20px', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem'
            }}
            onClick={() => setOpenSplitId(openSplitId === split.id ? null : split.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', width: 70 }}>
                {split.day}
              </span>
              {split.isRestDay ? (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>
                  Rest day
                </span>
              ) : (
                <span>{split.name || split.day}</span>
              )}
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: openSplitId === split.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          {openSplitId === split.id && !split.isRestDay && split.exercises?.length > 0 && (
            <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)' }}>
              {split.exercises.map(ex => (
                <div key={ex.id} style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ex.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{ex.muscleGroup}</span>
                  </div>
                  {ex.exerciseSets?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {ex.exerciseSets.map(s => (
                        <div key={s.id} style={{
                          background: 'var(--bg-surface)', border: '1px solid var(--border)',
                          borderRadius: 'var(--r-sm)', padding: '4px 10px', fontSize: '0.78rem',
                          color: 'var(--text-secondary)'
                        }}>
                          {s.setNumber}. {s.reps} reps{s.weight != null ? ` @ ${s.weight}kg` : ''}
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

  // Remove client dialog
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
        if (e.response?.status !== 404) toast.error("Couldn't load plan")
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

  if (loading) return <p className="loading-text">Loading client...</p>
  if (!client) return <p className="empty-state">Client not found</p>

  const bwLogs = client.bodyWeightLogs || []
  const latestBw = bwLogs[0]?.weight

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Back + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/coach')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/coach/clients/${id}/plan/create`)}
          >
            + New Plan
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowRemove(true)}>
            Remove Client
          </button>
        </div>
      </div>

      {/* Client Profile Header */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        <div className="avatar avatar-lg" style={{ fontSize: '1.5rem' }}>
          {client.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 4 }}>{client.name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 8 }}>
            {client.user?.email}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {client.goal && (
              <span className="chip">{GOAL_LABELS[client.goal] || client.goal}</span>
            )}
            {latestBw && (
              <span className="chip" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--info)' }}>
                {latestBw} kg
              </span>
            )}
            {client.age && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{client.age} years</span>
            )}
            {client.gender && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{client.gender}</span>
            )}
          </div>
          {client.notes && (
            <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>
              "{client.notes}"
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {['Plan', 'Logs'].map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── Plan Tab ──────────────────────────────────────────────────────── */}
      {tab === 'Plan' && (
        <div>
          {activePlan ? (
            <>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <div className="section-title">{activePlan.title}</div>
                  {activePlan.description && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                      {activePlan.description}
                    </div>
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
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p style={{ marginBottom: 16 }}>No active plan. Assign a template or create a new one.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/coach/clients/${id}/plan/create`)}
                >
                  Create Plan
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
              <p>No workout logs yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map(log => (
                <div key={log.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{log.split?.name || log.split?.day || 'Workout'}</span>
                      {log.note && (
                        <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          {log.note}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(log.loggedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[...new Set(log.exerciseLogs?.map(l => l.exercise?.muscleGroup).filter(Boolean))].map(mg => (
                      <span key={mg} className="chip">{mg}</span>
                    ))}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}>
                      {log.exerciseLogs?.length || 0} sets logged
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remove Dialog */}
      {showRemove && (
        <div className="dialog-backdrop" onClick={() => setShowRemove(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Remove {client.name}?</h3>
            <p>
              They will be deactivated and no longer appear in your dashboard.
              Their workout history is preserved — they can be re-invited later.
            </p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setShowRemove(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRemove} disabled={removing}>
                {removing ? 'Removing...' : 'Remove Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
