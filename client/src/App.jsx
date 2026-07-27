import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'

// Auth
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Gym
import GymDashboard from './pages/gym/GymDashboard'

// Coach
import CoachDashboard from './pages/coach/CoachDashboard'
import ClientDetail from './pages/coach/ClientDetail'
import CreatePlan from './pages/coach/CreatePlan'
import EditPlan from './pages/coach/EditPlan'
import TemplateList from './pages/coach/TemplateList'

// Client
import ClientHome from './pages/client/ClientHome'
import ClientOnboarding from './pages/client/ClientOnboarding'
import ClientPlan from './pages/client/ClientPlan'
import ClientWorkoutLog from './pages/client/ClientWorkoutLog'

function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role?.toLowerCase())) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const { role } = useAuth()

  const roleHomePath = () => {
    if (!role) return '/login'
    const r = role.toLowerCase()
    if (r === 'gym_owner') return '/gym'
    if (r === 'coach') return '/coach'
    if (r === 'client') return '/client'
    return '/login'
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to={roleHomePath()} replace />} />

      {/* Gym Owner */}
      <Route path="/gym" element={
        <ProtectedRoute allowedRoles={['gym_owner']}>
          <Layout><GymDashboard /></Layout>
        </ProtectedRoute>
      } />

      {/* Coach */}
      <Route path="/coach" element={
        <ProtectedRoute allowedRoles={['coach']}>
          <Layout><CoachDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/coach/clients/:id" element={
        <ProtectedRoute allowedRoles={['coach']}>
          <Layout><ClientDetail /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/coach/clients/:clientId/plan/create" element={
        <ProtectedRoute allowedRoles={['coach']}>
          <CreatePlan />
        </ProtectedRoute>
      } />
      <Route path="/coach/clients/:clientId/plan/:planId/edit" element={
        <ProtectedRoute allowedRoles={['coach']}>
          <EditPlan />
        </ProtectedRoute>
      } />
      <Route path="/coach/templates" element={
        <ProtectedRoute allowedRoles={['coach']}>
          <Layout><TemplateList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/coach/templates/create" element={
        <ProtectedRoute allowedRoles={['coach']}>
          <CreatePlan isTemplate />
        </ProtectedRoute>
      } />
      <Route path="/coach/templates/:planId/edit" element={
        <ProtectedRoute allowedRoles={['coach']}>
          <EditPlan isTemplate />
        </ProtectedRoute>
      } />

      {/* Client */}
      <Route path="/client" element={
        <ProtectedRoute allowedRoles={['client']}>
          <Layout><ClientHome /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/client/onboarding" element={
        <ProtectedRoute allowedRoles={['client']}>
          <ClientOnboarding />
        </ProtectedRoute>
      } />
      <Route path="/client/plan" element={
        <ProtectedRoute allowedRoles={['client']}>
          <Layout><ClientPlan /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/client/log/:splitId" element={
        <ProtectedRoute allowedRoles={['client']}>
          <Layout><ClientWorkoutLog /></Layout>
        </ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏋️</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Page not found</h2>
          <p>The page you're looking for doesn't exist.</p>
        </div>
      } />
    </Routes>
  )
}

export default App
