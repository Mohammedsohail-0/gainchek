import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_LABEL = {
  gym_owner: 'Gym Owner',
  coach: 'Coach',
  client: 'Client',
}

const COACH_LINKS = [
  { to: '/coach', label: 'Dashboard' },
  { to: '/coach/templates', label: 'Templates' },
]

const CLIENT_LINKS = [
  { to: '/client', label: 'Home' },
  { to: '/client/plan', label: 'My Plan' },
]

export default function Navbar() {
  const { role, name, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const r = role?.toLowerCase()
  const links = r === 'coach' ? COACH_LINKS : r === 'client' ? CLIENT_LINKS : []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/coach' || path === '/client') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link
          to={r === 'gym_owner' ? '/gym' : r === 'coach' ? '/coach' : '/client'}
          className="navbar-brand"
          style={{ textDecoration: 'none' }}
        >
          GainChek <span className="tick-mark">✓</span>
        </Link>

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
      </div>

      <div className="navbar-actions">
        <span className={`role-badge role-${r || 'client'}`}>
          {ROLE_LABEL[r] || r}
        </span>
        {name && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'none', minWidth: 0 }}>
            {name}
          </span>
        )}
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
