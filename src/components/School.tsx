import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useGameStore } from '../store/gameStore';
import { getWeeklyStudyBySubject } from '../utils/analytics';

const SUBJECTS = ['Maths', 'English', 'Science', 'History', 'Geography', 'French', 'Business Studies', 'ICT', 'PE', 'Other'];
const COLORS = ['var(--blue)', 'var(--gold)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--cyan)', 'var(--red)', '#ff69b4', '#7fff00', 'var(--text-3)'];

export default function School() {
  const { school, addStudySession, streaks, settings, checkAndUnlockAchievements } = useGameStore();
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    subject: 'Maths',
    duration: '',
    type: 'revision' as any,
    grade: '',
    notes: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addStudySession({
      date: form.date,
      subject: form.subject,
      duration: parseInt(form.duration) || 60,
      type: form.type,
      grade: form.grade || undefined,
      notes: form.notes,
    });
    setForm(f => ({ ...f, duration: '', grade: '', notes: '' }));
    checkAndUnlockAchievements();
  }

  const totalHours = (school.sessions.reduce((t, s) => t + s.duration, 0) / 60).toFixed(1);
  const thisWeekHours = (school.sessions.filter(s => s.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd')).reduce((t, s) => t + s.duration, 0) / 60).toFixed(1);
  const todayMinutes = school.sessions.filter(s => s.date === format(new Date(), 'yyyy-MM-dd')).reduce((t, s) => t + s.duration, 0);

  // Last 14 days study time
  const dailyData = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    const sessions = school.sessions.filter(s => s.date === d);
    return { date: format(subDays(new Date(), 13 - i), 'MMM d'), hours: parseFloat((sessions.reduce((t, s) => t + s.duration, 0) / 60).toFixed(1)) };
  }), [school.sessions]);

  // Subject breakdown
  const subjectData = useMemo(() => {
    const map: Record<string, number> = {};
    school.sessions.forEach(s => { map[s.subject] = (map[s.subject] ?? 0) + s.duration / 60; });
    return Object.entries(map).map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) })).sort((a, b) => b.hours - a.hours);
  }, [school.sessions]);

  const weeklySubjectData = useMemo(() => getWeeklyStudyBySubject(school.sessions), [school.sessions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Hours', value: `${totalHours}h`, icon: '📚', accent: 'var(--blue)' },
          { label: 'This Week', value: `${thisWeekHours}h`, icon: '📅', accent: 'var(--gold)', sub: `/ ${settings.studyDailyTarget * 7}h target` },
          { label: 'Today', value: `${todayMinutes}m`, icon: '📝', accent: 'var(--green)', sub: `/ ${settings.studyDailyTarget * 60}m target` },
          { label: 'Streak', value: streaks.school, icon: '🔥', accent: 'var(--orange)', sub: 'days' },
          { label: 'Sessions', value: school.sessions.length, icon: '🗓️', accent: 'var(--purple)', sub: 'total' },
          { label: 'Subjects', value: new Set(school.sessions.map(s => s.subject)).size, icon: '🎓', accent: 'var(--cyan)', sub: 'different' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub || 'total'}</div>
          </div>
        ))}
      </div>

      {/* Daily target progress */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📚 Daily Study Goal</div>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{todayMinutes}m / {settings.studyDailyTarget * 60}m</span>
        </div>
        <div className="progress-bar" style={{ height: 12 }}>
          <div className="progress-fill" style={{
            width: `${Math.min((todayMinutes / (settings.studyDailyTarget * 60)) * 100, 100)}%`,
            background: todayMinutes >= settings.studyDailyTarget * 60 ? 'var(--green)' : 'linear-gradient(90deg, var(--blue), var(--purple))',
          }} />
        </div>
      </div>

      {/* Log form */}
      <div className="card">
        <div className="card-header"><div className="card-title">+ Log Study Session</div></div>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-select" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (min)</label>
              <input type="number" className="form-input" placeholder="60" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Session Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="revision">Revision</option>
                <option value="homework">Homework</option>
                <option value="project">Project</option>
                <option value="exam prep">Exam Prep</option>
                <option value="reading">Reading</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grade / Test Score (optional)</label>
              <input type="text" className="form-input" placeholder="A, 85%, etc." value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Topics covered..." />
          </div>
          <button type="submit" className="btn btn-primary btn-full">Log Session 📚</button>
        </form>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Daily Study Hours — 14 Days</div></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
              <Bar dataKey="hours" fill="var(--blue)" radius={[4,4,0,0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🎓 By Subject (All Time)</div></div>
          {subjectData.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No data yet</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {subjectData.slice(0, 6).map(({ name, hours }, i) => (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-2)' }}>{name}</span>
                    <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{hours}h</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(hours / parseFloat(totalHours)) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Recent Sessions</div></div>
        {school.sessions.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No sessions logged yet</div></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Subject</th><th>Type</th><th>Duration</th><th>Grade</th><th>XP</th></tr></thead>
            <tbody>
              {school.sessions.slice().reverse().slice(0, 20).map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td><span className="tag tag-school">{s.subject}</span></td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--text-3)', fontSize: 12 }}>{s.type}</td>
                  <td>{s.duration}m</td>
                  <td>{s.grade ? <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{s.grade}</span> : '—'}</td>
                  <td><span style={{ color: 'var(--xp)', fontWeight: 600 }}>+{s.xpGained}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
