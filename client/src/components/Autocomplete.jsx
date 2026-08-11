import { useState, useEffect, useRef } from 'react'

export default function Autocomplete({ value, onChange, suggestions = [], placeholder, onEnter, className = "form-input" }) {
  const [open, setOpen] = useState(false)
  const [filtered, setFiltered] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    if (!value?.trim()) { setFiltered([]); return }
    const q = value.toLowerCase()
    setFiltered(suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 12))
  }, [value, suggestions])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0, right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border-secondary)',
          borderRadius: 'var(--radius-md)',
          zIndex: 50,
          maxHeight: 180,
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
        }}>
          {filtered.map(s => (
            <div
              key={s}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border-secondary)'
              }}
              onMouseDown={() => { onChange(s); setOpen(false) }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
