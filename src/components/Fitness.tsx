import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGameStore } from '../store/gameStore';

const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Stretching', 'Football Specific', 'Sprint Training', 'Plyometrics', 'Other'];

export default function Fitness() {
  const { fitness, addWorkout, checkAndUnlockAchievements, streaks, settings } = useGameStore();
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Strength',
    duration: '',
    exercises: '',
    calories: '',
    notes: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addWorkout({
      date: form.date,
      type: form.type,
      duration: parseInt(form.duration) || 45,
      exercises: form.exercises,
      calories: parseInt(form.calories) || 0,
      notes: form.notes,
    });
    setForm(f => ({ ...f, duration: '', exercises: '', calories: '', notes: '' }));
    checkAndUnlockAchievements();
  }

  const totalWorkouts = fitness.workouts.length;
  const totalMinutes = fitness.workouts.reduce((t, w) => t + w.duration, 0);
  const thisWeek = fitness.workouts.filter(w => w.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd')).length;

  // Last 14 days chart
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
      const workouts = fitness.workouts.filter(w => w.date === d);
      return {
        date: format(subDays(new Date(), 13 - i), 'MMM d'),
        minutes: workouts.reduce((t, w) => t + w.duration, 0),
        count: workouts.length,
      };
    });
  }, [fitness.workouts]);

  // Workout type distribution
  const typeCount = useMemo(() => {
    const map: Record<string, number> = {};
    fitness.workouts.forEach(w => { map[w.type] = (map[w.type] ?? 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [fitness.workouts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Workouts', value: totalWorkouts, icon: '💪', accent: 'var(--red)' },
          { label: 'This Week', value: thisWeek, icon: '🗓️', accent: 'var(--orange)', sub: `/ ${settings.fitnessWeeklyTarget} target` },
          { label: 'Total Hours', value: (totalMinutes / 60).toFixed(1), icon: '⏱️', accent: 'var(--blue)', sub: 'hours trained' },
          { label: 'Streak', value: streaks.fitness, icon: '🔥', accent: 'var(--orange)', sub: 'days' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub || 'all time'}</div>
          </div>
        ))}
      </div>

      {/* Weekly progress bar */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">💪 Weekly Goal</div>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{thisWeek} / {settings.fitnessWeeklyTarget} workouts</span>
        </div>
        <div className="progress-bar" style={{ height: 14 }}>
          <div className="progress-fill" style={{
            width: `${Math.min((thisWeek / settings.fitnessWeeklyTarget) * 100, 100)}%`,
            background: thisWeek >= settings.fitnessWeeklyTarget ? 'var(--green)' : 'linear-gradient(90deg, var(--red), var(--orange))',
          }} />
        </div>
      </div>

      {/* Log form */}
      <div className="card">
        <div className="card-header"><div className="card-title">+ Log Workout</div></div>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {WORKOUT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (min)</label>
              <input type="number" className="form-input" placeholder="45" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Exercises</label>
              <input type="text" className="form-input" placeholder="Squats, Bench, Deadlift..." value={form.exercises} onChange={e => setForm(f => ({ ...f, exercises: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Calories Burned</label>
              <input type="number" className="form-input" placeholder="300" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="How did it go?" />
          </div>
          <button type="submit" className="btn btn-primary btn-full">Log Workout 💪</button>
        </form>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Last 14 Days</div></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="m" />
              <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
              <Bar dataKey="minutes" fill="var(--red)" radius={[4,4,0,0]} name="Minutes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🏷️ By Type</div></div>
          {typeCount.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">💪</div><div className="empty-state-title">No workouts yet</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {typeCount.slice(0, 6).map(({ type, count }) => (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-2)' }}>{type}</span>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(count / totalWorkouts) * 100}%`, background: 'var(--red)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Workout History</div></div>
        {fitness.workouts.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">💪</div><div className="empty-state-title">No workouts logged yet</div></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>Exercises</th><th>XP</th></tr></thead>
            <tbody>
              {fitness.workouts.slice().reverse().slice(0, 20).map(w => (
                <tr key={w.id}>
                  <td>{w.date}</td>
                  <td><span className="tag" style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--red)', border: '1px solid rgba(255,71,87,0.2)' }}>{w.type}</span></td>
                  <td>{w.duration}m</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.exercises || '—'}</td>
                  <td><span style={{ color: 'var(--xp)', fontWeight: 600 }}>+{w.xpGained}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
