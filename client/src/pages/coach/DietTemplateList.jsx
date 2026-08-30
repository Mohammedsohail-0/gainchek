import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Button from '../../components/Button'
import './DietTemplateList.css'

export default function DietTemplateList() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })

  useEffect(() => {
    api.get('/diet/templates')
      .then(res => setTemplates(res.data))
      .catch(() => toast.error('Failed to load diet templates'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    try {
      const res = await api.post('/diet/templates', form)
      setTemplates(prev => [res.data, ...prev])
      setForm({ title: '', description: '' })
      setCreating(false)
      toast.success('Diet template created')
      navigate(`/coach/diet-templates/${res.data.id}/edit`)
    } catch {
      toast.error('Failed to create diet template')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this diet template?')) return
    try {
      await api.delete(`/diet/templates/${id}`)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading diet templates...
      </div>
    )
  }

  return (
    <div className="diet-list-container">
      {/* Page Header */}
      <div className="diet-list-header">
        <div>
          <h1 className="page-title">Diet Templates</h1>
          <p>Reusable meal plans for quick reference and client guidance.</p>
        </div>
        <Button variant="btn-primary" onClick={() => setCreating(true)}>
          + New Template
        </Button>
      </div>

      {/* Create form inline */}
      {creating && (
        <form className="diet-create-form" onSubmit={handleCreate}>
          <h3>New Diet Template</h3>
          <input
            className="diet-input"
            type="text"
            placeholder="Template name *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <textarea
            className="diet-input diet-textarea"
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
          />
          <div className="diet-create-actions">
            <Button type="submit" variant="btn-primary">Create</Button>
            <Button type="button" variant="btn-secondary" onClick={() => { setCreating(false); setForm({ title: '', description: '' }) }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Template cards */}
      {templates.length === 0 && !creating ? (
        <div className="diet-empty-state">
          <div className="diet-empty-icon">🥗</div>
          <div className="diet-empty-title">No diet templates yet</div>
          <div className="diet-empty-text">
            Create meal plan templates to guide your clients&apos; nutrition.
          </div>
          <Button variant="btn-primary" onClick={() => setCreating(true)} style={{ marginTop: 8 }}>
            + Create First Template
          </Button>
        </div>
      ) : (
        <div className="diet-cards-list">
          {templates.map(t => (
            <div key={t.id} className="diet-template-card">
              <div className="diet-template-card-body">
                <h2 className="diet-template-card-title">{t.title}</h2>
                {t.description && (
                  <p className="diet-template-card-desc">{t.description}</p>
                )}
                <div className="diet-template-card-meta">
                  {(t.meals || []).length} meal{(t.meals || []).length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="diet-template-card-actions">
                <button
                  type="button"
                  className="btn-template-edit"
                  onClick={() => navigate(`/coach/diet-templates/${t.id}/edit`)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-template-remove"
                  onClick={() => handleDelete(t.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
