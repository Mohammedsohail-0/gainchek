import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../../services/api'

const TABS = ['Overview', 'Trainers', 'Members', 'Announcements']
const MEMBERSHIP_TYPES = ['GENERAL', 'PERSONAL_TRAINING', 'BOTH']

function MembershipTypeLabel({ type }) {
  const labels = { GENERAL: 'General', PERSONAL_TRAINING: 'Personal Training', BOTH: 'Both' }
  return labels[type] || type
}

export default function GymDashboard() {
  const [tab, setTab] = useState('Overview')
  const [gym, setGym] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [members, setMembers] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  // Invite trainer dialog
  const [showTrainerInvite, setShowTrainerInvite] = useState(false)
  const [trainerInviteLink, setTrainerInviteLink] = useState('')
  const [trainerInviteLoading, setTrainerInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Announcement compose
  const [newMsg, setNewMsg] = useState('')
  const [postingMsg, setPostingMsg] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [gymRes, trainerRes, memberRes, annRes] = await Promise.all([
          api.get('/gym/profile'),
          api.get('/gym/trainers'),
          api.get('/gym/memberships'),
          api.get('/gym/announcements'),
        ])
        setGym(gymRes.data)
        setTrainers(trainerRes.data)
        setMembers(memberRes.data)
        setAnnouncements(annRes.data)
      } catch (err) {
        toast.error('Failed to load gym data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleInviteTrainer = async () => {
    setShowTrainerInvite(true)
    setTrainerInviteLoading(true)
    setCopied(false)
    try {
      const res = await api.post('/gym/trainers/invite')
      setTrainerInviteLink(res.data.inviteLink)
    } catch {
      toast.error('Failed to generate invite link')
    } finally {
      setTrainerInviteLoading(false)
    }
  }

  const handlePostAnnouncement = async () => {
    if (!newMsg.trim()) return
    setPostingMsg(true)
    try {
      const res = await api.post('/gym/announcements', { message: newMsg.trim() })
      setAnnouncements(prev => [res.data, ...prev])
      setNewMsg('')
      toast.success('Announcement posted')
    } catch {
      toast.error('Failed to post announcement')
    } finally {
      setPostingMsg(false)
    }
  }

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await api.delete(`/gym/announcements/${id}`)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } catch {
      toast.error('Failed to delete announcement')
    }
  }

  const handleToggleMembership = async (id, current) => {
    try {
      const res = await api.patch(`/gym/memberships/${id}`, { isActive: !current })
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...res.data } : m))
      toast.success(res.data.isActive ? 'Membership activated' : 'Membership deactivated')
    } catch {
      toast.error('Failed to update membership')
    }
  }

  if (loading) return <p className="loading-text">Loading gym data...</p>

  const activeMembers = members.filter(m => m.isActive).length

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">{gym?.name || 'Gym'}</h1>
        <p className="page-subtitle">Manage your facility, trainers, and members.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{trainers.length}</div>
          <div className="stat-label">Trainers</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{activeMembers}</div>
          <div className="stat-label">Active Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{members.length}</div>
          <div className="stat-label">Total Memberships</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{announcements.length}</div>
          <div className="stat-label">Announcements</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── Overview tab ──────────────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleInviteTrainer}>
                + Invite Trainer
              </button>
              <button className="btn btn-secondary" onClick={() => setTab('Announcements')}>
                📣 Post Announcement
              </button>
              <button className="btn btn-secondary" onClick={() => setTab('Members')}>
                👥 Manage Memberships
              </button>
            </div>
          </div>
          {/* Recent announcements preview */}
          {announcements.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Latest Announcement</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {announcements[0].message}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8 }}>
                {new Date(announcements[0].createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Trainers tab ──────────────────────────────────────────────────── */}
      {tab === 'Trainers' && (
        <div>
          <div className="section-header">
            <span className="section-title">Trainers ({trainers.length})</span>
            <button className="btn btn-primary btn-sm" onClick={handleInviteTrainer}>
              + Invite Trainer
            </button>
          </div>
          {trainers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏋️</div>
              <p>No trainers yet. Invite your first trainer.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TRAINER</th>
                    <th>EMAIL</th>
                    <th>ACTIVE CLIENTS</th>
                    <th>JOINED</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.map(t => (
                    <tr key={t.id} style={{ cursor: 'default' }}>
                      <td>
                        <div className="client-cell">
                          <div className="avatar">{t.name?.[0]?.toUpperCase() || '?'}</div>
                          <span>{t.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{t.email}</td>
                      <td>
                        <span className="chip">{t.activeClientCount} clients</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Members tab ───────────────────────────────────────────────────── */}
      {tab === 'Members' && (
        <div>
          <div className="section-header">
            <span className="section-title">Memberships ({members.length})</span>
          </div>
          {members.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No memberships yet.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>MEMBER</th>
                    <th>TYPE</th>
                    <th>STATUS</th>
                    <th>EXPIRES</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} style={{ cursor: 'default' }}>
                      <td>
                        <div className="client-cell">
                          <div className="avatar">{m.client?.name?.[0] || '?'}</div>
                          <div>
                            <div>{m.client?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {m.client?.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <MembershipTypeLabel type={m.type} />
                      </td>
                      <td>
                        <span className={`status-badge ${m.isActive ? 'status-active' : 'status-inactive'}`}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {m.endDate ? new Date(m.endDate).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${m.isActive ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleToggleMembership(m.id, m.isActive)}
                        >
                          {m.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Announcements tab ─────────────────────────────────────────────── */}
      {tab === 'Announcements' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 700 }}>New Announcement</h3>
            <textarea
              className="form-textarea"
              placeholder="Write a message to all members and trainers..."
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              rows={3}
              style={{ marginBottom: 12 }}
            />
            <button
              className="btn btn-primary"
              disabled={postingMsg || !newMsg.trim()}
              onClick={handlePostAnnouncement}
            >
              {postingMsg ? 'Posting...' : '📣 Post Announcement'}
            </button>
          </div>

          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📣</div>
              <p>No announcements yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {announcements.map(a => (
                <div key={a.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      {a.message}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8 }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAnnouncement(a.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Trainer Invite Dialog ──────────────────────────────────────────── */}
      {showTrainerInvite && (
        <div className="dialog-backdrop" onClick={() => setShowTrainerInvite(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Invite a Trainer</h3>
            <p>Share this link with a trainer so they can create their account and join your gym.</p>
            {trainerInviteLoading ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}><span className="spinner" /></div>
            ) : (
              <div className="invite-link-row">
                <input className="invite-link-input" readOnly value={trainerInviteLink} />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(trainerInviteLink)
                    setCopied(true)
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setShowTrainerInvite(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
