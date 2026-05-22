import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGameStore } from '../store/gameStore';

const CATEGORIES = ['planning', 'networking', 'learning', 'execution', 'marketing', 'finance', 'other'] as const;
const CAT_COLORS: Record<string, string> = {
  planning: 'var(--blue)', networking: 'var(--purple)', learning: 'var(--gold)',
  execution: 'var(--green)', marketing: 'var(--orange)', finance: 'var(--cyan)', other: 'var(--text-3)',
};

export default function Business() {
  const { business, addBusinessTask, streaks, settings, checkAndUnlockAchievements } = useGameStore();
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'execution' as typeof CATEGORIES[number],
    title: '',
    description: '',
    duration: '',
    impact: 'medium' as 'low' | 'medium' | 'high',
    notes: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addBusinessTask({
      date: form.date,
      category: form.category,
      title: form.title,
      description: form.description,
      duration: parseInt(form.duration) || 30,
      impact: form.impact,
      notes: form.notes,
    });
    setForm(f => ({ ...f, title: '', description: '', duration: '', notes: '' }));
    checkAndUnlockAchievements();
  }

  const totalTasks = business.tasks.length;
  const thisWeekTasks = business.tasks.filter(t => t.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd')).length;
  const highImpactTasks = business.tasks.filter(t => t.impact === 'high').length;

  // Last 14 days
  const dailyData = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    return { date: format(subDays(new Date(), 13 - i), 'MMM d'), tasks: business.tasks.filter(t => t.date === d).length };
  }), [business.tasks]);

  // Category breakdown
  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    business.tasks.forEach(t => { map[t.category] = (map[t.category] ?? 0) + 1; });
    return Object.entries(map).map(([cat, count]) => ({ cat, count })).sort((a, b) => b.count - a.count);
  }, [business.tasks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Tasks', value: totalTasks, icon: '💼', accent: 'var(--orange)' },
          { label: 'This Week', value: thisWeekTasks, icon: '📅', accent: 'var(--gold)', sub: `/ ${settings.businessWeeklyTarget} target` },
          { label: 'High Impact', value: highImpactTasks, icon: '🚀', accent: 'var(--green)' },
          { label: 'Streak', value: streaks.business, icon: '🔥', accent: 'var(--orange)', sub: 'days' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub || 'all time'}</div>
          </div>
        ))}
      </div>

      {/* Weekly goal */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🎯 Weekly Goal</div>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{thisWeekTasks} / {settings.businessWeeklyTarget} tasks</span>
        </div>
        <div className="progress-bar" style={{ height: 12 }}>
          <div className="progress-fill" style={{
            width: `${Math.min((thisWeekTasks / settings.businessWeeklyTarget) * 100, 100)}%`,
            background: thisWeekTasks >= settings.businessWeeklyTarget ? 'var(--green)' : 'linear-gradient(90deg, var(--orange), var(--gold))',
          }} />
        </div>
      </div>

      {/* Log form */}
      <div className="card">
        <div className="card-header"><div className="card-title">+ Log Business Task</div></div>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}>
                {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Task Title</label>
            <input type="text" className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="What did you work on?" />
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Duration (min)</label>
              <input type="number" className="form-input" placeholder="60" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Impact</label>
              <select className="form-select" value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value as any }))}>
                <option value="low">Low (+25 XP)</option>
                <option value="medium">Medium (+45 XP)</option>
                <option value="high">High (+65 XP)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Outcomes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What was achieved? Next steps?" />
          </div>
          <button type="submit" className="btn btn-primary btn-full">Log Task 💼</button>
        </form>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Daily Tasks — 14 Days</div></div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
              <Bar dataKey="tasks" fill="var(--orange)" radius={[4,4,0,0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">🏷️ By Category</div></div>
          {catData.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">💼</div><div className="empty-state-title">No data yet</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catData.map(({ cat, count }) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-2)' }}>{cat}</span>
                    <span style={{ fontWeight: 700, color: CAT_COLORS[cat] }}>{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(count / totalTasks) * 100}%`, background: CAT_COLORS[cat] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Task History</div></div>
        {business.tasks.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">💼</div><div className="empty-state-title">No tasks logged yet</div></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Task</th><th>Impact</th><th>XP</th></tr></thead>
            <tbody>
              {business.tasks.slice().reverse().slice(0, 20).map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td><span className="tag tag-business" style={{ background: `${CAT_COLORS[t.category]}18`, color: CAT_COLORS[t.category], border: `1px solid ${CAT_COLORS[t.category]}33` }}>{t.category}</span></td>
                  <td style={{ maxWidth: 200, fontWeight: 500, color: 'var(--text-1)' }}>{t.title}</td>
                  <td><span style={{ color: t.impact === 'high' ? 'var(--green)' : t.impact === 'medium' ? 'var(--gold)' : 'var(--text-3)', fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>{t.impact}</span></td>
                  <td><span style={{ color: 'var(--xp)', fontWeight: 600 }}>+{t.xpGained}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
