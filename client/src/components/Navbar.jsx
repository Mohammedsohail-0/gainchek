import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const COACH_LINKS = [
  { to: '/coach', label: 'Dashboard' },
  { to: '/coach/templates', label: 'Templates' },
]

const CLIENT_LINKS = [
  { to: '/client', label: 'Home' },
  { to: '/client/plan', label: 'My Plan' },
]

export default function Navbar() {
  const { role, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const r = role?.toLowerCase()
  const links = r === 'coach' ? COACH_LINKS : r === 'client' ? CLIENT_LINKS : []

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    setMobileMenuOpen(false)
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
      {/* Brand Logo */}
      <Link
        to={r === 'gym_owner' ? '/gym' : r === 'coach' ? '/coach' : '/client'}
        className="navbar-brand"
        style={{ textDecoration: 'none' }}
      >
        <Logo height={26} textSize="1.2rem" />
      </Link>

      {/* Desktop Navigation (Right Aligned) */}
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
        <button className="btn btn-secondary btn-sm navbar-logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      {/* Mobile Hamburger Button (3 lines) */}
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
                <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
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
            <button className="mobile-nav-logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
