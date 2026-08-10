import './ClientHome.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Button from '../../components/Button';

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_SHORT_MON = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];

const isSameDay = (a, b) =>
  Boolean(a && b && !isNaN(new Date(a)) && !isNaN(new Date(b)) &&
    new Date(a).getFullYear() === new Date(b).getFullYear() &&
    new Date(a).getMonth() === new Date(b).getMonth() &&
    new Date(a).getDate() === new Date(b).getDate());

// Returns Monday..Sunday Date objects for the week containing `today`
const getWeekDates = (today) => {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1; // Offset to get Monday
  start.setDate(today.getDate() - diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

function ClientHome() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState('');
  const [weightLogs, setWeightLogs] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [weightInput, setWeightInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date();
  const todayName = WEEKDAY_NAMES[today.getDay()];

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, weightRes, historyRes] = await Promise.all([
          api.get('/client/profile'),
          api.get('/client/bodyweight'),
          api.get('/log/history')
        ]);
        setProfile(profileRes.data);

        if (!profileRes.data.goal) {
          navigate('/client/onboarding');
          return;
        }

        setWeightLogs(Array.isArray(weightRes.data) ? weightRes.data : []);
        setWorkoutLogs(Array.isArray(historyRes.data?.logs) ? historyRes.data.logs : (Array.isArray(historyRes.data) ? historyRes.data : []));

        try {
          const planRes = await api.get('/client/plan');
          setPlan(planRes.data);
        } catch (err) {
          if (err.response?.status === 404) {
            setPlanError('No active plan yet — check back once your coach sets one up.');
          } else {
            setPlanError("Couldn't load your plan.");
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const handleLogWeight = async () => {
    const weightNum = Number(weightInput);
    if (!weightInput || isNaN(weightNum) || weightNum <= 0) {
      toast.error('Please enter a valid weight.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/client/bodyweight', { weight: weightNum });
      setWeightLogs((prev) => [res.data, ...prev]);
      setWeightInput('');
      toast.success('Bodyweight logged!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save bodyweight log.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasLoggedToday = weightLogs.some((log) => isSameDay(log.loggedAt, today));

  const todaySplit = plan?.workoutSplits?.find((s) => s.day?.toLowerCase() === todayName);

  const loggedToday = workoutLogs.some(
    (log) => log.splitId === todaySplit?.id && isSameDay(log.loggedAt, today)
  );

  const muscleGroupList = (split) => {
    if (!split) return [];
    if (split.exercises?.length) {
      const groups = split.exercises
        .map((e) => e.muscleGroup)
        .filter((mg) => mg && typeof mg === 'string' && mg.trim() !== '');
      if (groups.length > 0) return [...new Set(groups)];
    }
    if (split.muscleGroups) {
      if (Array.isArray(split.muscleGroups)) return split.muscleGroups;
      return split.muscleGroups.split(',').map((m) => m.trim()).filter(Boolean);
    }
    return [];
  };

  const weekDates = getWeekDates(today);

  if (loading) {
    return <p className="loading-text">Loading...</p>;
  }

  const clientName = profile?.name || profile?.user?.name || 'there';
  const trainerName = profile?.coach?.user?.name || profile?.coach?.name;
  const gymName = profile?.coach?.gym?.name || profile?.memberships?.[0]?.gym?.name;

  return (
    <div className="client-home">
      <h1 className="client-greeting">Hey, {clientName}</h1>

      {(trainerName) && (
        <div className="client-meta-badges">
          {trainerName && (
            <span className="client-meta-badge">
              <span className="badge-label">Trainer:</span> {trainerName}
            </span>
          )}
        </div>
      )}

      {!hasLoggedToday ? (
        <div className="bodyweight-input-section">
          <p className="bodyweight-label">Enter Today's Body Weight</p>
          <div className="bodyweight-input-wrapper">
            <input
              type="number"
              className="bodyweight-input"
              placeholder="kg"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogWeight(); }}
              min="1"
              step="0.1"
            />
          </div>
          <Button
            variant="primary"
            text={submitting ? 'Saving...' : 'Enter'}
            onClick={handleLogWeight}
            disabled={submitting || !weightInput}
          />
        </div>
      ) : (
        <div className="week-strip-container">
          <div className="week-strip">
            {weekDates.map((d, i) => {
              const isToday = isSameDay(d, today);
              const logged = weightLogs.some((log) => isSameDay(log.loggedAt, d));
              return (
                <div key={d.toISOString()} className={`week-strip-day ${isToday ? 'active' : ''}`}>
                  <span className="day-label">{WEEKDAY_SHORT_MON[i]}</span>
                  <span className="day-date">{d.getDate()}</span>
                  <span className={`day-dot ${logged ? 'logged' : ''}`}></span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <section className="today-workout-section">
        <h2>Today's workout</h2>

        {planError && <p className="empty-state">{planError}</p>}

        {!planError && todaySplit && (
          <div className="today-workout-card">
            <div className="today-workout-card-header">
              <span className="split-name">{todaySplit.name || 'Workout'}</span>
              <span className="split-day">
                {todayName.charAt(0).toUpperCase() + todayName.slice(1)}
              </span>
            </div>

            {todaySplit.isRestDay ? (
              <p className="rest-day-text">Rest day — recover well.</p>
            ) : (
              <div className="today-workout-card-body">
                <ul className="muscle-group-list">
                  {muscleGroupList(todaySplit).length > 0 ? (
                    muscleGroupList(todaySplit).map((mg, i) => (
                      <li key={i}>{mg}</li>
                    ))
                  ) : (
                    <li>Targeted Workout</li>
                  )}
                </ul>
                <Button
                  variant="secondary"
                  text="View Exercises"
                  className="view-exercise-btn"
                  onClick={() => navigate('/client/plan', { state: { openSplitId: todaySplit.id } })}
                />
              </div>
            )}
          </div>
        )}

        {!planError && !todaySplit && (
          <p className="empty-state">Nothing scheduled for today.</p>
        )}
      </section>

      {!planError && todaySplit && !todaySplit.isRestDay && (
        loggedToday ? (
          <p className="workout-done-note">You've already logged today's workout. Nice work — see you tomorrow.</p>
        ) : (
          <Button
            variant="primary"
            text="Start Workout"
            className="start-workout-btn"
            onClick={() => navigate(`/client/log/${todaySplit.id}`)}
          />
        )
      )}

    </div>
  );
}

export default ClientHome;