import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import InfoDiv from '../../components/InfoDiv'
import Button from '../../components/Button'
import "./GymDashboard.css";
import Table from '../../components/Table'
import Profile from '../../components/Profile'
import ClientCard from '../../components/ClientCard'


const MEMBERSHIP_TYPES = [
  { value: 'GENERAL', label: 'General Access' },
  { value: 'PERSONAL_TRAINING', label: 'Personal Training' },
  { value: 'BOTH', label: 'Both (General + PT)' },
]

function MembershipTypeBadge({ type }) {
  const labels = { GENERAL: 'General', PERSONAL_TRAINING: 'Personal Training', BOTH: 'Both' }
  return (
    <span style={{
      fontSize: '0.8rem',
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--surface-hover)',
      border: '1px solid var(--border-secondary)',
      color: 'var(--text-primary)'
    }}>
      {labels[type] || type}
    </span>
  )
}

export default function GymDashboard() {
  const [tab, setTab] = useState('Overview')
  const [gym, setGym] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [clients, setClients] = useState([])
  const [memberships, setMemberships] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const unAssignedClients = []


  // Invite trainer modal
  const [showTrainerInvite, setShowTrainerInvite] = useState(false)
  const [trainerInviteLink, setTrainerInviteLink] = useState('')
  const [trainerInviteLoading, setTrainerInviteLoading] = useState(false)

  // Create membership modal
  const [showCreateMembership, setShowCreateMembership] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [membershipType, setMembershipType] = useState('GENERAL')
  const [creatingMembership, setCreatingMembership] = useState(false)

  // Announcement compose
  const [newMsg, setNewMsg] = useState('')
  const [postingMsg, setPostingMsg] = useState(false)

  // mobile

  function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(
      () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches
    );

    useEffect(() => {
      const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
      const handler = (e) => setIsMobile(e.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }, [breakpoint]);

    return isMobile;
  }
  const isMobile = useIsMobile;

  //fetch all
  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [gymRes, trainerRes, clientRes, memberRes, annRes] = await Promise.all([
        api.get('/gym/profile'),
        api.get('/gym/trainers'),
        api.get('/gym/clients'),
        api.get('/gym/memberships'),
        api.get('/gym/announcements'),
      ])
      setGym(gymRes.data)
      setTrainers(trainerRes.data)
      setClients(clientRes.data)
      setMemberships(memberRes.data)
      setAnnouncements(annRes.data)
    } catch {
      toast.error('Failed to load gym data')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteTrainer = async () => {
    setShowTrainerInvite(true)
    setTrainerInviteLoading(true)
    try {
      const res = await api.post('/gym/trainers/invite')
      setTrainerInviteLink(res.data.inviteLink)
    } catch {
      toast.error('Failed to generate invite link')
    } finally {
      setTrainerInviteLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!trainerInviteLink) return
    navigator.clipboard.writeText(trainerInviteLink)
    toast.success('Invite link copied to clipboard')
  }

  const handleCreateMembership = async (e) => {
    e.preventDefault()
    if (!selectedClientId) {
      toast.error('Please select or enter a client ID')
      return
    }
    setCreatingMembership(true)
    try {
      const res = await api.post('/gym/memberships', {
        clientId: selectedClientId,
        type: membershipType,
        isActive: true,
      })
      setMemberships(prev => [res.data, ...prev])
      toast.success('Membership created successfully')
      setShowCreateMembership(false)
      setSelectedClientId('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create membership')
    } finally {
      setCreatingMembership(false)
    }
  }

  const handleToggleMembership = async (id, current) => {
    try {
      const res = await api.patch(`/gym/memberships/${id}`, { isActive: !current })
      setMemberships(prev => prev.map(m => m.id === id ? { ...m, ...res.data } : m))
      toast.success(res.data.isActive ? 'Membership activated ✓' : 'Membership deactivated')
    } catch {
      toast.error('Failed to update membership')
    }
  }

  const handlePostAnnouncement = async (e) => {
    e.preventDefault()
    if (!newMsg.trim()) return
    setPostingMsg(true)
    try {
      const res = await api.post('/gym/announcements', { message: newMsg.trim() })
      setAnnouncements(prev => [res.data, ...prev])
      setNewMsg('')
      toast.success('Announcement posted ✓')
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
      toast.success('Announcement deleted')
    } catch {
      toast.error('Failed to delete announcement')
    }
  }


  if (loading) {
    return (
      <div className="sidebar-layout">
        <Sidebar activeTab={tab} onTabChange={setTab} gymName={gym?.name} />
        <div className="main-wrapper">
          <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading facility data...</p>
          </main>
        </div>
      </div>
    )
  }

  const isCurrentMonthPaid = (membership) => {
    const now = new Date();
    const start = new Date(membership.startDate);
    const end = new Date(membership.endDate);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of this month

    // paid if the membership period overlaps this month at all
    return start <= monthEnd && end >= monthStart;
  };

  const hasCoach = (client) => {
    if (client.coachId) {
      return true
    }
    unAssignedClients.push(client);
    return false
  }

  const ExpiredMembersCount = memberships.filter(m => isCurrentMonthPaid(m)).length;

  const unassignedClientsColumns = [
    {
      key: 'profile',
      label: 'Client',
      render: (client) => <Profile name={client.name} size={"lg"} />,
    },
    { key: 'goal', label: 'Goal' },
    {
      key: 'action',
      label: '',
      render: (client) => (
        <Button
          variant="secondary"
          text="Assign Coach"
          onClick={() => handleAssignCoach(client.id)}
        />
      ),
    },
  ];

  const unassignedClientsData = clients.filter((c) => !c.coachId);

  return (
    <div className="sidebar-layout">
      {/* Persistent Sidebar Navigation */}
      <Sidebar activeTab={tab} onTabChange={setTab} gymName={gym?.name} />

      <div className="main-wrapper">
        <main className="page-content">
          {/* Header */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 className="page-title">{gym?.name || 'Gym Overview'}</h1>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className='quick-stats-container'>
            <InfoDiv info={trainers.length} infoLabel={"Total Trainers"}></InfoDiv>
            <InfoDiv info={clients.length} infoLabel={"Total Clients"}></InfoDiv>
            <InfoDiv info={ExpiredMembersCount} infoLabel={"Expired Membership Clients"}></InfoDiv>
          </div>
          {/* ─── Tab 1: Overview ───────────────────────────────────────────── */}
          {tab === 'Overview' && (

            <div className='quick-action-container'>
              <div>
                <h3>Quick Actions</h3>
              </div>
              <div className='quick-action card'>
                <Button variant={"secondary"} text={"Invite Trainer"} onClick={handleInviteTrainer}></Button>

                <Button variant={"secondary"} text={"Invite Client"}></Button>
                <Button variant={"primary"} text={"Post Announcement"} onClick={() => { setTab('Announcements') }}></Button>
              </div>

              {/*Un-assigned clients list*/}
              {isMobile ? (
                <div className="card-list">
                  {unassignedClientsData.map((client) => (
                    <ClientCard
                      key={client.id}
                      name={client.name}
                      data={client.goal}
                      others={
                        <Button variant="secondary" text="Assign Coach" onClick={() => handleAssignCoach(client.id)} />
                      }
                    />
                  ))}
                </div>
              ) : (
                <Table columns={unassignedClientsColumns} data={unassignedClientsData} />
              )}
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Latest Announcement</h3>
                {announcements.length === 0 ? (
                  <div className="empty-state" style={{ margin: 0 }}>
                    <div className="empty-icon">📣</div>
                    <div className="empty-title">No announcements yet</div>
                    <div className="empty-text">Broadcast messages to members right here.</div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setTab('Announcements')}>
                      Post First Announcement
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: 8 }}>
                      {announcements[0].message}
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Posted {new Date(announcements[0].createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Tab 2: Trainers ───────────────────────────────────────────── */}
          {tab === 'Trainers' && (
            <div>
              {trainers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏋️</div>
                  <div className="empty-title">No trainers yet — invite your first one</div>
                  <div className="empty-text">Generate a secure trainer invite link to add coaches to your gym facility.</div>
                  <button className="btn btn-primary" onClick={handleInviteTrainer} style={{ marginTop: 8 }}>
                    + Invite First Trainer
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
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
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600 }}>{t.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{t.email}</td>
                          <td>
                            <span className="status-badge status-active">
                              <span className="tick-mark">✓</span> {t.activeClientCount} Active
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
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

          {/* ─── Tab 3: Clients ────────────────────────────────────────────── */}
          {tab === 'Clients' && (
            <div>
              {clients.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <div className="empty-title">No clients registered yet</div>
                  <div className="empty-text">Clients are added when your trainers invite them to GainChek.</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>CLIENT NAME</th>
                        <th>EMAIL</th>
                        <th>PRIMARY GOAL</th>
                        <th>TRAINER</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {c.goal ? c.goal.replace('_', ' ') : '—'}
                          </td>
                          <td style={{ color: 'var(--text-primary)' }}>
                            {c.trainerName ? `🏋️ ${c.trainerName}` : 'Unassigned'}
                          </td>
                          <td>
                            {c.isActive ? (
                              <span className="status-badge status-active">
                                <span className="tick-mark">✓</span> Active Client
                              </span>
                            ) : (
                              <span className="status-badge status-inactive">Inactive</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab 4: Memberships ────────────────────────────────────────── */}
          {tab === 'Memberships' && (
            <div>
              {memberships.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💳</div>
                  <div className="empty-title">No memberships yet — create your first one</div>
                  <div className="empty-text">Track facility access, personal training subscriptions, and active status.</div>
                  <button className="btn btn-primary" onClick={() => setShowCreateMembership(true)} style={{ marginTop: 8 }}>
                    + Create First Membership
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>CLIENT</th>
                        <th>MEMBERSHIP TYPE</th>
                        <th>STATUS</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberships.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>
                            {m.client?.name || 'Client ID: ' + m.clientId.slice(0, 8)}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {m.client?.user?.email}
                            </div>
                          </td>
                          <td>
                            <MembershipTypeBadge type={m.type} />
                          </td>
                          <td>
                            {m.isActive ? (
                              <span className="status-badge status-active">
                                <span className="tick-mark">✓</span> Active
                              </span>
                            ) : (
                              <span className="status-badge status-inactive">Inactive</span>
                            )}
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${m.isActive ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => handleToggleMembership(m.id, m.isActive)}
                            >
                              {m.isActive ? 'Deactivate' : 'Activate ✓'}
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

          {/* ─── Tab 5: Announcements ──────────────────────────────────────── */}
          {tab === 'Announcements' && (
            <div>
              {/* Compose Box */}
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Post Announcement</h3>
                <form onSubmit={handlePostAnnouncement}>
                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="e.g. Facility hours extended to 10 PM this weekend!"
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={postingMsg || !newMsg.trim()}
                    >
                      {postingMsg ? 'Posting...' : '📣 Post Announcement'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Announcement List */}
              {announcements.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📣</div>
                  <div className="empty-title">No announcements posted yet</div>
                  <div className="empty-text">Type your message in the box above to announce updates to members.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {announcements.map(a => (
                    <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: 8 }}>
                          {a.message}
                        </p>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─── Invite Trainer Modal ─────────────────────────────────────────── */}
      {showTrainerInvite && (
        <div className="sidebar-overlay mobile-open" onClick={() => setShowTrainerInvite(false)}>
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
            <h3 style={{ marginBottom: 12 }}>Invite Trainer to Gym</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Share this secure single-use invite link with your new trainer to join your gym.
            </p>

            {trainerInviteLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Generating link...</p>
            ) : (
              <div className="form-group">
                <label className="form-label">Invite Link</label>
                <input
                  className="form-input"
                  readOnly
                  value={trainerInviteLink}
                  onClick={e => e.target.select()}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowTrainerInvite(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handleCopyLink} disabled={!trainerInviteLink}>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Membership Modal ──────────────────────────────────────── */}
      {showCreateMembership && (
        <div className="sidebar-overlay mobile-open" onClick={() => setShowCreateMembership(false)}>
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
            <h3 style={{ marginBottom: 12 }}>Create Membership</h3>
            <form onSubmit={handleCreateMembership}>
              <div className="form-group">
                <label className="form-label">Select Client</label>
                {clients.length > 0 ? (
                  <select
                    className="form-select"
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email || 'No email'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-input"
                    placeholder="Enter Client ID manually..."
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Membership Type</label>
                <select
                  className="form-select"
                  value={membershipType}
                  onChange={e => setMembershipType(e.target.value)}
                >
                  {MEMBERSHIP_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateMembership(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingMembership}
                >
                  {creatingMembership ? 'Creating...' : 'Create Membership ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
