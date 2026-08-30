import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import Button from './Button'

const COACH_LINKS = [
  { to: '/coach', label: 'Dashboard' },
  { to: '/coach/templates', label: 'Workouts' },
  { to: '/coach/diet-templates', label: 'Diet' },
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

  const r = role?.toLowerCase()
  const isCoach = r === 'coach'

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

  const handleLogout = () => {
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

      {/* Mobile Settings Button — coaches only, hidden on desktop */}
      {isCoach && (
        <Link
          to="/coach/settings"
          className="navbar-mobile-settings-btn"
          aria-label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </Link>
      )}
    </nav>
  )
}
