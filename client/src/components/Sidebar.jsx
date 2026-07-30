import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const NAV_ITEMS = [
  { id: 'Overview', label: 'Home', icon: '' },
  { id: 'Trainers', label: 'Trainers', icon: '' },
  { id: 'Clients', label: 'Clients', icon: '' },
  { id: 'Memberships', label: 'Memberships', icon: '' },
  { id: 'Announcements', label: 'Announcements', icon: '' },
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
        <Logo height={24} textSize="1.15rem" />
        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="3" rx="1.5" fill="var(--accent, #4CAF50)" />
            <rect y="7.5" width="24" height="3" rx="1.5" fill="var(--accent, #4CAF50)" />
            <rect y="15" width="24" height="3" rx="1.5" fill="var(--accent, #4CAF50)" />
          </svg>
        </button>
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
            <Logo height={28} textSize="1.25rem" />
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
                  {isActive && <span className="tick-mark"></span>}
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
