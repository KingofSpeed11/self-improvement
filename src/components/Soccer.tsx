import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useGameStore } from '../store/gameStore';
import { getAcademyReadinessScore, getDisciplineScore } from '../utils/analytics';

type Tab = 'log' | 'matches' | 'training' | 'speed' | 'weakfoot' | 'highlights';

export default function Soccer() {
  const store = useGameStore();
  const { soccer, sleep, discipline, settings, addSoccerSession, addWeakFootSession, addSpeedTest, addHighlight } = store;
  const [tab, setTab] = useState<Tab>('log');

  const [sessionForm, setSessionForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'), type: 'training' as 'training' | 'match',
    duration: '', goals: '0', assists: '0', minutesPlayed: '0', rating: '3', notes: '',
  });

  const [weakForm, setWeakForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), duration: '', exercises: '', notes: '' });
  const [speedForm, setSpeedForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), distance: '30', time: '', notes: '' });
  const [highlightForm, setHighlightForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), title: '', platform: 'YouTube', link: '', views: '0', notes: '' });

  const disciplineScore = getDisciplineScore(discipline.entries, discipline.goals);
  const academyScore = useMemo(() => getAcademyReadinessScore({
    soccerSessions: soccer.sessions, weakFootSessions: soccer.weakFoot,
    speedTests: soccer.speedTests, sleepEntries: sleep.entries,
    disciplineScore, soccerWeeklyTarget: settings.soccerWeeklyTarget,
  }), [soccer, sleep, disciplineScore, settings]);

  const totalGoals = soccer.sessions.reduce((t, s) => t + s.goals, 0);
  const totalAssists = soccer.sessions.reduce((t, s) => t + s.assists, 0);
  const totalTrainingHours = (soccer.sessions.filter(s => s.type === 'training').reduce((t, s) => t + s.duration, 0) / 60).toFixed(1);
  const totalMatches = soccer.sessions.filter(s => s.type === 'match').length;

  function submitSession(e: React.FormEvent) {
    e.preventDefault();
    addSoccerSession({
      date: sessionForm.date,
      type: sessionForm.type,
      duration: parseInt(sessionForm.duration) || 60,
      goals: parseInt(sessionForm.goals) || 0,
      assists: parseInt(sessionForm.assists) || 0,
      minutesPlayed: parseInt(sessionForm.minutesPlayed) || parseInt(sessionForm.duration) || 0,
      rating: parseInt(sessionForm.rating) || 3,
      notes: sessionForm.notes,
    });
    setSessionForm(f => ({ ...f, duration: '', goals: '0', assists: '0', minutesPlayed: '0', notes: '' }));
    store.checkAndUnlockAchievements();
  }

  function submitWeakFoot(e: React.FormEvent) {
    e.preventDefault();
    addWeakFootSession({ date: weakForm.date, duration: parseInt(weakForm.duration) || 30, exercises: weakForm.exercises, notes: weakForm.notes });
    setWeakForm(f => ({ ...f, duration: '', exercises: '', notes: '' }));
  }

  function submitSpeed(e: React.FormEvent) {
    e.preventDefault();
    const distance = parseFloat(speedForm.distance);
    const time = parseFloat(speedForm.time);
    const speedKmh = parseFloat(((distance / time) * 3.6).toFixed(2));
    addSpeedTest({ date: speedForm.date, distance, time, speed: speedKmh });
    setSpeedForm(f => ({ ...f, time: '' }));
  }

  function submitHighlight(e: React.FormEvent) {
    e.preventDefault();
    addHighlight({ ...highlightForm, views: parseInt(highlightForm.views) || 0 });
    setHighlightForm(f => ({ ...f, title: '', link: '', notes: '' }));
  }

  // Speed trend data
  const speedData = soccer.speedTests.slice(-10).map(t => ({
    date: t.date, speed: t.speed,
  }));

  // Goals per match trend
  const matchData = soccer.sessions.filter(s => s.type === 'match').slice(-10).map(m => ({
    date: m.date, goals: m.goals, assists: m.assists, rating: m.rating,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats header */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {[
          { label: 'Academy Score', value: academyScore, icon: '🏟️', accent: 'var(--green)', sub: '/100' },
          { label: 'Total Goals', value: totalGoals, icon: '⚽', accent: 'var(--gold)', sub: 'all time' },
          { label: 'Total Assists', value: totalAssists, icon: '🎯', accent: 'var(--blue)', sub: 'all time' },
          { label: 'Training Hrs', value: totalTrainingHours, icon: '⏱️', accent: 'var(--orange)', sub: 'hours total' },
          { label: 'Matches', value: totalMatches, icon: '🏆', accent: 'var(--red)', sub: 'played' },
          { label: 'Weak Foot', value: soccer.weakFoot.length, icon: '🦶', accent: 'var(--cyan)', sub: 'sessions' },
          { label: 'Speed Tests', value: soccer.speedTests.length, icon: '⚡', accent: 'var(--purple)', sub: 'recorded' },
          { label: 'Highlights', value: soccer.highlights.length, icon: '🎬', accent: 'var(--pink)', sub: 'videos' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Academy Score Ring */}
      <div className="card card-glow-green" style={{ background: 'linear-gradient(135deg, var(--bg-2), rgba(0,230,118,0.03))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={70} cy={70} r={58} fill="none" stroke="var(--bg-3)" strokeWidth={10} />
              <circle cx={70} cy={70} r={58} fill="none" stroke="var(--green)" strokeWidth={10}
                strokeDasharray={`${2*Math.PI*58*(academyScore/100)} ${2*Math.PI*58}`}
                strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 8px var(--green))', transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div style={{ position: 'absolute', marginTop: -90, marginLeft: 40, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'var(--green)' }}>{academyScore}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Academy</div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--green)' }}>
              🏟️ Academy Readiness Score
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Training Consistency', pct: Math.min((soccer.sessions.filter(s => s.date >= format(subDays(new Date(),30),'yyyy-MM-dd')).length / (settings.soccerWeeklyTarget * 4.3)) * 100, 100), color: 'var(--green)' },
                { label: 'Technical Skills', pct: totalMatches === 0 ? 50 : Math.min(((totalGoals + totalAssists) / totalMatches) * 25, 100), color: 'var(--gold)' },
                { label: 'Physical Development', pct: Math.min((soccer.weakFoot.length / 50) * 100, 100), color: 'var(--blue)' },
                { label: 'Mental Toughness', pct: disciplineScore, color: 'var(--orange)' },
              ].map(p => (
                <div key={p.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{Math.round(p.pct)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {(['log', 'matches', 'training', 'speed', 'weakfoot', 'highlights'] as Tab[]).map(t => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'log' ? '+ Log' : t === 'matches' ? '🏟️ Matches' : t === 'training' ? '⚽ Training' : t === 'speed' ? '⚡ Speed' : t === 'weakfoot' ? '🦶 Weak Foot' : '🎬 Highlights'}
          </button>
        ))}
      </div>

      {/* Log tab */}
      {tab === 'log' && (
        <div className="card">
          <div className="card-header"><div className="card-title">⚽ Log Soccer Session</div></div>
          <form onSubmit={submitSession} className="form-grid">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Session Type</label>
                <select className="form-select" value={sessionForm.type} onChange={e => setSessionForm(f => ({ ...f, type: e.target.value as any }))}>
                  <option value="training">Training</option>
                  <option value="match">Match</option>
                </select>
              </div>
            </div>
            <div className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Duration (min)</label>
                <input type="number" className="form-input" placeholder="90" value={sessionForm.duration} onChange={e => setSessionForm(f => ({ ...f, duration: e.target.value }))} required />
              </div>
              {sessionForm.type === 'match' && <>
                <div className="form-group">
                  <label className="form-label">Goals</label>
                  <input type="number" className="form-input" value={sessionForm.goals} onChange={e => setSessionForm(f => ({ ...f, goals: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assists</label>
                  <input type="number" className="form-input" value={sessionForm.assists} onChange={e => setSessionForm(f => ({ ...f, assists: e.target.value }))} />
                </div>
              </>}
              {sessionForm.type === 'match' && (
                <div className="form-group">
                  <label className="form-label">Minutes Played</label>
                  <input type="number" className="form-input" value={sessionForm.minutesPlayed} onChange={e => setSessionForm(f => ({ ...f, minutesPlayed: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Rating (1-5)</label>
                <select className="form-select" value={sessionForm.rating} onChange={e => setSessionForm(f => ({ ...f, rating: e.target.value }))}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {'⭐'.repeat(n)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} placeholder="What did you work on?" />
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              Log Session ⚡
            </button>
          </form>
        </div>
      )}

      {/* Matches tab */}
      {tab === 'matches' && (
        <div className="card">
          <div className="card-header"><div className="card-title">🏟️ Match History</div></div>
          {matchData.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={matchData}>
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
                  <Bar dataKey="goals" fill="var(--gold)" radius={[4,4,0,0]} name="Goals" />
                  <Bar dataKey="assists" fill="var(--blue)" radius={[4,4,0,0]} name="Assists" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {soccer.sessions.filter(s => s.type === 'match').length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🏟️</div><div className="empty-state-title">No matches logged yet</div></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Duration</th><th>Goals</th><th>Assists</th><th>Mins</th><th>Rating</th></tr></thead>
              <tbody>
                {soccer.sessions.filter(s => s.type === 'match').slice().reverse().map(s => (
                  <tr key={s.id}>
                    <td>{s.date}</td><td>{s.duration}m</td>
                    <td><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{s.goals}</span></td>
                    <td><span style={{ color: 'var(--blue)', fontWeight: 700 }}>{s.assists}</span></td>
                    <td>{s.minutesPlayed}'</td>
                    <td>{'⭐'.repeat(s.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Training tab */}
      {tab === 'training' && (
        <div className="card">
          <div className="card-header"><div className="card-title">⚽ Training Log</div></div>
          {soccer.sessions.filter(s => s.type === 'training').length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">⚽</div><div className="empty-state-title">No training sessions yet</div></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Duration</th><th>Rating</th><th>Notes</th></tr></thead>
              <tbody>
                {soccer.sessions.filter(s => s.type === 'training').slice().reverse().map(s => (
                  <tr key={s.id}>
                    <td>{s.date}</td><td>{s.duration}m</td>
                    <td>{'⭐'.repeat(s.rating)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Speed tab */}
      {tab === 'speed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">⚡ Log Speed Test</div></div>
            <form onSubmit={submitSpeed} className="form-grid form-grid-3">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={speedForm.date} onChange={e => setSpeedForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Distance (m)</label>
                <select className="form-select" value={speedForm.distance} onChange={e => setSpeedForm(f => ({ ...f, distance: e.target.value }))}>
                  <option value="10">10m</option><option value="20">20m</option>
                  <option value="30">30m</option><option value="40">40m</option><option value="100">100m</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Time (seconds)</label>
                <input type="number" step="0.01" className="form-input" placeholder="4.20" value={speedForm.time} onChange={e => setSpeedForm(f => ({ ...f, time: e.target.value }))} required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary btn-full">Record Speed Test ⚡</button>
              </div>
            </form>
          </div>
          {speedData.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">⚡ Speed History</div></div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={speedData}>
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto','auto']} unit=" km/h" />
                  <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} formatter={(v: number) => [`${v} km/h`, 'Speed']} />
                  <Line type="monotone" dataKey="speed" stroke="var(--orange)" strokeWidth={2} dot={{ fill: 'var(--orange)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <table className="data-table" style={{ marginTop: 12 }}>
                <thead><tr><th>Date</th><th>Distance</th><th>Time</th><th>Speed</th></tr></thead>
                <tbody>
                  {soccer.speedTests.slice().reverse().map(t => (
                    <tr key={t.id}>
                      <td>{t.date}</td><td>{t.distance}m</td><td>{t.time}s</td>
                      <td><span style={{ color: 'var(--orange)', fontWeight: 700 }}>{t.speed} km/h</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Weak Foot tab */}
      {tab === 'weakfoot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">🦶 Weak Foot Training</div></div>
            <form onSubmit={submitWeakFoot} className="form-grid">
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={weakForm.date} onChange={e => setWeakForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (min)</label>
                  <input type="number" className="form-input" placeholder="20" value={weakForm.duration} onChange={e => setWeakForm(f => ({ ...f, duration: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Exercises</label>
                <input type="text" className="form-input" placeholder="Wall passes, shots on goal, crosses..." value={weakForm.exercises} onChange={e => setWeakForm(f => ({ ...f, exercises: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={weakForm.notes} onChange={e => setWeakForm(f => ({ ...f, notes: e.target.value }))} placeholder="Progress notes..." />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Log Session 🦶</button>
            </form>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">🦶 Weak Foot Progress</div>
              <span style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{soccer.weakFoot.length}</span>
                <span style={{ color: 'var(--text-3)' }}> / 50 sessions</span>
              </span>
            </div>
            <div className="progress-bar" style={{ height: 10, marginBottom: 16 }}>
              <div className="progress-fill" style={{ width: `${Math.min((soccer.weakFoot.length / 50) * 100, 100)}%`, background: 'var(--cyan)' }} />
            </div>
            {soccer.weakFoot.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🦶</div><div className="empty-state-title">No sessions yet</div></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Duration</th><th>Exercises</th></tr></thead>
                <tbody>
                  {soccer.weakFoot.slice().reverse().map(s => (
                    <tr key={s.id}><td>{s.date}</td><td>{s.duration}m</td><td style={{ maxWidth: 200 }}>{s.exercises || '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Highlights tab */}
      {tab === 'highlights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">🎬 Add Highlight Video</div></div>
            <form onSubmit={submitHighlight} className="form-grid">
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={highlightForm.date} onChange={e => setHighlightForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Platform</label>
                  <select className="form-select" value={highlightForm.platform} onChange={e => setHighlightForm(f => ({ ...f, platform: e.target.value }))}>
                    <option>YouTube</option><option>Instagram</option><option>TikTok</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="form-input" placeholder="My Match Highlights vs Team A" value={highlightForm.title} onChange={e => setHighlightForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Link</label>
                <input type="text" className="form-input" placeholder="https://..." value={highlightForm.link} onChange={e => setHighlightForm(f => ({ ...f, link: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Views</label>
                <input type="number" className="form-input" value={highlightForm.views} onChange={e => setHighlightForm(f => ({ ...f, views: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Add Highlight 🎬</button>
            </form>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">🎬 Highlights</div><span style={{ color: 'var(--text-3)', fontSize: 13 }}>{soccer.highlights.length} videos</span></div>
            {soccer.highlights.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🎬</div><div className="empty-state-title">No highlights yet</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {soccer.highlights.slice().reverse().map(h => (
                  <div key={h.id} style={{ padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{h.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{h.platform} · {h.date} · 👁️ {h.views} views</div>
                      </div>
                      {h.link && <a href={h.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open ↗</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
