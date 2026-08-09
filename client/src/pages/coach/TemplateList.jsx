import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import './TemplateList.css'

export default function TemplateList() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/workout/plan/templates')
      .then(res => setTemplates(res.data))
      .catch(() => toast.error('Failed to load templates'))
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading workout templates...
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
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
          {templates.map(t => {
            const trainingDaysCount = (t.workoutSplits || []).filter(s => !s.isRestDay).length
            return (
              <div key={t.id} className="template-card-dark">
                <h2 className="template-card-title">{t.title}</h2>
                {t.description && (
                  <p className="template-card-desc">{t.description}</p>
                )}
                <div className="template-card-meta">
                  {trainingDaysCount} training days
                </div>

                <div className="template-card-actions" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn-template-edit"
                    onClick={() => navigate(`/coach/templates/${t.id}/edit`)}
                    style={{
                      background: 'transparent',
                      border: '1.5px solid #22c55e',
                      color: '#22c55e',
                      borderRadius: 9999,
                      padding: '8px 24px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-template-remove"
                    onClick={() => handleDelete(t.id)}
                    style={{
                      background: 'transparent',
                      border: '1.5px solid #ef4444',
                      color: '#ef4444',
                      borderRadius: 9999,
                      padding: '8px 24px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
