import { useMemo } from 'react';
import { format, subDays, startOfWeek } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useGameStore } from '../store/gameStore';
import { getXPProgress, RANK_ICONS, getRankColor } from '../utils/xpSystem';
import { getConsistencyScore, getDisciplineScore, getAcademyReadinessScore } from '../utils/analytics';

function ScoreRing({ value, label, color, size = 120 }: { value: number; label: string; color: string; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (value / 100);
  return (
    <div className="score-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={8} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div className="score-ring-label">
        <div className="score-ring-value">{value}</div>
        <div className="score-ring-sub">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const store = useGameStore();
  const { profile, streaks, soccer, fitness, sleep, school, reading, business, discipline, weeklySnapshots, settings } = store;
  const progress = getXPProgress(profile);
  const rankColor = getRankColor(profile.rank);

  const today = format(new Date(), 'yyyy-MM-dd');
  const last7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const stats = useMemo(() => ({
    soccerSessions7: soccer.sessions.filter(s => s.date >= last7).length,
    workouts7: fitness.workouts.filter(w => w.date >= last7).length,
    sleepAvg7: (() => {
      const e = sleep.entries.filter(s => s.date >= last7);
      return e.length ? (e.reduce((t, s) => t + s.duration, 0) / e.length).toFixed(1) : '—';
    })(),
    studyHours7: (school.sessions.filter(s => s.date >= last7).reduce((t, s) => t + s.duration, 0) / 60).toFixed(1),
    pagesRead7: reading.entries.filter(r => r.date >= last7).reduce((t, r) => t + r.pagesRead, 0),
    businessTasks7: business.tasks.filter(b => b.date >= last7).length,
  }), [soccer, fitness, sleep, school, reading, business, last7]);

  const consistencyScore = useMemo(() => {
    const allEntries = [
      ...soccer.sessions, ...fitness.workouts, ...sleep.entries,
      ...school.sessions, ...reading.entries, ...business.tasks,
    ];
    return getConsistencyScore(allEntries);
  }, [soccer, fitness, sleep, school, reading, business]);

  const disciplineScore = useMemo(() =>
    getDisciplineScore(discipline.entries, discipline.goals),
    [discipline]
  );

  const academyScore = useMemo(() =>
    getAcademyReadinessScore({
      soccerSessions: soccer.sessions,
      weakFootSessions: soccer.weakFoot,
      speedTests: soccer.speedTests,
      sleepEntries: sleep.entries,
      disciplineScore,
      soccerWeeklyTarget: settings.soccerWeeklyTarget,
    }),
    [soccer, sleep, disciplineScore, settings]
  );

  // Weekly XP chart — last 8 weeks
  const weeklyXPData = useMemo(() => {
    const data: { week: string; xp: number; current?: boolean }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = format(startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const snap = weeklySnapshots.find(s => s.weekStart === weekStart);
      const isCurrentWeek = i === 0;
      data.push({
        week: format(subDays(new Date(), i * 7), 'MMM d'),
        xp: snap?.xpGained ?? (isCurrentWeek ? calcCurrentWeekXP() : 0),
        current: isCurrentWeek,
      });
    }
    return data;
  }, [weeklySnapshots]);

  function calcCurrentWeekXP() {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    return [
      ...soccer.sessions.filter(s => s.date >= weekStart).map(s => s.xpGained),
      ...fitness.workouts.filter(w => w.date >= weekStart).map(w => w.xpGained),
      ...sleep.entries.filter(s => s.date >= weekStart).map(s => s.xpGained),
      ...school.sessions.filter(s => s.date >= weekStart).map(s => s.xpGained),
      ...reading.entries.filter(r => r.date >= weekStart).map(r => r.xpGained),
      ...business.tasks.filter(b => b.date >= weekStart).map(b => b.xpGained),
    ].reduce((a, b) => a + b, 0);
  }

  // Radar data for category balance
  const radarData = [
    { subject: 'Soccer', score: Math.min((stats.soccerSessions7 / settings.soccerWeeklyTarget) * 100, 100) },
    { subject: 'Fitness', score: Math.min((stats.workouts7 / settings.fitnessWeeklyTarget) * 100, 100) },
    { subject: 'Sleep', score: sleep.entries.filter(s => s.date >= last7 && s.duration >= 7).length * (100/7) },
    { subject: 'School', score: Math.min((parseFloat(stats.studyHours7) / (settings.studyDailyTarget * 7)) * 100, 100) },
    { subject: 'Reading', score: Math.min((stats.pagesRead7 / (settings.readingDailyTarget * 7)) * 100, 100) },
    { subject: 'Business', score: Math.min((stats.businessTasks7 / settings.businessWeeklyTarget) * 100, 100) },
    { subject: 'Discipline', score: disciplineScore },
  ];

  // Today's discipline status
  const todayDiscipline = discipline.goals.filter(g => g.active).map(goal => ({
    goal,
    achieved: discipline.entries.some(e => e.date === today && e.goalId === goal.id && e.achieved),
  }));

  // Leaderboard: current week vs past weeks
  const currentWeekXP = calcCurrentWeekXP();
  const sortedSnapshots = [...weeklySnapshots]
    .sort((a, b) => b.xpGained - a.xpGained)
    .slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero: Profile card + XP */}
      <div className="card card-glow-gold" style={{ background: 'linear-gradient(135deg, var(--bg-2) 0%, rgba(244,197,66,0.04) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div className="level-badge level-badge-lg" style={{ animation: 'levelPulse 3s ease-in-out infinite' }}>
            {profile.level}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900 }}>{profile.name}</span>
              <span className="rank-badge" style={{ background: `${rankColor}22`, color: rankColor, border: `1px solid ${rankColor}44` }}>
                {RANK_ICONS[profile.rank]} {profile.rank}
              </span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="xp-bar-container">
                <div className="xp-bar-labels">
                  <span style={{ color: 'var(--xp)', fontWeight: 600 }}>Level {profile.level}</span>
                  <span>{profile.xp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()} XP</span>
                </div>
                <div className="xp-bar-track">
                  <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Total XP: <span style={{ color: 'var(--xp)', fontWeight: 700 }}>{profile.totalXP.toLocaleString()}</span>
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Joined: <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{profile.joinDate}</span>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <ScoreRing value={consistencyScore} label="Consistency" color="var(--blue)" />
            <ScoreRing value={disciplineScore} label="Discipline" color="var(--gold)" />
            <ScoreRing value={academyScore} label="Academy" color="var(--green)" />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-grid">
        {[
          { label: 'Soccer Sessions', value: stats.soccerSessions7, sub: 'this week', icon: '⚽', accent: 'var(--green)', streak: streaks.soccer },
          { label: 'Workouts', value: stats.workouts7, sub: 'this week', icon: '💪', accent: 'var(--red)', streak: streaks.fitness },
          { label: 'Sleep Avg', value: `${stats.sleepAvg7}h`, sub: 'this week', icon: '🌙', accent: 'var(--purple)', streak: streaks.sleep },
          { label: 'Study Hours', value: `${stats.studyHours7}h`, sub: 'this week', icon: '📚', accent: 'var(--blue)', streak: streaks.school },
          { label: 'Pages Read', value: stats.pagesRead7, sub: 'this week', icon: '📖', accent: 'var(--gold)', streak: streaks.reading },
          { label: 'Business Tasks', value: stats.businessTasks7, sub: 'this week', icon: '💼', accent: 'var(--orange)', streak: streaks.business },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub} {s.streak > 0 && <span style={{ color: 'var(--orange)' }}>🔥{s.streak}</span>}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Weekly XP — Personal Leaderboard</div>
            <span style={{ fontSize: 12, color: 'var(--xp)', fontWeight: 600 }}>This week: {currentWeekXP} XP</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyXPData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--xp)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--xp)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border-bright)', borderRadius: 8, color: 'var(--text-1)' }} />
              <Area type="monotone" dataKey="xp" stroke="var(--xp)" strokeWidth={2} fill="url(#xpGrad)" dot={{ fill: 'var(--xp)', strokeWidth: 0, r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">🎯 Weekly Balance</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 10 }} />
              <Radar name="Score" dataKey="score" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard + Discipline Today */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Personal Leaderboard */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏆 Personal Leaderboard</div>
            <span className="tag tag-weekly">Best Weeks</span>
          </div>
          {sortedSnapshots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-title">No data yet</div>
              <div className="empty-state-desc">Start logging to build your history</div>
            </div>
          ) : (
            sortedSnapshots.map((snap, i) => (
              <div key={snap.weekStart} className="leaderboard-row">
                <div className={`leaderboard-rank ${i < 3 ? 'top' : ''}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                </div>
                <div className="leaderboard-week">Week of {snap.weekStart}</div>
                <div className="leaderboard-xp">⚡ {snap.xpGained} XP</div>
              </div>
            ))
          )}
          <div className="leaderboard-row" style={{ background: 'rgba(168,85,247,0.06)', borderRadius: 8, border: '1px solid rgba(168,85,247,0.2)', marginTop: 8 }}>
            <div className="leaderboard-rank" style={{ color: 'var(--xp)' }}>NOW</div>
            <div className="leaderboard-week">This week</div>
            <div className="leaderboard-xp">⚡ {currentWeekXP} XP</div>
          </div>
        </div>

        {/* Today's Discipline */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🎯 Today's Discipline</div>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {todayDiscipline.filter(d => d.achieved).length}/{todayDiscipline.length} done
            </span>
          </div>
          {todayDiscipline.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-desc">Set up discipline goals in the Discipline tab</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayDiscipline.map(({ goal, achieved }) => (
                <div key={goal.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: achieved ? 'rgba(0,230,118,0.08)' : 'var(--bg-3)',
                  border: `1px solid ${achieved ? 'rgba(0,230,118,0.2)' : 'var(--border)'}`,
                }}>
                  <span style={{ fontSize: 18 }}>{goal.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: achieved ? 'var(--green)' : 'var(--text-2)', textDecoration: achieved ? 'line-through' : 'none' }}>
                    {goal.title}
                  </span>
                  <span style={{ fontSize: 16 }}>{achieved ? '✅' : '⭕'}</span>
                </div>
              ))}
            </div>
          )}
          {/* Progress bar */}
          {todayDiscipline.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${(todayDiscipline.filter(d => d.achieved).length / todayDiscipline.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--green), var(--cyan))',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streak overview */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔥 Active Streaks</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Soccer', key: 'soccer', icon: '⚽', color: 'var(--green)' },
            { label: 'Fitness', key: 'fitness', icon: '💪', color: 'var(--red)' },
            { label: 'Sleep', key: 'sleep', icon: '🌙', color: 'var(--purple)' },
            { label: 'School', key: 'school', icon: '📚', color: 'var(--blue)' },
            { label: 'Reading', key: 'reading', icon: '📖', color: 'var(--gold)' },
            { label: 'Business', key: 'business', icon: '💼', color: 'var(--orange)' },
            { label: 'Discipline', key: 'discipline', icon: '🎯', color: 'var(--cyan)' },
          ].map(s => {
            const count = streaks[s.key as keyof typeof streaks];
            const val = typeof count === 'number' ? count : 0;
            return (
              <div key={s.key} style={{
                flex: '1 1 100px',
                background: val > 0 ? `rgba(${s.color === 'var(--green)' ? '0,230,118' : s.color === 'var(--red)' ? '255,71,87' : s.color === 'var(--purple)' ? '168,85,247' : s.color === 'var(--blue)' ? '0,163,255' : s.color === 'var(--gold)' ? '244,197,66' : s.color === 'var(--orange)' ? '255,107,43' : '0,229,255'},0.08)` : 'var(--bg-3)',
                border: `1px solid ${val > 0 ? s.color + '33' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: val > 0 ? s.color : 'var(--text-3)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
                {val > 0 && <div style={{ fontSize: 10, color: 'var(--orange)' }}>🔥 days</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
