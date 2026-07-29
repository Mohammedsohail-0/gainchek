import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { id: 'Overview', label: 'Overview', icon: '📊' },
  { id: 'Trainers', label: 'Trainers', icon: '🏋️' },
  { id: 'Clients', label: 'Clients', icon: '👥' },
  { id: 'Memberships', label: 'Memberships', icon: '💳' },
  { id: 'Announcements', label: 'Announcements', icon: '📣' },
]

export default function Sidebar({ activeTab, onTabChange, gymName }) {
  const { name, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer on resize or tab selection
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSelectTab = (tabId) => {
    onTabChange(tabId)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="hamburger-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation Menu"
          >
            ☰
          </button>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem' }}>
            GainChek <span className="brand-tick">✓</span>
          </span>
        </div>
        <span className="role-badge role-gym_owner">Gym Owner</span>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' mobile-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-brand">
            GainChek <span className="brand-tick">✓</span>
          </div>

          {gymName && (
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              marginBottom: 16,
              padding: '8px 12px',
              background: 'var(--surface-hover)',
              borderRadius: 'var(--radius-md)'
            }}>
              🏢 {gymName}
            </div>
          )}

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span>{item.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {isActive && <span className="tick-mark">✓</span>}
                </button>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-user-name">{name || 'Gym Manager'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gym Owner</div>
            </div>
            <button
              className="btn btn-secondary btn-sm btn-full"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
