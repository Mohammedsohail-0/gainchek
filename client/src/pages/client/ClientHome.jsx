import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function WeekStrip({ loggedDays = [] }) {
  const today = new Date()
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 6,
      background: 'var(--surface)',
      border: '1px solid var(--border-secondary)',
      borderRadius: 'var(--radius-card)',
      padding: 12,
      marginBottom: 24,
      textAlign: 'center'
    }}>
      {DAYS.map((d, i) => {
        const date = new Date()
        date.setDate(today.getDate() - today.getDay() + i)
        const isToday = date.toDateString() === today.toDateString()
        const dayOfMonth = date.getDate()
        const isLogged = loggedDays.includes(dayOfMonth)
        return (
          <div
            key={d}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 4px',
              borderRadius: 'var(--radius-md)',
              background: isToday ? 'var(--accent-dim)' : 'transparent',
              border: isToday ? '1px solid var(--accent)' : '1px solid transparent'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{d.slice(0, 2)}</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, margin: '2px 0' }}>{dayOfMonth}</span>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isLogged ? 'var(--accent)' : 'var(--border-secondary)',
              marginTop: 4
            }} />
          </div>
        )
      })}
    </div>
  )
}

function TodayWorkoutCard({ plan, navigate }) {
  if (!plan) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <div className="empty-title">No Active Plan</div>
        <div className="empty-text">Your trainer hasn't assigned a workout plan yet. Check back soon!</div>
      </div>
    )
  }

  const today = DAYS[new Date().getDay()]
  const todaySplit = plan.workoutSplits?.find(s => s.day?.toLowerCase() === today.toLowerCase())

  if (!todaySplit || todaySplit.isRestDay) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛌</div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Rest & Recovery Day</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Take time to recover today. Hydrate, eat well, and stay active with light walking.
        </p>
      </div>
    )
  }

  return (
    <div
      className="card card-interactive"
      onClick={() => navigate(`/client/log/${todaySplit.id}`)}
      style={{ borderLeft: '4px solid var(--accent)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <span className="status-badge status-active" style={{ marginBottom: 8 }}>
            Today's Session
          </span>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>
            {todaySplit.name || todaySplit.day + ' Workout'}
          </h2>
          {todaySplit.muscleGroups && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              🎯 {todaySplit.muscleGroups}
            </p>
          )}
        </div>
        <button className="btn btn-primary">
          Start Workout →
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(todaySplit.exercises || []).filter(ex => !ex.isArchived).slice(0, 5).map(ex => (
          <span
            key={ex.id}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '0.8rem',
              color: 'var(--text-primary)'
            }}
          >
            {ex.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ClientHome() {
  const { name } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [streak, setStreak] = useState({ streak: 0, longestStreak: 0 })
  const [calendar, setCalendar] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, streakRes, calRes, annRes] = await Promise.all([
          api.get('/client/profile'),
          api.get('/analytics/streak'),
          api.get('/analytics/calendar'),
          api.get('/client/announcements'),
        ])
        setProfile(profileRes.data)
        setStreak(streakRes.data)
        setCalendar(calRes.data)
        setAnnouncements(annRes.data)

        if (!profileRes.data.goal) {
          navigate('/client/onboarding', { replace: true })
          return
        }

        try {
          const planRes = await api.get('/client/plan')
          setPlan(planRes.data)
        } catch (e) {
          if (e.response?.status !== 404) toast.error("Couldn't load plan")
        }
      } catch {
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [navigate])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        Loading workout dashboard...
      </div>
    )
  }

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Welcome, {profile?.name || name} 👋</h1>
        <p>
          Trainer:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {profile?.coach?.user?.name || 'Assigned Coach'}
          </strong>
        </p>
      </div>

      {/* Announcement notice */}
      {announcements.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-secondary)',
          borderRadius: 'var(--radius-card)',
          padding: 16,
          marginBottom: 24,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '1.4rem' }}>📣</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Gym Announcement
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {announcements[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 24
      }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Current Streak</div>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--accent)' }}>
            🔥 {streak.streak} Days
          </div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Best Streak</div>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            🏆 {streak.longestStreak} Days
          </div>
        </div>
        {profile?.bodyWeight && (
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Body Weight</div>
            <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              ⚖️ {profile.bodyWeight} kg
            </div>
          </div>
        )}
      </div>

      {/* Week Activity Strip */}
      {calendar && <WeekStrip loggedDays={calendar.loggedDays} />}

      {/* Today's Workout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem' }}>Today's Schedule</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/client/plan')}>
          View Full Plan →
        </button>
      </div>

      <TodayWorkoutCard plan={plan} navigate={navigate} />
    </div>
  )
}
