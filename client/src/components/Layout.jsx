import Navbar from './Navbar'
import MobileNav from './MobileNav'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { role } = useAuth()
  const r = role?.toLowerCase()
  const isGymOwner = r === 'gym_owner'
  const isCoach = r === 'coach'

  if (isGymOwner) {
    // Gym owner views manage their own sidebar layout via Sidebar component
    return <div className="app-container">{children}</div>
  }

  return (
    <div className="app-container">
      <div className="main-wrapper">
        <Navbar />
        <main className="page-content" style={isCoach ? { paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' } : undefined}>
          {children}
        </main>
        {isCoach && <MobileNav />}
      </div>
    </div>
  )
}
