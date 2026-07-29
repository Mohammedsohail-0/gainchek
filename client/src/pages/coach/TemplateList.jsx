import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'

export default function TemplateList() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  // Assign dialog
  const [assignTemplate, setAssignTemplate] = useState(null)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Push dialog
  const [pushTemplate, setPushTemplate] = useState(null)
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/workout/plan/templates'),
      api.get('/coach/clients')
    ]).then(([tmplRes, clientRes]) => {
      setTemplates(tmplRes.data)
      setClients(clientRes.data)
    }).catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this template? Already assigned client plans will not be affected.')) return
    try {
      await api.delete(`/workout/plan/${id}`)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    }
  }

  const handleAssign = async () => {
    if (!selectedClientId) return
    setAssigning(true)
    try {
      await api.post(`/workout/plan/${assignTemplate.id}/assign`, { clientId: selectedClientId })
      toast.success('Template assigned to client ✓')
      setAssignTemplate(null)
      setSelectedClientId('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign template')
    } finally {
      setAssigning(false)
    }
  }

  const handlePush = async () => {
    setPushing(true)
    setPushResult(null)
    try {
      const res = await api.post(`/workout/plan/${pushTemplate.id}/push`)
      setPushResult(res.data)
      toast.success('Pushed updates to active plans ✓')
    } catch {
      toast.error('Push failed')
    } finally {
      setPushing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading workout templates...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Workout Templates</h1>
          <p>Reusable workout splits and programs for quick assignment.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/coach/templates/create')}>
          + New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No templates yet — create your first template</div>
          <div className="empty-text">
            Templates let you quickly assign structured 3-day, 4-day, or PPL workout splits to any client.
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/coach/templates/create')} style={{ marginTop: 8 }}>
            + Create First Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{t.title}</div>
                  {t.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
                      {t.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="status-badge status-active">
                      <span className="tick-mark">✓</span> {(t.workoutSplits || []).filter(s => !s.isRestDay).length} Workout Days
                    </span>
                    <span className="status-badge status-inactive">
                      👥 {t._count?.clones || 0} Assigned
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center' }}>
                      Created {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setAssignTemplate(t); setSelectedClientId('') }}>
                    Assign Plan
                  </button>
                  {(t._count?.clones || 0) > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setPushTemplate(t); setPushResult(null) }}>
                      Push Updates
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/coach/templates/${t.id}/edit`)}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {assignTemplate && (
        <div className="sidebar-overlay mobile-open" onClick={() => setAssignTemplate(null)}>
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
            <h3 style={{ marginBottom: 12 }}>Assign Template</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Assign <strong>{assignTemplate.title}</strong> to a client. This will set their active workout plan.
            </p>

            <div className="form-group">
              <label className="form-label">Select Client</label>
              <select className="form-select" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setAssignTemplate(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!selectedClientId || assigning} onClick={handleAssign}>
                {assigning ? 'Assigning...' : 'Assign Plan ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Updates Modal */}
      {pushTemplate && (
        <div className="sidebar-overlay mobile-open" onClick={() => setPushTemplate(null)}>
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
            <h3 style={{ marginBottom: 12 }}>Push Template Updates</h3>
            {pushResult ? (
              <div>
                <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: 20 }}>
                  <p style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    ✓ Updated {pushResult.updated} of {pushResult.total} assigned client plans.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setPushTemplate(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Sync updates from <strong>{pushTemplate.title}</strong> to all {pushTemplate._count?.clones || 0} clients currently using this template.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setPushTemplate(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handlePush} disabled={pushing}>
                    {pushing ? 'Pushing...' : 'Push Updates ✓'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
