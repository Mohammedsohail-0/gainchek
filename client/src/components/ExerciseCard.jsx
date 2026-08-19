import Autocomplete from './Autocomplete'

export default function ExerciseCard({ exercise, onRemove, onUpdate, nameOptions }) {
  const addSet = () => onUpdate(ex => ({
    ...ex,
    sets: [...ex.sets, { id: crypto.randomUUID(), setNumber: ex.sets.length + 1, reps: '', weight: '' }]
  }))

  const removeSet = (setId) => onUpdate(ex => {
    const filtered = ex.sets.filter(s => s.id !== setId)
    return { ...ex, sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })) }
  })

  const updateSet = (setId, field, val) => onUpdate(ex => ({
    ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: val } : s)
  }))

  return (
    <div className="exercise-builder-card">
      <button type="button" className="remove-exercise-trash-btn" onClick={onRemove} title="Remove exercise">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ef4444">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
        </svg>
      </button>

      <div className="ex-field-label">Exercise Name :</div>
      <Autocomplete
        value={exercise.name}
        onChange={v => onUpdate(ex => ({ ...ex, name: v }))}
        suggestions={nameOptions}
        placeholder="eg. Bench press"
        className="ex-name-underline-input"
      />

      <div className="sets-header-grid">
        <span className="sets-header-label">SET</span>
        <span className="sets-header-label">KG</span>
        <span className="sets-header-label">REPS</span>
        <span className="sets-header-label"></span>
      </div>

      {exercise.sets.map(s => (
        <div key={s.id} className="ex-set-row-card">
          <div className="set-number-badge">
            {s.setNumber}
          </div>
          <input
            className="set-num-input"
            type="number"
            value={s.weight}
            onChange={e => updateSet(s.id, 'weight', e.target.value)}
            onWheel={e => e.target.blur()}
            placeholder=""
          />
          <input
            className="set-num-input"
            type="number"
            value={s.reps}
            onChange={e => updateSet(s.id, 'reps', e.target.value)}
            onWheel={e => e.target.blur()}
            placeholder=""
          />
          <button
            type="button"
            className="remove-set-x-btn"
            onClick={() => removeSet(s.id)}
            title="Remove set"
          >
            ✕
          </button>
        </div>
      ))}

      <button type="button" className="btn-add-set-pill" onClick={addSet}>
        + Add Set
      </button>
    </div>
  )
}
