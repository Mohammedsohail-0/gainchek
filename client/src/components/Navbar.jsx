import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_LABEL = {
  gym_owner: 'Gym Owner',
  coach: 'Coach',
  client: 'Client',
}

const ROLE_BADGE_CLASS = {
  gym_owner: 'role-badge-gym_owner',
  coach: 'role-badge-coach',
  client: 'role-badge-client',
}

const COACH_LINKS = [
  { to: '/coach', label: 'Dashboard' },
  { to: '/coach/templates', label: 'Templates' },
]

const GYM_LINKS = [
  { to: '/gym', label: 'Overview' },
]

export default function Navbar() {
  const { role, name, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const r = role?.toLowerCase()
  const links = r === 'coach' ? COACH_LINKS : r === 'gym_owner' ? GYM_LINKS : []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) =>
    path === '/coach' || path === '/gym'
      ? location.pathname === path
      : location.pathname.startsWith(path)

  return (
    <nav className="navbar">
      <Link
        to={r === 'gym_owner' ? '/gym' : r === 'coach' ? '/coach' : '/client'}
        className="navbar-brand"
        style={{ textDecoration: 'none' }}
      >
        <span className="brand-dot" />
        GainChek
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

      <div className="navbar-actions">
        <span className={`navbar-role-badge ${ROLE_BADGE_CLASS[r] || ''}`}>
          {ROLE_LABEL[r] || r}
        </span>
        {name && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {name}
          </span>
        )}
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
