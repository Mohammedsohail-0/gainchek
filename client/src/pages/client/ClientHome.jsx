import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const GOAL_LABELS = {
  BUILD_MUSCLE: 'Build Muscle',
  LOSE_FAT: 'Lose Fat',
  GET_STRONGER: 'Get Stronger',
  GENERAL_FITNESS: 'General Fitness',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function WeekStrip({ loggedDays = [] }) {
  const today = new Date()
  return (
    <div className="week-strip">
      {DAYS.map((d, i) => {
        const date = new Date()
        date.setDate(today.getDate() - today.getDay() + i)
        const isToday = date.toDateString() === today.toDateString()
        const dayOfMonth = date.getDate()
        const isLogged = loggedDays.includes(dayOfMonth)
        return (
          <div key={d} className={`week-strip-day${isToday ? ' today' : ''}`}>
            <span className="day-label">{d.slice(0, 2)}</span>
            <span className="day-date">{dayOfMonth}</span>
            <div className={`day-dot${isLogged ? ' logged' : ''}`} />
          </div>
        )
      })}
    </div>
  )
}

function StreakBadge({ streak }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: streak > 0 ? 'rgba(0,229,200,0.12)' : 'var(--bg-surface)',
      border: `1px solid ${streak > 0 ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', padding: '12px 20px',
    }}>
      <span style={{ fontSize: '1.5rem' }}>🔥</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--accent)', lineHeight: 1 }}>{streak}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Day streak</div>
      </div>
    </div>
  )
}

function TodayWorkoutCard({ plan, navigate }) {
  if (!plan) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          No active plan yet. Check back once your trainer sets one up.
        </p>
      </div>
    )
  }

  const today = DAYS[new Date().getDay()]
  const todaySplit = plan.workoutSplits?.find(s => s.day?.toLowerCase() === today.toLowerCase())

  if (!todaySplit || todaySplit.isRestDay) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>🛌</div>
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Rest day — enjoy the recovery!</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/client/log/${todaySplit.id}`)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
            {todaySplit.name || today + ' Workout'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {todaySplit.muscleGroups}
          </div>
        </div>
        <div className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Start →</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(todaySplit.exercises || []).filter(ex => !ex.isArchived).slice(0, 5).map(ex => (
          <span key={ex.id} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '4px 10px', fontSize: '0.78rem', color: 'var(--text-secondary)'
          }}>
            {ex.name}
          </span>
        ))}
        {(todaySplit.exercises || []).length > 5 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}>
            +{(todaySplit.exercises || []).length - 5} more
          </span>
        )}
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

        // Check onboarding
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

  if (loading) return <p className="loading-text">Loading...</p>

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Hey, {profile?.name || name} 👋</h1>
        <p className="page-subtitle">
          Coached by{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {profile?.coach?.user?.name || 'your trainer'}
          </strong>
        </p>
      </div>

      {/* Announcements banner */}
      {announcements.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <span>📣</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>
              Gym Announcement
            </span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {announcements[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StreakBadge streak={streak.streak} />
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '12px 20px',
        }}>
          <span style={{ fontSize: '1.5rem' }}>🏆</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)', lineHeight: 1 }}>
              {streak.longestStreak}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Best streak</div>
          </div>
        </div>
        {profile?.bodyWeight && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '12px 20px',
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚖️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                {profile.bodyWeight} kg
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current weight</div>
            </div>
          </div>
        )}
      </div>

      {/* This week */}
      {calendar && <WeekStrip loggedDays={calendar.loggedDays} />}

      {/* Today's workout */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <span className="section-title">Today's Workout</span>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/client/plan')}>
          View Full Plan
        </button>
      </div>
      <TodayWorkoutCard plan={plan} navigate={navigate} />
    </div>
  )
}
