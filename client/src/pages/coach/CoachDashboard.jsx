import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const WEEKDAY_SHORT = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa']
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
    <div className="activity-dots">
      {days.map((d, i) => {
        const logged = workoutLogs.some(l => isSameDay(new Date(l.loggedAt), d))
        return <div key={i} className={`activity-dot${logged ? ' active' : ''}`} title={d.toLocaleDateString()} />
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
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/coach/clients')
      .then(res => setClients(res.data))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false))
  }, [])

  const handleInviteClient = async () => {
    setShowInvite(true)
    setInviteLoading(true)
    setCopied(false)
    try {
      const res = await api.post('/coach/invite')
      setInviteLink(res.data.inviteLink)
    } catch {
      toast.error('Failed to generate invite link')
    } finally {
      setInviteLoading(false)
    }
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const todayLoggedCount = clients.filter(c =>
    c.workoutLogs?.some(l => isSameDay(new Date(l.loggedAt), new Date()))
  ).length

  if (loading) return <p className="loading-text">Loading...</p>

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Hey, {name || 'Coach'} 👋</h1>
        <p className="page-subtitle">Here's how your clients are doing today.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{clients.length}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{todayLoggedCount}</div>
          <div className="stat-label">Logged Today</div>
        </div>
      </div>

      {/* Table header */}
      <div className="section-header" style={{ marginBottom: 16 }}>
        <span className="section-title">Clients</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-bar">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              placeholder="Search clients…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleInviteClient}>
            + Add Client
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>CLIENT</th>
              <th>GOAL</th>
              <th>LAST 7 DAYS</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state">
                  {clients.length === 0
                    ? 'No clients yet — invite your first client.'
                    : 'No clients match your search.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.id} onClick={() => navigate(`/coach/clients/${c.id}`)}>
                <td>
                  <div className="client-cell">
                    <div className="avatar">{c.name?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.user?.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {GOAL_LABELS[c.goal] || '—'}
                </td>
                <td><ActivityDots workoutLogs={c.workoutLogs} /></td>
                <td>
                  <span className={`status-badge ${c.workoutLogs?.length ? 'status-active' : 'status-inactive'}`}>
                    {c.workoutLogs?.length ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Dialog */}
      {showInvite && (
        <div className="dialog-backdrop" onClick={() => setShowInvite(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Invite a Client</h3>
            <p>Share this link with your client so they can create their account and join you.</p>
            {inviteLoading ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}><span className="spinner" /></div>
            ) : (
              <div className="invite-link-row">
                <input className="invite-link-input" readOnly value={inviteLink} />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink)
                    setCopied(true)
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setShowInvite(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
