import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import Button from './Button'

const COACH_LINKS = [
  { to: '/coach', label: 'Dashboard' },
  { to: '/coach/templates', label: 'Templates' },
  { to: '/coach/settings', label: 'Settings' },
]

const CLIENT_LINKS = [
  { to: '/client', label: 'Home' },
  { to: '/client/plan', label: 'My Plan' },
  { to: '/client/settings', label: 'Settings' },
]

const GYM_OWNER_LINKS = [
  { to: '/gym', label: 'Dashboard' },
]

const PUBLIC_LINKS = [
  { to: '/', label: 'Home' },
]

export default function Navbar() {
  const { token, role, name, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const r = role?.toLowerCase()
  const links = !token
    ? PUBLIC_LINKS
    : r === 'coach'
    ? COACH_LINKS
    : r === 'client'
    ? CLIENT_LINKS
    : r === 'gym_owner'
    ? GYM_OWNER_LINKS
    : PUBLIC_LINKS

  const brandPath = !token
    ? '/'
    : r === 'gym_owner'
    ? '/gym'
    : r === 'coach'
    ? '/coach'
    : '/client'

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    setMobileMenuOpen(false)
    logout()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/' || path === '/coach' || path === '/client' || path === '/gym') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="navbar">
      {/* Brand Logo */}
      <Link
        to={brandPath}
        className="navbar-brand"
        style={{ textDecoration: 'none' }}
      >
        <Logo height={26} textSize="1.2rem" />
      </Link>

      {/* Desktop Navigation */}
      <div className="navbar-desktop-right">
        {links.length > 0 && (
          <div className="navbar-links">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`nav-link${isActive(l.to) ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {token ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {name && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {name}
              </span>
            )}
            <Button variant="btn-secondary" className="btn-sm navbar-logout-btn" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button variant="btn-secondary" className="btn-sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button variant="btn-primary" className="btn-sm" onClick={() => navigate('/login')}>
              Get Started
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className="navbar-hamburger-btn"
        aria-label="Toggle navigation menu"
        onClick={() => setMobileMenuOpen(prev => !prev)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff">
          <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
        </svg>
      </button>

      {/* Mobile Fullscreen Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-navbar-overlay">
          <div className="mobile-navbar-header">
            <button
              className="navbar-hamburger-btn"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
              </svg>
            </button>
          </div>

          <div className="mobile-navbar-content">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {token ? (
              <button className="mobile-nav-logout-btn" onClick={handleLogout}>
                Sign Out
              </button>
            ) : (
              <button className="mobile-nav-logout-btn" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
