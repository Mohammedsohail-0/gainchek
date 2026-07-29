import Navbar from './Navbar'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { role } = useAuth()
  const isGymOwner = role?.toLowerCase() === 'gym_owner'

  if (isGymOwner) {
    // Gym owner views manage their own sidebar layout via Sidebar component
    return <div className="app-container">{children}</div>
  }

  return (
    <div className="app-container">
      <div className="main-wrapper">
        <Navbar />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
