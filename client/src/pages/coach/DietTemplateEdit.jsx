import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../services/api'
import Button from '../../components/Button'
import './DietTemplateEdit.css'

export default function DietTemplateEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Header edit state
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ title: '', description: '' })

  // Add meal form state
  const [addingMeal, setAddingMeal] = useState(false)
  const [mealForm, setMealForm] = useState({ name: '', notes: '' })

  // Inline edit meal
  const [editingMealId, setEditingMealId] = useState(null)
  const [editMealForm, setEditMealForm] = useState({ name: '', notes: '' })

  useEffect(() => {
    api.get(`/diet/templates/${id}`)
      .then(res => {
        setTemplate(res.data)
        setHeaderForm({ title: res.data.title, description: res.data.description || '' })
      })
      .catch(() => {
        toast.error('Failed to load diet template')
        navigate('/coach/diet-templates')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  // ── Header update ──────────────────────────────────────────────────────────

  const handleSaveHeader = async () => {
    if (!headerForm.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const res = await api.put(`/diet/templates/${id}`, headerForm)
      setTemplate(prev => ({ ...prev, title: res.data.title, description: res.data.description }))
      setEditingHeader(false)
      toast.success('Template updated')
    } catch {
      toast.error('Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  // ── Add meal ───────────────────────────────────────────────────────────────

  const handleAddMeal = async (e) => {
    e.preventDefault()
    if (!mealForm.name.trim()) return toast.error('Meal name is required')
    try {
      const res = await api.post(`/diet/templates/${id}/meals`, mealForm)
      setTemplate(prev => ({ ...prev, meals: [...(prev.meals || []), res.data] }))
      setMealForm({ name: '', notes: '' })
      setAddingMeal(false)
      toast.success('Meal added')
    } catch {
      toast.error('Failed to add meal')
    }
  }

  // ── Edit meal ──────────────────────────────────────────────────────────────

  const startEditMeal = (meal) => {
    setEditingMealId(meal.id)
    setEditMealForm({ name: meal.name, notes: meal.notes || '' })
  }

  const handleSaveMeal = async (mealId) => {
    if (!editMealForm.name.trim()) return toast.error('Meal name is required')
    try {
      const res = await api.put(`/diet/meals/${mealId}`, editMealForm)
      setTemplate(prev => ({
        ...prev,
        meals: prev.meals.map(m => m.id === mealId ? { ...m, ...res.data } : m),
      }))
      setEditingMealId(null)
      toast.success('Meal updated')
    } catch {
      toast.error('Failed to update meal')
    }
  }

  // ── Remove meal ────────────────────────────────────────────────────────────

  const handleRemoveMeal = async (mealId) => {
    if (!confirm('Remove this meal?')) return
    try {
      await api.delete(`/diet/meals/${mealId}`)
      setTemplate(prev => ({ ...prev, meals: prev.meals.filter(m => m.id !== mealId) }))
      toast.success('Meal removed')
    } catch {
      toast.error('Failed to remove meal')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading diet template...
      </div>
    )
  }

  if (!template) return null

  return (
    <div className="diet-edit-container">
      {/* Back */}
      <button className="diet-edit-back" onClick={() => navigate('/coach/diet-templates')}>
        ← Back to Diet Templates
      </button>

      {/* Template header */}
      <div className="diet-edit-header-card">
        {editingHeader ? (
          <div className="diet-edit-header-form">
            <input
              className="diet-input"
              type="text"
              placeholder="Template name *"
              value={headerForm.title}
              onChange={e => setHeaderForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            <textarea
              className="diet-input diet-textarea"
              placeholder="Description (optional)"
              value={headerForm.description}
              onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
            <div className="diet-create-actions">
              <Button variant="btn-primary" onClick={handleSaveHeader} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="btn-secondary" onClick={() => setEditingHeader(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="diet-edit-header-view">
            <div>
              <h1 className="diet-edit-title">{template.title}</h1>
              {template.description && (
                <p className="diet-edit-desc">{template.description}</p>
              )}
            </div>
            <button className="diet-edit-header-btn" onClick={() => setEditingHeader(true)}>
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Meals section */}
      <div className="diet-meals-section">
        <div className="diet-meals-header">
          <h2>Meals</h2>
          <Button variant="btn-primary" onClick={() => setAddingMeal(true)}>
            + Add Meal
          </Button>
        </div>

        {/* Add meal form */}
        {addingMeal && (
          <form className="diet-meal-form" onSubmit={handleAddMeal}>
            <input
              className="diet-input"
              type="text"
              placeholder="Meal name (e.g. Breakfast) *"
              value={mealForm.name}
              onChange={e => setMealForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <textarea
              className="diet-input diet-textarea"
              placeholder="Notes — foods, portions, timing… (optional)"
              value={mealForm.notes}
              onChange={e => setMealForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
            <div className="diet-create-actions">
              <Button type="submit" variant="btn-primary">Add</Button>
              <Button type="button" variant="btn-secondary" onClick={() => { setAddingMeal(false); setMealForm({ name: '', notes: '' }) }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Meal cards */}
        {(template.meals || []).length === 0 && !addingMeal ? (
          <div className="diet-meals-empty">
            No meals yet. Hit <strong>+ Add Meal</strong> to get started.
          </div>
        ) : (
          <div className="diet-meals-list">
            {(template.meals || []).map((meal, idx) => (
              <div key={meal.id} className="diet-meal-card">
                {editingMealId === meal.id ? (
                  <div className="diet-meal-edit-form">
                    <input
                      className="diet-input"
                      type="text"
                      placeholder="Meal name *"
                      value={editMealForm.name}
                      onChange={e => setEditMealForm(f => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                    <textarea
                      className="diet-input diet-textarea"
                      placeholder="Notes (optional)"
                      value={editMealForm.notes}
                      onChange={e => setEditMealForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                    />
                    <div className="diet-create-actions">
                      <Button variant="btn-primary" onClick={() => handleSaveMeal(meal.id)}>Save</Button>
                      <Button variant="btn-secondary" onClick={() => setEditingMealId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="diet-meal-card-top">
                      <span className="diet-meal-number">{idx + 1}</span>
                      <div className="diet-meal-card-info">
                        <div className="diet-meal-name">{meal.name}</div>
                        {meal.notes && <div className="diet-meal-notes">{meal.notes}</div>}
                      </div>
                      <div className="diet-meal-card-actions">
                        <button className="diet-meal-action-btn edit" onClick={() => startEditMeal(meal)} title="Edit meal">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="diet-meal-action-btn remove" onClick={() => handleRemoveMeal(meal.id)} title="Remove meal">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
