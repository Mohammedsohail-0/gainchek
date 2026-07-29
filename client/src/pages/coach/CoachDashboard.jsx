import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function ActivityDots({ workoutLogs = [] }) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(today.getDate() - (6 - i))
    return d
  })

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {days.map((d, i) => {
        const logged = workoutLogs.some(l => isSameDay(new Date(l.loggedAt), d))
        return (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: logged ? 'var(--accent)' : 'var(--border-secondary)',
              boxShadow: logged ? '0 0 6px var(--accent-dim)' : 'none',
              transition: 'background-color var(--transition-fast)'
            }}
            title={`${d.toLocaleDateString()}: ${logged ? 'Workout Logged ✓' : 'No workout'}`}
          />
        )
      })}
    </div>
  )
}

const GOAL_LABELS = {
  BUILD_MUSCLE: 'Build Muscle',
  LOSE_FAT: 'Lose Fat',
  GET_STRONGER: 'Get Stronger',
  GENERAL_FITNESS: 'General Fitness',
}

export default function CoachDashboard() {
  const { name } = useAuth()
  const navigate = useNavigate()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    api.get('/coach/clients')
      .then(res => setClients(res.data))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false))
  }, [])

  const handleInviteClient = async () => {
    setShowInvite(true)
    setInviteLoading(true)
    try {
      const res = await api.post('/coach/invite')
      setInviteLink(res.data.inviteLink)
    } catch {
      toast.error('Failed to generate invite link')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    toast.success('Invite link copied to clipboard')
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const todayLoggedCount = clients.filter(c =>
    c.workoutLogs?.some(l => isSameDay(new Date(l.loggedAt), new Date()))
  ).length

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading client list...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Welcome, {name || 'Coach'} 👋</h1>
          <p>Manage your clients, workout plans, and track daily activity.</p>
        </div>
        <button className="btn btn-primary" onClick={handleInviteClient}>
          + Add Client
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Total Clients</div>
          <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>{clients.length}</div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Logged Workouts Today</div>
          <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            {todayLoggedCount} <span className="tick-mark" style={{ fontSize: '1.2rem' }}>✓</span>
          </div>
        </div>
      </div>

      {/* Filter and Section title */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}>
        <h2 style={{ fontSize: '1.2rem' }}>Clients ({filtered.length})</h2>
        <div style={{ maxWidth: 300, width: '100%' }}>
          <input
            className="form-input"
            placeholder="Search clients by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ minHeight: 40, padding: '8px 12px' }}
          />
        </div>
      </div>

      {/* Clients Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-title">
            {clients.length === 0 ? 'No clients yet — invite your first one' : 'No clients found'}
          </div>
          <div className="empty-text">
            {clients.length === 0
              ? 'Send your client invite link to start building workout plans and tracking progress.'
              : 'Try clearing your search term.'}
          </div>
          {clients.length === 0 && (
            <button className="btn btn-primary" onClick={handleInviteClient} style={{ marginTop: 8 }}>
              + Invite First Client
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>GOAL</th>
                <th>LAST 7 DAYS</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--surface-hover)',
                        border: '1px solid var(--border-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--accent)'
                      }}>
                        {c.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.user?.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {GOAL_LABELS[c.goal] || c.goal || '—'}
                  </td>
                  <td>
                    <ActivityDots workoutLogs={c.workoutLogs} />
                  </td>
                  <td>
                    {c.workoutLogs?.length ? (
                      <span className="status-badge status-active">
                        <span className="tick-mark">✓</span> Active
                      </span>
                    ) : (
                      <span className="status-badge status-inactive">Inactive</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/coach/clients/${c.id}`)}
                    >
                      View Profile →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="sidebar-overlay mobile-open" onClick={() => setShowInvite(false)}>
          <div
            className="card"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: 480,
              zIndex: 210,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12 }}>Invite a Client</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Share this secure invitation link with your client so they can register and connect with you.
            </p>

            {inviteLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Generating link...</p>
            ) : (
              <div className="form-group">
                <label className="form-label">Client Invite Link</label>
                <input
                  className="form-input"
                  readOnly
                  value={inviteLink}
                  onClick={e => e.target.select()}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowInvite(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handleCopyLink} disabled={!inviteLink}>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
