import { useState, useMemo } from 'react';
import { format, subDays, differenceInMinutes, parse } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useGameStore } from '../store/gameStore';
import { getSleepTrend } from '../utils/analytics';

export default function Sleep() {
  const { sleep, addSleepEntry, settings, streaks, checkAndUnlockAchievements } = useGameStore();
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    bedTime: '23:00',
    wakeTime: '07:00',
    quality: '4' as '1'|'2'|'3'|'4'|'5',
    notes: '',
  });

  function calcDuration(bed: string, wake: string): number {
    try {
      const bedDate = parse(bed, 'HH:mm', new Date());
      let wakeDate = parse(wake, 'HH:mm', new Date());
      if (wakeDate <= bedDate) wakeDate = new Date(wakeDate.getTime() + 86400000);
      return parseFloat((differenceInMinutes(wakeDate, bedDate) / 60).toFixed(2));
    } catch { return 0; }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const duration = calcDuration(form.bedTime, form.wakeTime);
    addSleepEntry({
      date: form.date,
      bedTime: form.bedTime,
      wakeTime: form.wakeTime,
      duration,
      quality: parseInt(form.quality) as 1|2|3|4|5,
      notes: form.notes,
    });
    setForm(f => ({ ...f, notes: '' }));
    checkAndUnlockAchievements();
  }

  const last7 = sleep.entries.filter(s => s.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const avgSleep7 = last7.length ? (last7.reduce((t, s) => t + s.duration, 0) / last7.length).toFixed(1) : '—';
  const avgQuality7 = last7.length ? (last7.reduce((t, s) => t + s.quality, 0) / last7.length).toFixed(1) : '—';
  const goodNights7 = last7.filter(s => s.duration >= settings.sleepTarget - 0.5).length;

  const trendData = useMemo(() => getSleepTrend(sleep.entries, 14), [sleep.entries]);

  const previewDuration = calcDuration(form.bedTime, form.wakeTime);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Avg Sleep', value: `${avgSleep7}h`, icon: '😴', accent: 'var(--purple)', sub: 'last 7 days' },
          { label: 'Avg Quality', value: avgQuality7, icon: '⭐', accent: 'var(--gold)', sub: '/ 5 stars' },
          { label: 'Good Nights', value: goodNights7, icon: '✅', accent: 'var(--green)', sub: 'this week' },
          { label: 'Streak', value: streaks.sleep, icon: '🔥', accent: 'var(--orange)', sub: 'days logged' },
          { label: 'Target', value: `${settings.sleepTarget}h`, icon: '🎯', accent: 'var(--blue)', sub: 'per night' },
          { label: 'Total Logged', value: sleep.entries.length, icon: '📊', accent: 'var(--text-3)', sub: 'nights' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Log form */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🌙 Log Sleep</div>
          {previewDuration > 0 && (
            <span style={{ fontSize: 14, fontWeight: 700, color: previewDuration >= settings.sleepTarget ? 'var(--green)' : 'var(--orange)' }}>
              {previewDuration.toFixed(1)}h
            </span>
          )}
        </div>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid form-grid-3">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Bed Time</label>
              <input type="time" className="form-input" value={form.bedTime} onChange={e => setForm(f => ({ ...f, bedTime: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Wake Time</label>
              <input type="time" className="form-input" value={form.wakeTime} onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))} />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Sleep Quality</label>
              <select className="form-select" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value as any }))}>
                <option value="1">1 ⭐ — Very Poor</option>
                <option value="2">2 ⭐ — Poor</option>
                <option value="3">3 ⭐ — Average</option>
                <option value="4">4 ⭐ — Good</option>
                <option value="5">5 ⭐ — Excellent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input type="text" className="form-input" placeholder="Woke up during the night..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full">Log Sleep 🌙</button>
        </form>
      </div>

      {/* Sleep Trend Chart */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📊 Sleep Trend — Last 14 Nights</div>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Target: {settings.sleepTarget}h</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 12]} tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
            <ReferenceLine y={settings.sleepTarget} stroke="var(--gold)" strokeDasharray="4 4" strokeWidth={1.5} />
            <ReferenceLine y={7} stroke="var(--orange)" strokeDasharray="3 3" strokeWidth={1} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }}
              formatter={(v: any) => v ? [`${v}h`, 'Sleep'] : ['No data', 'Sleep']}
            />
            <Line type="monotone" dataKey="hours" stroke="var(--purple)" strokeWidth={2} dot={({ cx, cy, payload }) => (
              payload.hours ? <circle cx={cx} cy={cy} r={4} fill={payload.hours >= settings.sleepTarget ? 'var(--green)' : payload.hours >= 6 ? 'var(--orange)' : 'var(--red)'} stroke="none" /> : <g />
            )} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} /> ≥{settings.sleepTarget}h target met</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)', display: 'inline-block' }} /> 6-{settings.sleepTarget}h</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} /> under 6h</span>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Sleep History</div></div>
        {sleep.entries.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🌙</div><div className="empty-state-title">No sleep logged yet</div></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Date</th><th>Bed</th><th>Wake</th><th>Duration</th><th>Quality</th><th>XP</th></tr></thead>
            <tbody>
              {sleep.entries.slice().reverse().slice(0, 20).map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td><td>{s.bedTime}</td><td>{s.wakeTime}</td>
                  <td>
                    <span style={{ color: s.duration >= settings.sleepTarget ? 'var(--green)' : s.duration >= 6 ? 'var(--orange)' : 'var(--red)', fontWeight: 600 }}>
                      {s.duration.toFixed(1)}h
                    </span>
                  </td>
                  <td>{'⭐'.repeat(s.quality)}</td>
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
