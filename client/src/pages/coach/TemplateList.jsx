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
  const [assignTemplate, setAssignTemplate] = useState(null) // template to assign
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
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this template? Assigned plans (already cloned) will NOT be deleted.')) return
    try {
      await api.delete(`/workout/plan/${id}`)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Template deleted')
    } catch { toast.error('Failed to delete') }
  }

  const handleAssign = async () => {
    if (!selectedClientId) return
    setAssigning(true)
    try {
      await api.post(`/workout/plan/${assignTemplate.id}/assign`, { clientId: selectedClientId })
      toast.success('Template assigned!')
      setAssignTemplate(null)
      setSelectedClientId('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign')
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
    } catch { toast.error('Push failed') }
    finally { setPushing(false) }
  }

  if (loading) return <p className="loading-text">Loading templates...</p>

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Reusable workout plans you can assign to multiple clients.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/coach/templates/create')}>
          + New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p style={{ marginBottom: 16 }}>No templates yet. Create one to reuse across clients.</p>
          <button className="btn btn-primary" onClick={() => navigate('/coach/templates/create')}>
            Create Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{t.title}</div>
                  {t.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 10 }}>
                      {t.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span className="chip">
                      {(t.workoutSplits || []).filter(s => !s.isRestDay).length} training days
                    </span>
                    <span className="chip" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--info)' }}>
                      {t._count?.clones || 0} assigned
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setAssignTemplate(t); setSelectedClientId('') }}>
                    Assign
                  </button>
                  {(t._count?.clones || 0) > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setPushTemplate(t); setPushResult(null) }}>
                      Push Update
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

      {/* ─── Assign Dialog ──────────────────────────────────────────────────── */}
      {assignTemplate && (
        <div className="dialog-backdrop" onClick={() => setAssignTemplate(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Assign Template</h3>
            <p>Choose a client to assign <strong>{assignTemplate.title}</strong> to. Their current active plan will be deactivated.</p>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Client</label>
              <select className="form-select" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setAssignTemplate(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!selectedClientId || assigning} onClick={handleAssign}>
                {assigning ? 'Assigning…' : 'Assign Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Push Dialog ─────────────────────────────────────────────────────── */}
      {pushTemplate && (
        <div className="dialog-backdrop" onClick={() => setPushTemplate(null)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3>Push Template Update</h3>
            {pushResult ? (
              <>
                <div style={{ background: 'var(--accent-dim)', borderRadius: 'var(--r-md)', padding: '16px', marginBottom: 20 }}>
                  <p style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>
                    ✓ Updated {pushResult.updated} of {pushResult.total} clients
                  </p>
                  {pushResult.failed?.length > 0 && (
                    <div>
                      <p style={{ color: 'var(--warning)', fontSize: '0.85rem', marginBottom: 8 }}>
                        Failed for:
                      </p>
                      {pushResult.failed.map((f, i) => (
                        <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {f.clientName}: {f.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="dialog-actions">
                  <button className="btn btn-secondary" onClick={() => setPushTemplate(null)}>Close</button>
                </div>
              </>
            ) : (
              <>
                <p>This will sync changes from <strong>{pushTemplate.title}</strong> to all {pushTemplate._count?.clones || 0} clients who have this template assigned.</p>
                <p style={{ color: 'var(--warning)', fontSize: '0.85rem', marginTop: 8 }}>
                  Exercises with existing logs will be archived, not deleted.
                </p>
                <div className="dialog-actions" style={{ marginTop: 20 }}>
                  <button className="btn btn-secondary" onClick={() => setPushTemplate(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handlePush} disabled={pushing}>
                    {pushing ? 'Pushing…' : 'Push Updates'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
