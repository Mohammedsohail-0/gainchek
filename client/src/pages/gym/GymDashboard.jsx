import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import useIsMobile from '../../hooks/useIsMobile'
import "./GymDashboard.css";
import api from '../../services/api'
import Sidebar from '../../components/Sidebar'
import InfoDiv from '../../components/InfoDiv'
import Button from '../../components/Button'
import Table from '../../components/Table'
import Profile from '../../components/Profile'
import ClientCard from '../../components/ClientCard'
import SearchBar from '../../components/SearchBar'


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
  const [trainerSearch, setTrainerSearch] = useState('')
  const [clients, setClients] = useState([])
  const [clientSearch, setClientSearch] = useState('')
  const [memberships, setMemberships] = useState([])
  const [membershipSearch, setMembershipSearch] = useState('')
  const [membershipFilter, setMembershipFilter] = useState('ALL')
  const [showMembershipFilterMenu, setShowMembershipFilterMenu] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  // Invite trainer modal
  const [showTrainerInvite, setShowTrainerInvite] = useState(false)
  const [trainerInviteLink, setTrainerInviteLink] = useState('')
  const [trainerInviteLoading, setTrainerInviteLoading] = useState(false)

  // Invite client modal
  const [showClientInvite, setShowClientInvite] = useState(false)
  const [clientInviteLink, setClientInviteLink] = useState('')
  const [clientInviteLoading, setClientInviteLoading] = useState(false)

  // Activate membership modal
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [activatingMembershipId, setActivatingMembershipId] = useState('')
  const [activatingClientName, setActivatingClientName] = useState('')
  const [activateStartDate, setActivateStartDate] = useState('')
  const [activateEndDate, setActivateEndDate] = useState('')
  const [activatingLoading, setActivatingLoading] = useState(false)

  // Remove membership warning modal
  const [showRemoveWarningModal, setShowRemoveWarningModal] = useState(false)
  const [membershipToRemoveId, setMembershipToRemoveId] = useState('')
  const [clientToRemoveName, setClientToRemoveName] = useState('')
  const [removingMembershipLoading, setRemovingMembershipLoading] = useState(false)

  // Create membership modal
  const [showCreateMembership, setShowCreateMembership] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [membershipType, setMembershipType] = useState('GENERAL')
  const [membershipStartDate, setMembershipStartDate] = useState(new Date().toISOString().split('T')[0])
  const [membershipEndDate, setMembershipEndDate] = useState('')
  const [creatingMembership, setCreatingMembership] = useState(false)

  // Assign Coach modal
  const [showAssignCoach, setShowAssignCoach] = useState(false)
  const [assignClientId, setAssignClientId] = useState('')
  const [assignCoachId, setAssignCoachId] = useState('')
  const [assigningCoach, setAssigningCoach] = useState(false)

  // Remove Trainer modal
  const [showRemoveTrainer, setShowRemoveTrainer] = useState(false)
  const [trainerToRemove, setTrainerToRemove] = useState(null)
  const [keepTrainerClients, setKeepTrainerClients] = useState(true)
  const [removingTrainer, setRemovingTrainer] = useState(false)

  // Announcement compose
  const [newMsg, setNewMsg] = useState('')
  const [postingMsg, setPostingMsg] = useState(false)

  // mobile
  const isMobile = useIsMobile();

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

  const handleInviteClient = async () => {
    setShowClientInvite(true)
    setClientInviteLoading(true)
    try {
      const res = await api.post('/gym/clients/invite')
      setClientInviteLink(res.data.inviteLink)
    } catch {
      toast.error('Failed to generate client invite link')
    } finally {
      setClientInviteLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!trainerInviteLink) return
    navigator.clipboard.writeText(trainerInviteLink)
    toast.success('Invite link copied to clipboard')
  }

  const handleCopyClientInviteLink = () => {
    if (!clientInviteLink) return
    navigator.clipboard.writeText(clientInviteLink)
    toast.success('Client invite link copied to clipboard')
  }

  const handleOpenActivateModal = (row) => {
    const membershipId = row.membershipId || row.id
    const name = row.name || row.client?.name || 'Client'
    const today = new Date().toISOString().split('T')[0]
    const nextMonthDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setActivatingMembershipId(membershipId)
    setActivatingClientName(name)
    setActivateStartDate(today)
    setActivateEndDate(nextMonthDate)
    setShowActivateModal(true)
  }

  const handleConfirmActivateMembership = async (e) => {
    e.preventDefault()
    if (!activatingMembershipId) return
    setActivatingLoading(true)
    try {
      const res = await api.patch(`/gym/memberships/${activatingMembershipId}`, {
        isActive: true,
        startDate: activateStartDate ? new Date(activateStartDate) : null,
        endDate: activateEndDate ? new Date(activateEndDate) : null
      })
      setMemberships(prev => prev.map(m => m.id === activatingMembershipId ? { ...m, ...res.data } : m))
      toast.success('Membership activated with updated dates ✓')
      setShowActivateModal(false)
    } catch {
      toast.error('Failed to activate membership')
    } finally {
      setActivatingLoading(false)
    }
  }

  const handleOpenRemoveWarning = (row) => {
    const membershipId = row.membershipId || row.id
    const name = row.name || row.client?.name || 'Client'
    setMembershipToRemoveId(membershipId)
    setClientToRemoveName(name)
    setShowRemoveWarningModal(true)
  }

  const handleConfirmRemoveMembership = async () => {
    if (!membershipToRemoveId) return
    setRemovingMembershipLoading(true)
    try {
      await api.delete(`/gym/memberships/${membershipToRemoveId}`)
      setMemberships(prev => prev.filter(m => m.id !== membershipToRemoveId))
      toast.success('Membership removed ✓')
      setShowRemoveWarningModal(false)
    } catch {
      toast.error('Failed to remove membership')
    } finally {
      setRemovingMembershipLoading(false)
    }
  }

  const handleCreateMembership = async (e) => {
    e.preventDefault()
    if (!selectedClientId) {
      toast.error('Please select or enter a client')
      return
    }
    setCreatingMembership(true)
    try {
      const res = await api.post('/gym/memberships', {
        clientId: selectedClientId,
        type: membershipType,
        isActive: true,
        startDate: membershipStartDate || null,
        endDate: membershipEndDate || null,
      })

      // Refresh memberships list to get full populated object
      const memberRes = await api.get('/gym/memberships')
      setMemberships(memberRes.data)

      toast.success('Membership created successfully')
      setShowCreateMembership(false)
      setSelectedClientId('')
      setMembershipStartDate(new Date().toISOString().split('T')[0])
      setMembershipEndDate('')
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

  const handleAssignCoach = (clientId) => {
    setAssignClientId(clientId)
    setAssignCoachId('')
    setShowAssignCoach(true)
  }

  const handleOpenAssignModalForTrainer = (trainerId) => {
    setAssignCoachId(trainerId || '')
    setAssignClientId('')
    setShowAssignCoach(true)
  }

  const handleSaveCoachAssignment = async (e) => {
    e.preventDefault()
    if (!assignClientId || !assignCoachId) {
      toast.error('Please select a trainer')
      return
    }
    setAssigningCoach(true)
    try {
      await api.post('/gym/trainers/reassign', {
        clientId: assignClientId,
        toCoachId: assignCoachId,
      })
      toast.success('Coach assigned successfully ✓')
      setShowAssignCoach(false)
      setAssignClientId('')
      setAssignCoachId('')

      const [clientRes, trainerRes] = await Promise.all([
        api.get('/gym/clients'),
        api.get('/gym/trainers'),
      ])
      setClients(clientRes.data)
      setTrainers(trainerRes.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign coach')
    } finally {
      setAssigningCoach(false)
    }
  }

  const handleOpenRemoveTrainer = (trainer) => {
    setTrainerToRemove(trainer)
    setKeepTrainerClients(true)
    setShowRemoveTrainer(true)
  }

  const handleConfirmRemoveTrainer = async (e) => {
    e.preventDefault()
    if (!trainerToRemove) return
    setRemovingTrainer(true)
    try {
      const res = await api.delete(`/gym/trainers/${trainerToRemove.id}`, {
        data: { keepClients: keepTrainerClients }
      })
      toast.success(res.data?.message || 'Trainer removed successfully')
      setShowRemoveTrainer(false)
      setTrainerToRemove(null)

      const [trainerRes, clientRes] = await Promise.all([
        api.get('/gym/trainers'),
        api.get('/gym/clients'),
      ])
      setTrainers(trainerRes.data)
      setClients(clientRes.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove trainer')
    } finally {
      setRemovingTrainer(false)
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

  const isMembershipExpired = (membership) => {
    if (!membership) return false
    const now = new Date()
    if (!membership.isActive) return true
    if (membership.endDate) {
      const end = new Date(membership.endDate)
      if (end <= now) return true
      const isCurrentMonth = end.getMonth() === now.getMonth() && end.getFullYear() === now.getFullYear()
      if (isCurrentMonth) return true
    }
    return false
  }

  const handleActivateClient = async (membershipId) => {
    try {
      const res = await api.patch(`/gym/memberships/${membershipId}`, { isActive: true })
      setMemberships(prev => prev.map(m => m.id === membershipId ? { ...m, ...res.data } : m))
      toast.success('Membership activated ✓')
    } catch {
      toast.error('Failed to activate membership')
    }
  }

  const handleRemoveClient = async (membershipId) => {
    try {
      await api.delete(`/gym/memberships/${membershipId}`)
      setMemberships(prev => prev.filter(m => m.id !== membershipId))
      toast.success('Membership removed ✓')
    } catch {
      toast.error('Failed to remove membership')
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

  const expiredMemberships = memberships.filter(m => isMembershipExpired(m))
  const expiredMembersCount = expiredMemberships.length

  const ExpiredClientsColumns = [
    {
      key: 'profile',
      label: 'Client',
      render: (row) => <Profile name={row.name} size={"lg"} />,
    },
    { key: 'expiredDate', label: 'Expiration Date' },
    { key: 'status', label: 'Status' },
    {
      key: 'action',
      label: '',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="primary"
            text="Activate"
            onClick={() => handleOpenActivateModal(row)}
          />
          <Button
            variant="danger"
            text="Remove"
            onClick={() => handleOpenRemoveWarning(row)}
          />
        </div>
      ),
    },
  ]

  const ExpiredMClientsData = expiredMemberships.map((m) => ({
    id: m.client?.id ?? m.clientId,
    membershipId: m.id,
    name: m.client?.name || m.client?.user?.email || 'Client',
    expiredDate: m.endDate ? new Date(m.endDate).toLocaleDateString() : '—',
    status: !m.isActive ? 'Deactivated' : 'Expired',
  }))

  const unassignedClientsColumns = [
    {
      key: 'client',
      label: 'CLIENT',
      render: (client) => (
        <div className="client-profile-cell">
          <Profile name={client.name} size={"lg"} />

        </div>
      ),
    },
    {
      key: 'goal',
      label: 'PROGRAM',
      render: (client) => (
        <span className="client-program-text">
          {client.goal ? client.goal.replace('_', ' ') : 'Weight loss'}
        </span>
      ),
    },
    {
      key: 'action',
      label: '',
      render: (client) => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-assign-clients"
            onClick={() => handleAssignCoach(client.id)}
          >
            {client.coachId ? 'Re-assign trainer' : 'Assign trainer'}
          </button>
          <button
            type="button"
            className="btn-remove-trainer"
            onClick={() => handleOpenRemoveWarning(client)}
          >
            Remove
          </button>
        </div>
      ),
    },
  ]

  const unassignedClientsData = clients.filter((c) => !c.coachId)
  const filteredClients = clients.filter(c =>
    (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.goal || '').toLowerCase().includes(clientSearch.toLowerCase())
  )
  const filteredTrainers = trainers.filter(t =>
    (t.name || '').toLowerCase().includes(trainerSearch.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(trainerSearch.toLowerCase())
  )
  const getDaysLeft = (membership) => {
    if (!membership || !membership.isActive || !membership.endDate) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const end = new Date(membership.endDate)
    end.setHours(0, 0, 0, 0)
    const diffTime = end.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const filteredMemberships = memberships.filter(m => {
    const clientName = m.client?.name || m.client?.user?.email || ''
    const matchesSearch = clientName.toLowerCase().includes(membershipSearch.toLowerCase()) ||
      (m.type || '').toLowerCase().includes(membershipSearch.toLowerCase())

    if (!matchesSearch) return false

    const expired = isMembershipExpired(m)
    const isPaidThisMonth = m.isActive && !expired

    if (membershipFilter === 'PAID_THIS_MONTH') {
      return isPaidThisMonth
    }
    if (membershipFilter === 'UNPAID_THIS_MONTH') {
      return !isPaidThisMonth
    }
    if (membershipFilter === 'FOR_3_MONTHS') {
      if (!m.startDate || !m.endDate) return false
      const start = new Date(m.startDate)
      const end = new Date(m.endDate)
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 75 && diffDays <= 105
    }

    return true
  })

  const membershipsColumns = [
    {
      key: 'name',
      label: 'NAME',
      render: (m) => (
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {m.client?.name || m.client?.user?.email || 'Client'}
        </div>
      ),
    },
    {
      key: 'endDate',
      label: 'END DATE',
      render: (m) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {m.endDate ? new Date(m.endDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'daysLeft',
      label: 'DAYS LEFT',
      render: (m) => {
        const days = getDaysLeft(m)
        if (days === null) {
          return <span style={{ color: 'var(--text-muted)' }}>Inactive</span>
        }
        if (days < 0) {
          return <span style={{ color: '#ef4444', fontWeight: 600 }}>Expired</span>
        }
        if (days === 0) {
          return <span style={{ color: '#eab308', fontWeight: 600 }}>Expires Today</span>
        }
        return (
          <span style={{ color: days <= 7 ? '#eab308' : '#4CAF50', fontWeight: 600 }}>
            {days} {days === 1 ? 'day' : 'days'} left
          </span>
        )
      },
    },
    {
      key: 'action',
      label: '',
      render: (m) => (
        <button
          type="button"
          className="btn-remove-trainer"
          onClick={() => handleOpenRemoveWarning(m)}
        >
          Remove client
        </button>
      ),
    },
  ]

  const trainersColumns = [
    {
      key: 'name',
      label: 'TRAINER NAME',
      render: (row) => (
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
      ),
    },
    {
      key: 'count',
      label: 'NUMBER OF CLIENTS',
      render: (row) => (
        <span className="active-clients">
          {row.count} {row.count === 1 ? 'Client' : 'Clients'}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'ACTION',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            text="Assign Client"
            onClick={() => handleOpenAssignModalForTrainer(row.id)}
          />
          <Button
            variant="danger"
            text="Remove Trainer"
            onClick={() => handleOpenRemoveTrainer(row.rawTrainer)}
          />
        </div>
      ),
    },
  ]

  const trainersData = filteredTrainers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    count: t.activeClientCount || 0,
    rawTrainer: t,
  }))
  return (
    <div className="sidebar-layout">
      {/* Persistent Sidebar Navigation */}
      <Sidebar activeTab={tab} onTabChange={setTab} />

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
            <InfoDiv info={expiredMembersCount} infoLabel={"Expired Membership Clients"}></InfoDiv>
          </div>
          {/* ─── Tab 1: Overview ───────────────────────────────────────────── */}
          {tab === 'Overview' && (

            <div className='quick-action-container'>
              <div>
                <h3>Quick Actions</h3>
              </div>
              <div className='quick-action card' style={{ gap: 12 }}>
                <Button variant={"secondary"} text={"Invite Trainer"} onClick={handleInviteTrainer}></Button>
                <Button variant={"secondary"} text={"Invite Client"} onClick={handleInviteClient}></Button>
                <Button variant={"secondary"} text={"Add / Manage Membership"} onClick={() => setShowCreateMembership(true)}></Button>
                <Button variant={"primary"} text={"Post Announcement"} onClick={() => setTab('Announcements')}></Button>
              </div>

              {/*Un-assigned clients list*/}
              <div className='un-assigned-clients-container'>
                <div>
                  <h3>Un-assigned clients</h3>
                </div>
                {unassignedClientsData.length === 0 ? (
                  <div className="card" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    All clients have an assigned trainer.
                  </div>
                ) : isMobile ? (
                  <div className="card-list">
                    {unassignedClientsData.map((client) => (
                      <ClientCard
                        className="trainers-card"
                        key={client.id}
                        name={client.name}
                        data={[
                          <div key="name" className="trainer-name">{client.name}</div>,
                          <div key="program" style={{ color: 'var(--text-secondary, #a1a1aa)', fontSize: '0.95rem' }}>
                            {client.goal ? client.goal.replace('_', ' ') : 'Weight loss'}
                          </div>,
                        ]}
                        others={
                          <div className="trainer-card-actions">
                            <button
                              type="button"
                              className="btn-assign-clients"
                              onClick={() => handleAssignCoach(client.id)}
                            >
                              Assign trainer
                            </button>
                            <button
                              type="button"
                              className="btn-remove-trainer"
                              onClick={() => handleOpenRemoveWarning(client)}
                            >
                              Remove
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <Table columns={unassignedClientsColumns} data={unassignedClientsData} />
                )}
              </div>

              {/*Expired clients list*/}
              <div className='expired-clients-container'>
                <div>
                  <h3>Membership expired</h3>
                </div>
                {ExpiredMClientsData.length === 0 ? (
                  <div className="card" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No expired or inactive membership clients.
                  </div>
                ) : isMobile ? (
                  <div className="card-list">
                    {ExpiredMClientsData.map((row) => (
                      <ClientCard
                        key={row.membershipId}
                        data={[row.name, `Expired: ${row.expiredDate}`]}
                        others={
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <Button variant="primary" text="Activate" onClick={() => handleOpenActivateModal(row)} />
                            <Button variant="danger" text="Remove" onClick={() => handleOpenRemoveWarning(row)} />
                          </div>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <Table columns={ExpiredClientsColumns} data={ExpiredMClientsData} />
                )}
              </div>

              <div className="card" style={{ display: 'flex' }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <SearchBar
                      value={trainerSearch}
                      onChange={(e) => setTrainerSearch(e.target.value)}
                      placeholder="Search trainers..."
                    />
                    <Button variant={"primary"} text={"+ Invite Trainer"} onClick={handleInviteTrainer}></Button>
                  </div>

                  {isMobile ? (
                    <div className="card-list">
                      {trainersData.length === 0 ? (
                        <div className="card" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No trainers match your search.
                        </div>
                      ) : (
                        trainersData.map((row) => (
                          <ClientCard
                            className="trainers-card"
                            key={row.id}
                            data={[
                              <div key="name" className="trainer-name">{row.name}</div>,
                              <div key="count" className="active-clients">
                                {row.count} {row.count === 1 ? 'active client' : 'active clients'}
                              </div>,
                            ]}
                            others={
                              <div className="trainer-card-actions">
                                <button
                                  type="button"
                                  className="btn-assign-clients"
                                  onClick={() => handleOpenAssignModalForTrainer(row.id)}
                                >
                                  Assign Clients
                                </button>
                                <button
                                  type="button"
                                  className="btn-remove-trainer"
                                  onClick={() => handleOpenRemoveTrainer(row.rawTrainer)}
                                >
                                  Remove
                                </button>
                              </div>
                            }
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <Table columns={trainersColumns} data={trainersData} />
                  )}
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
                  <button className="btn btn-primary" onClick={handleInviteClient} style={{ marginTop: 8 }}>
                    + Invite First Client
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <SearchBar
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search clients..."
                    />
                    <Button variant={"primary"} text={"+ Invite Client"} onClick={handleInviteClient}></Button>
                  </div>

                  {isMobile ? (
                    <div className="card-list">
                      {filteredClients.length === 0 ? (
                        <div className="card" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No clients match your search.
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <ClientCard
                            className="trainers-card"

                            data={[
                              <div key="name" className="trainer-name">{client.name}</div>,
                              <div key="program" style={{ color: 'var(--text-secondary, #a1a1aa)', fontSize: '0.95rem' }}>
                                {client.goal ? client.goal.replace('_', ' ') : 'Weight loss'}
                              </div>,
                            ]}
                            others={
                              <div className="trainer-card-actions">
                                <button
                                  type="button"
                                  className="btn-assign-clients"
                                  onClick={() => handleAssignCoach(client.id)}
                                >
                                  {client.coachId ? 'Re-assign trainer' : 'Assign trainer'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-remove-trainer"
                                  onClick={() => handleOpenRemoveWarning(client)}
                                >
                                  Remove
                                </button>
                              </div>
                            }
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <Table columns={unassignedClientsColumns} data={filteredClients} />
                  )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <button
                        type="button"
                        className="btn-create-membership-pill"
                        onClick={() => setShowCreateMembership(true)}
                      >
                        + Create membership
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <div style={{ flex: 1 }}>
                          <SearchBar
                            value={membershipSearch}
                            onChange={(e) => setMembershipSearch(e.target.value)}
                            placeholder="Search.."
                          />
                        </div>
                        <button
                          type="button"
                          className="filter-funnel-btn"
                          onClick={() => setShowMembershipFilterMenu(prev => !prev)}
                          title="Filter Memberships"
                          style={{
                            background: showMembershipFilterMenu ? 'var(--surface-hover)' : 'transparent',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={showMembershipFilterMenu ? 'var(--accent)' : '#FFFFFF'}>
                            <path d="M440-160q-17 0-28.5-11.5T400-200v-240L168-736q-15-20-4.5-42t36.5-22h560q26 0 36.5 22t-4.5 42L560-440v240q0 17-11.5 28.5T520-160h-80Zm40-308 198-252H282l198 252Zm0 0Z" />
                          </svg>
                        </button>
                      </div>

                      {showMembershipFilterMenu && (
                        <div style={{ width: '100%', marginTop: '4px' }}>
                          <select
                            className="form-select"
                            value={membershipFilter}
                            onChange={(e) => setMembershipFilter(e.target.value)}
                            style={{
                              width: '100%',
                              borderRadius: '50px',
                              backgroundColor: 'var(--surface-hover)',
                              borderColor: 'var(--border-secondary)',
                              padding: '10px 16px',
                              color: 'var(--text-primary)',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="ALL">All Memberships</option>
                            <option value="PAID_THIS_MONTH">Paid this month</option>
                            <option value="FOR_3_MONTHS">For 3 months</option>
                            <option value="UNPAID_THIS_MONTH">Unpaid for this month</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexDirection: 'row', flex: 1 }}>
                        <SearchBar
                          value={membershipSearch}
                          onChange={(e) => setMembershipSearch(e.target.value)}
                          placeholder="Search clients..."
                        />
                        <select
                          className="form-select"
                          value={membershipFilter}
                          onChange={(e) => setMembershipFilter(e.target.value)}
                          style={{
                            maxWidth: '220px',
                            borderRadius: '50px',
                            backgroundColor: 'var(--surface-hover)',
                            borderColor: 'var(--border-secondary)',
                            padding: '8px 16px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="ALL">All Memberships</option>
                          <option value="PAID_THIS_MONTH">Paid this month</option>
                          <option value="FOR_3_MONTHS">For 3 months</option>
                          <option value="UNPAID_THIS_MONTH">Unpaid for this month</option>
                        </select>
                      </div>
                      <div>
                        <Button variant="primary" text="+ Create Membership" onClick={() => setShowCreateMembership(true)} />
                      </div>
                    </div>
                  )}

                  {isMobile ? (
                    <div className="card-list">
                      {filteredMemberships.length === 0 ? (
                        <div className="card" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No memberships match your search or filter.
                        </div>
                      ) : (
                        filteredMemberships.map((m) => (
                          <ClientCard
                            className="trainers-card"
                            key={m.id}
                            name={m.client?.name || 'Client'}
                            data={[
                              <div key="name" className="trainer-name">{m.client?.name || m.client?.user?.email || 'Client'}</div>,
                              <div key="endDate" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                End Date: {m.endDate ? new Date(m.endDate).toLocaleDateString() : '—'}
                              </div>,
                              <div key="daysLeft" style={{ fontSize: '0.9rem', marginTop: '2px' }}>
                                {(() => {
                                  const days = getDaysLeft(m)
                                  if (days === null) return <span style={{ color: 'var(--text-muted)' }}>Inactive</span>
                                  if (days < 0) return <span style={{ color: '#ef4444', fontWeight: 600 }}>Expired</span>
                                  if (days === 0) return <span style={{ color: '#eab308', fontWeight: 600 }}>Expires Today</span>
                                  return (
                                    <span style={{ color: days <= 7 ? '#eab308' : '#4CAF50', fontWeight: 600 }}>
                                      {days} {days === 1 ? 'day' : 'days'} left
                                    </span>
                                  )
                                })()}
                              </div>
                            ]}
                            others={
                              <div className="trainer-card-actions">
                                <button
                                  type="button"
                                  className="btn-remove-trainer"
                                  onClick={() => handleOpenRemoveWarning(m)}
                                >
                                  Remove client
                                </button>
                              </div>
                            }
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <Table columns={membershipsColumns} data={filteredMemberships} />
                  )}
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
        <div className="modal-backdrop" onClick={() => setShowTrainerInvite(false)}>
          <div
            className="card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              zIndex: 260,
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

      {/* ─── Invite Client Modal ──────────────────────────────────────────── */}
      {showClientInvite && (
        <div className="modal-backdrop" onClick={() => setShowClientInvite(false)}>
          <div
            className="card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              zIndex: 260,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12 }}>Invite Client to Gym</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Share this secure invite link with a client to join your gym facility and receive membership.
            </p>

            {clientInviteLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Generating client invite link...</p>
            ) : (
              <div className="form-group">
                <label className="form-label">Client Invite Link</label>
                <input
                  className="form-input"
                  readOnly
                  value={clientInviteLink}
                  onClick={e => e.target.select()}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowClientInvite(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handleCopyClientInviteLink} disabled={!clientInviteLink}>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Activate Membership Pop-up Modal ─────────────────────────────── */}
      {showActivateModal && (
        <div className="modal-backdrop" onClick={() => setShowActivateModal(false)}>
          <div
            className="card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              zIndex: 260,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12 }}>Activate Membership</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Set active membership duration for <strong>{activatingClientName}</strong>.
            </p>
            <form onSubmit={handleConfirmActivateMembership}>
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={activateStartDate}
                    onChange={e => setActivateStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={activateEndDate}
                    onChange={e => setActivateEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowActivateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={activatingLoading}
                >
                  {activatingLoading ? 'Activating...' : 'Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Remove Membership Warning Modal ───────────────────────────────── */}
      {showRemoveWarningModal && (
        <div className="modal-backdrop" onClick={() => setShowRemoveWarningModal(false)}>
          <div
            className="card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              zIndex: 260,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12, color: 'var(--error)' }}>⚠️ Remove Client Membership</h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: 16, lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{clientToRemoveName}</strong>'s membership?
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 12, marginBottom: 20 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                💡 <strong>Notice:</strong> You will need to send an invitation link again to re-add this client to the gym facility.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRemoveWarningModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={removingMembershipLoading}
                onClick={handleConfirmRemoveMembership}
              >
                {removingMembershipLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Membership Modal ──────────────────────────────────────── */}
      {showCreateMembership && (
        <div className="modal-backdrop" onClick={() => setShowCreateMembership(false)}>
          <div
            className="card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              zIndex: 260,
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

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={membershipStartDate}
                    onChange={e => setMembershipStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">End Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={membershipEndDate}
                    onChange={e => setMembershipEndDate(e.target.value)}
                  />
                </div>
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

      {/* ─── Assign Coach Modal ───────────────────────────────────────────── */}
      {showAssignCoach && (
        <div className="modal-backdrop" onClick={() => setShowAssignCoach(false)}>
          <div
            className="card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              zIndex: 260,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12 }}>Assign Trainer to Client</h3>
            <form onSubmit={handleSaveCoachAssignment}>
              <div className="form-group">
                <label className="form-label">Client</label>
                <select
                  className="form-select"
                  value={assignClientId}
                  onChange={e => setAssignClientId(e.target.value)}
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.coachId ? '(Currently assigned)' : '(Unassigned)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Trainer</label>
                <select
                  className="form-select"
                  value={assignCoachId}
                  onChange={e => setAssignCoachId(e.target.value)}
                  required
                >
                  <option value="">Select trainer...</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>
                      🏋️ {t.name} ({t.activeClientCount || 0} active clients)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignCoach(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assigningCoach || !assignCoachId}
                >
                  {assigningCoach ? 'Assigning...' : 'Assign Coach ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Remove Trainer Modal ─────────────────────────────────────────── */}
      {showRemoveTrainer && trainerToRemove && (
        <div className="modal-backdrop" onClick={() => setShowRemoveTrainer(false)}>
          <div
            className="card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 480,
              zIndex: 260,
              margin: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 12 }}>Remove Trainer</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Are you sure you want to remove <strong>{trainerToRemove.name}</strong> from this gym facility?
            </p>
            <form onSubmit={handleConfirmRemoveTrainer}>
              <div className="form-group">
                <label className="form-label">What should happen to their clients?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="keepClients"
                      checked={keepTrainerClients === true}
                      onChange={() => setKeepTrainerClients(true)}
                    />
                    <span>Trainer keeps their clients as an independent coach</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="keepClients"
                      checked={keepTrainerClients === false}
                      onChange={() => setKeepTrainerClients(false)}
                    />
                    <span>Deactivate clients so gym owner can reassign them</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRemoveTrainer(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={removingTrainer}
                >
                  {removingTrainer ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}