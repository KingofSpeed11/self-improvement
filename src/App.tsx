import { useEffect, useMemo, useState } from 'react';
import { format, subDays, startOfWeek, differenceInMinutes, parse as parseTime } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, LineChart, Line, Legend,
} from 'recharts';

import { useGameStore } from './store/gameStore';
import { getXPProgress, RANK_ICONS, getRankColor } from './utils/xpSystem';
import {
  getConsistencyScore, getDisciplineScore, getAcademyReadinessScore,
  detectBottlenecks, getRecommendations, getSleepTrend,
} from './utils/analytics';
import { RARITY_COLORS, RARITY_GLOW } from './utils/achievementSystem';
import type { Quest, AchievementRarity } from './types';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import QuickLog from './components/QuickLog';
import LevelUpOverlay from './components/LevelUpOverlay';

// ─── Sub-components ────────────────────────────────────────
function ScoreRing({ value, label, color, size = 100 }: { value: number; label: string; color: string; size?: number }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="score-ring-card">
      <div className="ring-wrap">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-4)" strokeWidth={8} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${circ * Math.min(value, 100) / 100} ${circ}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="ring-label">
          <div className="ring-value" style={{ color }}>{value}</div>
          <div className="ring-sub">/ 100</div>
        </div>
      </div>
      <div className="ring-title">{label}</div>
    </div>
  );
}

function SectionHeader({
  id, icon, title, sub, streak, color = 'var(--gold)',
}: { id: string; icon: string; title: string; sub?: string; streak?: number; color?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-badge">
        <span className="section-badge-icon">{icon}</span>
        <span style={{ color }}>{title}</span>
        {streak != null && streak > 0 && (
          <span className="section-badge-streak">🔥 {streak} day streak</span>
        )}
      </div>
      <div className="section-title">{title}</div>
      {sub && <div className="section-sub">{sub}</div>}
    </div>
  );
}

function CollapsibleForm({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div className="collapsible-trigger" onClick={() => setOpen(!open)}>
        <span>+ {label}</span>
        <span className={`collapsible-arrow ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────
export default function App() {
  const store = useGameStore();
  const {
    profile, streaks, soccer, fitness, sleep, school,
    reading, business, discipline, quests, achievements,
    skillNodes, weeklySnapshots, settings,
    refreshQuests, saveWeeklySnapshot, checkAndUnlockAchievements,
    addSoccerSession, addWorkout, addSleepEntry, addStudySession,
    addReadingEntry, addBook, updateBook,
    addBusinessTask, addDisciplineGoal, removeDisciplineGoal,
    resetDisciplineGoals, toggleDisciplineGoal, logDisciplineEntry,
    logRoutineBlock, routine,
    deen, logSalah, logQuranPages, logDhikr, logFast,
    addWeakFootSession, addSpeedTest,
  } = store;

  useEffect(() => { refreshQuests(); saveWeeklySnapshot(); }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const last7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const xpPct = getXPProgress(profile);
  const rankColor = getRankColor(profile.rank);

  const consistencyScore = useMemo(() => getConsistencyScore([
    ...soccer.sessions, ...fitness.workouts, ...sleep.entries,
    ...school.sessions, ...reading.entries, ...business.tasks,
  ]), [soccer, fitness, sleep, school, reading, business]);

  const disciplineScore = useMemo(() =>
    getDisciplineScore(discipline.entries, discipline.goals), [discipline]);

  const academyScore = useMemo(() => getAcademyReadinessScore({
    soccerSessions: soccer.sessions, weakFootSessions: soccer.weakFoot,
    speedTests: soccer.speedTests, sleepEntries: sleep.entries,
    disciplineScore, soccerWeeklyTarget: settings.soccerWeeklyTarget,
  }), [soccer, sleep, disciplineScore, settings]);

  const bottlenecks = useMemo(() => detectBottlenecks({
    soccerSessions: soccer.sessions, workouts: fitness.workouts,
    sleepEntries: sleep.entries, studySessions: school.sessions,
    readingEntries: reading.entries, businessTasks: business.tasks,
    disciplineEntries: discipline.entries,
  }), [soccer, fitness, sleep, school, reading, business, discipline]);

  const recommendations = useMemo(() => getRecommendations(bottlenecks, disciplineScore), [bottlenecks, disciplineScore]);

  // Weekly XP history
  const weeklyXP = useMemo(() => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const currentXP = [
      ...soccer.sessions, ...fitness.workouts, ...sleep.entries,
      ...school.sessions, ...reading.entries, ...business.tasks,
    ].filter((e: any) => e.date >= weekStart).reduce((t: number, e: any) => t + (e.xpGained || 0), 0);

    return [...weeklySnapshots.slice(-7).map(s => ({
      week: format(new Date(s.weekStart), 'MMM d'),
      xp: s.xpGained, current: false,
    })), { week: 'This Week', xp: currentXP, current: true }];
  }, [weeklySnapshots, soccer, fitness, sleep, school, reading, business]);

  // Radar
  const radarData = [
    { subject: 'Soccer',    A: Math.min((soccer.sessions.filter(s => s.date >= last7).length / settings.soccerWeeklyTarget) * 100, 100) },
    { subject: 'Fitness',   A: Math.min((fitness.workouts.filter(w => w.date >= last7).length / settings.fitnessWeeklyTarget) * 100, 100) },
    { subject: 'Sleep',     A: sleep.entries.filter(s => s.date >= last7 && s.duration >= settings.sleepTarget - 0.5).length * (100 / 7) },
    { subject: 'School',    A: Math.min((school.sessions.filter(s => s.date >= last7).reduce((t, s) => t + s.duration, 0) / 60 / (settings.studyDailyTarget * 7)) * 100, 100) },
    { subject: 'Reading',   A: Math.min((reading.entries.filter(r => r.date >= last7).reduce((t, r) => t + r.pagesRead, 0) / (settings.readingDailyTarget * 7)) * 100, 100) },
    { subject: 'Business',  A: Math.min((business.tasks.filter(b => b.date >= last7).length / settings.businessWeeklyTarget) * 100, 100) },
    { subject: 'Discipline',A: disciplineScore },
  ];

  // Activity heatmap (84 days = 12 weeks)
  const allEntries = useMemo(() => [
    ...soccer.sessions, ...fitness.workouts, ...sleep.entries,
    ...school.sessions, ...reading.entries, ...business.tasks,
  ], [soccer, fitness, sleep, school, reading, business]);

  const heatmapData = useMemo(() => {
    return Array.from({ length: 84 }, (_, i) => {
      const d = format(subDays(new Date(), 83 - i), 'yyyy-MM-dd');
      const count = allEntries.filter((e: any) => e.date === d).length;
      return { date: d, count };
    });
  }, [allEntries]);

  const heatmapRows = useMemo(() => {
    const rows: typeof heatmapData[] = [];
    for (let i = 0; i < 12; i++) rows.push(heatmapData.slice(i * 7, i * 7 + 7));
    return rows;
  }, [heatmapData]);

  // Discipline today
  const activeGoals = discipline.goals.filter(g => g.active);
  const todayDisc = discipline.entries.filter(e => e.date === today);
  const discDoneToday = activeGoals.filter(g => todayDisc.find(e => e.goalId === g.id && e.achieved)).length;

  // Active quests
  const activeQuests = useMemo(() =>
    quests.filter(q => !((new Date()) > new Date(q.expiresAt))).slice(0, 8),
    [quests]
  );

  // Sorted leaderboard
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const currentWeekXP = weeklyXP[weeklyXP.length - 1]?.xp ?? 0;
  const sortedSnapshots = [...weeklySnapshots].sort((a, b) => b.xpGained - a.xpGained).slice(0, 7);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrap">
        <Header />
        <main className="one-page-main">

          {/* ═══════════════════════════════════════════════
              COMMAND CENTER
          ═══════════════════════════════════════════════ */}
          <section id="command-center" className="page-section">
            {/* Hero Card */}
            <div className="hero-card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div className="hero-level-badge">{profile.level}</div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div className="hero-name">{profile.name}</div>
                    <span className="rank-pill" style={{ background: `${rankColor}22`, color: rankColor, border: `1px solid ${rankColor}44` }}>
                      {RANK_ICONS[profile.rank]} {profile.rank}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
                      <span style={{ color: 'var(--xp)', fontWeight: 700 }}>Level {profile.level}</span>
                      <span>{profile.xp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()} XP</span>
                    </div>
                    <div className="hero-xp-bar-track">
                      <div className="hero-xp-bar-fill" style={{ width: `${xpPct}%` }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-3)' }}>
                    <span>Total XP: <strong style={{ color: 'var(--xp)' }}>{profile.totalXP.toLocaleString()}</strong></span>
                    <span>Member since: <strong style={{ color: 'var(--text-2)' }}>{profile.joinDate}</strong></span>
                    <span>Achievements: <strong style={{ color: 'var(--gold)' }}>{achievements.filter(a => a.unlocked).length}/{achievements.length}</strong></span>
                  </div>
                </div>

                {/* Score Rings */}
                <div className="score-rings-row">
                  <ScoreRing value={consistencyScore} label="CONSISTENCY" color="var(--blue)" />
                  <ScoreRing value={disciplineScore} label="DISCIPLINE" color="var(--gold)" />
                  <ScoreRing value={academyScore} label="ACADEMY" color="var(--green)" />
                </div>
              </div>
            </div>

            {/* Weekly stats */}
            <div className="stat-grid">
              {[
                { label: 'Soccer Sessions', val: soccer.sessions.filter(s => s.date >= last7).length, icon: '⚽', accent: 'var(--green)', streak: streaks.soccer, sub: 'this week' },
                { label: 'Workouts', val: fitness.workouts.filter(w => w.date >= last7).length, icon: '💪', accent: 'var(--red)', streak: streaks.fitness, sub: 'this week' },
                { label: 'Avg Sleep', val: (() => { const e = sleep.entries.filter(s => s.date >= last7); return e.length ? (e.reduce((t, s) => t + s.duration, 0) / e.length).toFixed(1) + 'h' : '—'; })(), icon: '🌙', accent: 'var(--purple)', streak: streaks.sleep, sub: 'this week' },
                { label: 'Study Hours', val: (school.sessions.filter(s => s.date >= last7).reduce((t, s) => t + s.duration, 0) / 60).toFixed(1) + 'h', icon: '📚', accent: 'var(--blue)', streak: streaks.school, sub: 'this week' },
                { label: 'Pages Read', val: reading.entries.filter(r => r.date >= last7).reduce((t, r) => t + r.pagesRead, 0), icon: '📖', accent: 'var(--gold)', streak: streaks.reading, sub: 'this week' },
                { label: 'Business Tasks', val: business.tasks.filter(b => b.date >= last7).length, icon: '💼', accent: 'var(--orange)', streak: streaks.business, sub: 'this week' },
                { label: 'Discipline', val: discDoneToday + '/' + activeGoals.length, icon: '🎯', accent: 'var(--cyan)', streak: streaks.discipline, sub: 'goals today' },
                { label: 'Level', val: profile.level, icon: '⚡', accent: 'var(--xp)', streak: 0, sub: profile.rank },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
                  <div className="stat-card-icon">{s.icon}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.val}</div>
                  <div className="stat-card-sub">
                    {s.sub}
                    {s.streak > 0 && <span style={{ color: 'var(--orange)', marginLeft: 6 }}>🔥{s.streak}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
              <div className="card card-gold">
                <div className="card-header">
                  <div className="card-title">⚡ Weekly XP — Personal Leaderboard</div>
                  <span style={{ fontSize: 12, color: 'var(--xp)', fontWeight: 700 }}>This week: {currentWeekXP} XP</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={weeklyXP} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--xp)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--xp)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border-bright)', borderRadius: 8, color: 'var(--text-1)' }} />
                    <Area type="monotone" dataKey="xp" stroke="var(--xp)" strokeWidth={2} fill="url(#xpGrad)"
                      dot={(p: any) => p.payload.current
                        ? <circle cx={p.cx} cy={p.cy} r={5} fill="var(--gold)" stroke="none" />
                        : <circle cx={p.cx} cy={p.cy} r={3} fill="var(--xp)" stroke="none" />}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">🎯 Weekly Balance</div></div>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 9 }} />
                    <Radar name="Score" dataKey="A" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.12} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <div className="card-title">📅 Activity Heatmap — Last 12 Weeks</div>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {allEntries.filter((e: any) => e.date >= format(subDays(new Date(), 84), 'yyyy-MM-dd')).length} total entries
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                {heatmapRows.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {week.map((day, di) => {
                      const lvl = day.count === 0 ? '' : day.count === 1 ? 'heatmap-l1' : day.count === 2 ? 'heatmap-l2' : day.count === 3 ? 'heatmap-l3' : 'heatmap-l4';
                      return (
                        <div key={di} className={`heatmap-cell ${lvl}`} title={`${day.date}: ${day.count} entries`} />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: 'var(--text-3)' }}>
                <span>Less</span>
                {['', 'heatmap-l1', 'heatmap-l2', 'heatmap-l3', 'heatmap-l4'].map((c, i) => (
                  <div key={i} className={`heatmap-cell ${c}`} style={{ width: 12, height: 12 }} />
                ))}
                <span>More</span>
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              TODAY'S MISSION
          ═══════════════════════════════════════════════ */}
          <section id="today" className="page-section">
            <SectionHeader id="today" icon="🎯" title="Today's Mission" sub="Quests, discipline goals, and today's progress" color="var(--gold)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Active quests */}
              <div className="card card-purple">
                <div className="card-header">
                  <div className="card-title">📋 Active Quests</div>
                  <span style={{ fontSize: 12, color: 'var(--xp)' }}>
                    {activeQuests.filter(q => q.completed).length}/{activeQuests.length} done
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                  {activeQuests.length === 0 ? (
                    <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No quests — reload to generate</div></div>
                  ) : activeQuests.map(q => (
                    <div key={q.id} className={`quest-card ${q.completed ? 'completed' : ''}`}
                      style={{ borderLeft: `3px solid ${q.type === 'daily' ? 'var(--green)' : q.type === 'weekly' ? 'var(--blue)' : 'var(--gold)'}` }}>
                      <div className="quest-icon-wrap" style={{ background: 'var(--bg-4)' }}>{q.icon}</div>
                      <div className="quest-body">
                        <div className="quest-title">{q.title} {q.completed && '✅'}</div>
                        <div className="quest-desc">{q.description}</div>
                        <div className="quest-progress-row">
                          <div className="progress-bar" style={{ flex: 1, height: 5 }}>
                            <div className="progress-fill" style={{ width: `${Math.min((q.current / q.target) * 100, 100)}%`, background: q.completed ? 'var(--green)' : 'var(--xp)' }} />
                          </div>
                          <span className="quest-progress-text">{q.current}/{q.target}</span>
                          <span className={`tag tag-${q.type}`}>{q.type}</span>
                        </div>
                      </div>
                      <div className="quest-xp">⚡{q.xpReward}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discipline today */}
              <div className="card card-gold">
                <div className="card-header">
                  <div className="card-title">🎯 Discipline Checklist</div>
                  <span style={{ fontSize: 13, color: discDoneToday === activeGoals.length && activeGoals.length > 0 ? 'var(--green)' : 'var(--text-3)' }}>
                    {discDoneToday}/{activeGoals.length} {discDoneToday === activeGoals.length && activeGoals.length > 0 ? '🎉' : ''}
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 8, marginBottom: 14 }}>
                  <div className="progress-fill" style={{
                    width: `${activeGoals.length > 0 ? (discDoneToday / activeGoals.length) * 100 : 0}%`,
                    background: discDoneToday === activeGoals.length && activeGoals.length > 0 ? 'var(--green)' : 'linear-gradient(90deg, var(--cyan), var(--purple))',
                  }} />
                </div>
                {activeGoals.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-desc">Scroll to Discipline to set up goals</div></div>
                ) : (
                  <div className="discipline-grid">
                    {activeGoals.map(goal => {
                      const entry = todayDisc.find(e => e.goalId === goal.id);
                      const achieved = entry?.achieved ?? false;
                      const logged = !!entry;
                      return (
                        <div key={goal.id} className={`disc-goal-card ${achieved ? 'achieved' : ''}`}
                          onClick={() => !logged && logDisciplineEntry({ date: today, goalId: goal.id, achieved: true, notes: '' })}>
                          <span style={{ fontSize: 20 }}>{goal.icon}</span>
                          <span className="disc-goal-title" style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{goal.title}</span>
                          <span>{achieved ? '✅' : '⭕'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              DAILY ROUTINE
          ═══════════════════════════════════════════════ */}
          <section id="routine" className="page-section">
            <SectionHeader id="routine" icon="⏰" title="Daily Routine" sub="Summer schedule — 5 AM to 10:30 PM" color="var(--orange)" />
            <DailyRoutine log={routine.log} logBlock={logRoutineBlock} today={today} />
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              LEADERBOARD
          ═══════════════════════════════════════════════ */}
          <section id="leaderboard" className="page-section">
            <SectionHeader id="leaderboard" icon="🏆" title="Personal Leaderboard" sub="Your best weeks ranked by XP earned" color="var(--gold)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card card-gold">
                <div className="card-header"><div className="card-title">🏆 All-Time Best Weeks</div></div>
                {sortedSnapshots.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">No history yet — keep logging!</div></div>
                ) : (
                  sortedSnapshots.map((snap, i) => (
                    <div key={snap.weekStart} className="lb-row">
                      <div className={`lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>
                      <div className="lb-week">Week of {snap.weekStart}</div>
                      <div className="lb-xp">⚡ {snap.xpGained}</div>
                    </div>
                  ))
                )}
                <div className="lb-row" style={{ background: 'rgba(176,79,255,0.06)', borderRadius: 8, padding: '10px 12px', marginTop: 8, border: '1px solid rgba(176,79,255,0.2)' }}>
                  <div className="lb-rank" style={{ color: 'var(--xp)' }}>NOW</div>
                  <div className="lb-week">This week (in progress)</div>
                  <div className="lb-xp">⚡ {currentWeekXP}</div>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">🔥 Streak Overview</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Soccer', key: 'soccer', icon: '⚽', color: 'var(--green)' },
                    { label: 'Fitness', key: 'fitness', icon: '💪', color: 'var(--red)' },
                    { label: 'Sleep', key: 'sleep', icon: '🌙', color: 'var(--purple)' },
                    { label: 'School', key: 'school', icon: '📚', color: 'var(--blue)' },
                    { label: 'Reading', key: 'reading', icon: '📖', color: 'var(--gold)' },
                    { label: 'Business', key: 'business', icon: '💼', color: 'var(--orange)' },
                    { label: 'Discipline', key: 'discipline', icon: '🎯', color: 'var(--cyan)' },
                  ].map(s => {
                    const val = (streaks[s.key as keyof typeof streaks] as number) || 0;
                    return (
                      <div key={s.key} style={{
                        padding: '10px 12px', borderRadius: 10, textAlign: 'center',
                        background: val > 0 ? 'var(--bg-4)' : 'var(--bg-3)',
                        border: `1px solid ${val > 0 ? s.color + '33' : 'var(--border)'}`,
                      }}>
                        <div style={{ fontSize: 20, marginBottom: 3 }}>{s.icon}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: val > 0 ? s.color : 'var(--text-3)' }}>{val}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              SOCCER
          ═══════════════════════════════════════════════ */}
          <section id="soccer" className="page-section">
            <SectionHeader id="soccer" icon="⚽" title="Soccer" sub="Training, matches, speed, weak foot, highlights & Academy score" color="var(--green)" streak={streaks.soccer} />
            <div className="stat-grid" style={{ marginBottom: 20 }}>
              {[
                { label: 'Academy Score', val: academyScore + '/100', icon: '🏟️', accent: 'var(--green)' },
                { label: 'Total Goals', val: soccer.sessions.reduce((t, s) => t + s.goals, 0), icon: '⚽', accent: 'var(--gold)' },
                { label: 'Assists', val: soccer.sessions.reduce((t, s) => t + s.assists, 0), icon: '🎯', accent: 'var(--blue)' },
                { label: 'Training Hrs', val: (soccer.sessions.filter(s => s.type === 'training').reduce((t, s) => t + s.duration, 0) / 60).toFixed(1) + 'h', icon: '⏱️', accent: 'var(--orange)' },
                { label: 'Matches', val: soccer.sessions.filter(s => s.type === 'match').length, icon: '🏆', accent: 'var(--red)' },
                { label: 'Weak Foot Sessions', val: soccer.weakFoot.length, icon: '🦶', accent: 'var(--cyan)' },
                { label: 'Speed Tests', val: soccer.speedTests.length, icon: '⚡', accent: 'var(--purple)' },
                { label: 'Highlights', val: soccer.highlights.length, icon: '🎬', accent: 'var(--pink)' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
                  <div className="stat-card-icon">{s.icon}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.val}</div>
                </div>
              ))}
            </div>

            {/* Academy Score Bar */}
            <div className="card card-green" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">🏟️ Academy Readiness</div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{academyScore}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Training Consistency', pct: Math.min((soccer.sessions.filter(s => s.date >= format(subDays(new Date(), 30), 'yyyy-MM-dd')).length / (settings.soccerWeeklyTarget * 4.3)) * 100, 100), color: 'var(--green)' },
                  { label: 'Technical Skills', pct: soccer.sessions.filter(s => s.type === 'match').length === 0 ? 50 : Math.min(((soccer.sessions.reduce((t, s) => t + s.goals, 0) + soccer.sessions.reduce((t, s) => t + s.assists, 0)) / soccer.sessions.filter(s => s.type === 'match').length) * 25, 100), color: 'var(--gold)' },
                  { label: 'Physical Development', pct: Math.min((soccer.weakFoot.length / 50) * 100, 100), color: 'var(--blue)' },
                  { label: 'Mental Toughness', pct: disciplineScore, color: 'var(--orange)' },
                ].map(p => (
                  <div key={p.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-2)' }}>{p.label}</span>
                      <span style={{ color: p.color, fontWeight: 700 }}>{Math.round(p.pct)}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${p.pct}%`, background: p.color }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Log form */}
            <CollapsibleForm label="Log Soccer Session">
              <SoccerLogForm add={addSoccerSession} afterSubmit={checkAndUnlockAchievements} />
            </CollapsibleForm>

            {/* Speed & Weak Foot log */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <CollapsibleForm label="Log Weak Foot Session">
                <WeakFootForm add={addWeakFootSession} />
              </CollapsibleForm>
              <CollapsibleForm label="Log Speed Test">
                <SpeedTestForm add={addSpeedTest} />
              </CollapsibleForm>
            </div>

            {/* Recent history */}
            {soccer.sessions.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><div className="card-title">📋 Recent Sessions</div></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>G</th><th>A</th><th>Rating</th><th>XP</th></tr></thead>
                  <tbody>
                    {soccer.sessions.slice().reverse().slice(0, 8).map(s => (
                      <tr key={s.id}>
                        <td>{s.date}</td>
                        <td><span className={s.type === 'match' ? 'tag tag-school' : 'tag tag-soccer'}>{s.type}</span></td>
                        <td>{s.duration}m</td>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{s.goals}</td>
                        <td style={{ color: 'var(--blue)', fontWeight: 700 }}>{s.assists}</td>
                        <td>{'⭐'.repeat(s.rating)}</td>
                        <td style={{ color: 'var(--xp)', fontWeight: 600 }}>+{s.xpGained}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              FITNESS
          ═══════════════════════════════════════════════ */}
          <section id="fitness" className="page-section">
            <SectionHeader id="fitness" icon="💪" title="Fitness" sub="Workouts, consistency tracking and progress charts" color="var(--red)" streak={streaks.fitness} />
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Workouts', val: fitness.workouts.length, icon: '💪', accent: 'var(--red)' },
                { label: 'This Week', val: fitness.workouts.filter(w => w.date >= last7).length + '/' + settings.fitnessWeeklyTarget, icon: '🗓️', accent: 'var(--orange)' },
                { label: 'Total Hours', val: (fitness.workouts.reduce((t, w) => t + w.duration, 0) / 60).toFixed(1) + 'h', icon: '⏱️', accent: 'var(--blue)' },
                { label: 'Streak', val: streaks.fitness + ' days', icon: '🔥', accent: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
                  <div className="stat-card-icon">{s.icon}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="card">
                <div className="card-header"><div className="card-title">📊 Workout Minutes — 14 Days</div></div>
                <FitnessChart workouts={fitness.workouts} />
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">🎯 Weekly Goal</div></div>
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: 'var(--red)' }}>
                    {fitness.workouts.filter(w => w.date >= last7).length}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>of {settings.fitnessWeeklyTarget} workouts</div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${Math.min((fitness.workouts.filter(w => w.date >= last7).length / settings.fitnessWeeklyTarget) * 100, 100)}%`, background: 'linear-gradient(90deg, var(--red), var(--orange))' }} />
                  </div>
                </div>
              </div>
            </div>
            <CollapsibleForm label="Log Workout">
              <FitnessLogForm add={addWorkout} afterSubmit={checkAndUnlockAchievements} />
            </CollapsibleForm>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              SLEEP
          ═══════════════════════════════════════════════ */}
          <section id="sleep" className="page-section">
            <SectionHeader id="sleep" icon="🌙" title="Sleep" sub="Track duration, quality, and sleep trends" color="var(--purple)" streak={streaks.sleep} />
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              {[
                { label: 'Avg Sleep', val: (() => { const e = sleep.entries.filter(s => s.date >= last7); return e.length ? (e.reduce((t, s) => t + s.duration, 0) / e.length).toFixed(1) + 'h' : '—'; })(), icon: '😴', accent: 'var(--purple)' },
                { label: 'Good Nights', val: sleep.entries.filter(s => s.date >= last7 && s.duration >= settings.sleepTarget - 0.5).length + '/7', icon: '✅', accent: 'var(--green)' },
                { label: 'Target', val: settings.sleepTarget + 'h', icon: '🎯', accent: 'var(--blue)' },
                { label: 'Streak', val: streaks.sleep + ' days', icon: '🔥', accent: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
                  <div className="stat-card-icon">{s.icon}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.val}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">📊 Sleep Duration — 14 Nights</div>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Target: {settings.sleepTarget}h (gold line)</span>
              </div>
              <SleepChart entries={sleep.entries} target={settings.sleepTarget} />
            </div>
            <CollapsibleForm label="Log Sleep">
              <SleepLogForm add={addSleepEntry} afterSubmit={checkAndUnlockAchievements} />
            </CollapsibleForm>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              LEARNING (SUMMER)
          ═══════════════════════════════════════════════ */}
          <section id="school" className="page-section">
            <SectionHeader id="school" icon="☀️" title="Summer Learning" sub="Self-directed study, online courses & skill-building — no school, no excuses" color="var(--blue)" streak={streaks.school} />

            {/* Stats */}
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Hours', val: (school.sessions.reduce((t, s) => t + s.duration, 0) / 60).toFixed(1) + 'h', icon: '📚', accent: 'var(--blue)' },
                { label: 'This Week',   val: (school.sessions.filter(s => s.date >= last7).reduce((t, s) => t + s.duration, 0) / 60).toFixed(1) + 'h', icon: '📅', accent: 'var(--gold)' },
                { label: 'Today',       val: school.sessions.filter(s => s.date === today).reduce((t, s) => t + s.duration, 0) + 'm', icon: '📝', accent: 'var(--green)' },
                { label: 'Streak',      val: streaks.school + ' days', icon: '🔥', accent: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
                  <div className="stat-card-icon">{s.icon}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.val}</div>
                </div>
              ))}
            </div>

            {/* Summer focus areas */}
            <SummerFocusCard sessions={school.sessions} />

            <CollapsibleForm label="Log Study Session">
              <SchoolLogForm add={addStudySession} afterSubmit={checkAndUnlockAchievements} />
            </CollapsibleForm>

            {school.sessions.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><div className="card-title">📋 Recent Sessions</div></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Subject</th><th>Type</th><th>Duration</th><th>XP</th></tr></thead>
                  <tbody>
                    {school.sessions.slice().reverse().slice(0, 10).map(s => (
                      <tr key={s.id}>
                        <td>{s.date}</td>
                        <td><span className="tag tag-school">{s.subject}</span></td>
                        <td style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{s.type}</td>
                        <td>{s.duration}m</td>
                        <td style={{ color: 'var(--xp)', fontWeight: 600 }}>+{s.xpGained}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              READING
          ═══════════════════════════════════════════════ */}
          <section id="reading" className="page-section">
            <SectionHeader id="reading" icon="📖" title="Reading" sub="Books, pages tracked, and reading streaks" color="var(--gold)" streak={streaks.reading} />
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Pages', val: reading.entries.reduce((t, r) => t + r.pagesRead, 0).toLocaleString(), icon: '📄', accent: 'var(--gold)' },
                { label: 'Books Finished', val: reading.books.filter(b => b.status === 'completed').length, icon: '📗', accent: 'var(--green)' },
                { label: 'This Week', val: reading.entries.filter(r => r.date >= last7).reduce((t, r) => t + r.pagesRead, 0) + 'p', icon: '📅', accent: 'var(--blue)' },
                { label: 'Streak', val: streaks.reading + ' days', icon: '🔥', accent: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
                  <div className="stat-card-icon">{s.icon}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.val}</div>
                </div>
              ))}
            </div>
            {/* Current book */}
            {reading.books.find(b => b.status === 'reading') && (() => {
              const b = reading.books.find(b => b.status === 'reading')!;
              return (
                <div className="card card-gold" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <div className="card-title">📖 Currently Reading</div>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{Math.round((b.pagesRead / b.totalPages) * 100)}%</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>by {b.author}</div>
                  <div className="progress-bar" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${(b.pagesRead / b.totalPages) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--orange))' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: 'var(--text-3)' }}>
                    <span>{b.pagesRead} pages read</span><span>{b.totalPages} total</span>
                  </div>
                </div>
              );
            })()}
            <CollapsibleForm label="Log Reading Session">
              <ReadingLogForm add={addReadingEntry} addBook={addBook} books={reading.books} afterSubmit={checkAndUnlockAchievements} />
            </CollapsibleForm>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              BUSINESS
          ═══════════════════════════════════════════════ */}
          <section id="business" className="page-section">
            <SectionHeader id="business" icon="💼" title="Business" sub="Tasks, projects, and entrepreneurial momentum" color="var(--orange)" streak={streaks.business} />
            <div className="stat-grid" style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Tasks', val: business.tasks.length, icon: '💼', accent: 'var(--orange)' },
                { label: 'This Week', val: business.tasks.filter(t => t.date >= last7).length + '/' + settings.businessWeeklyTarget, icon: '📅', accent: 'var(--gold)' },
                { label: 'High Impact', val: business.tasks.filter(t => t.impact === 'high').length, icon: '🚀', accent: 'var(--green)' },
                { label: 'Streak', val: streaks.business + ' days', icon: '🔥', accent: 'var(--red)' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
                  <div className="stat-card-icon">{s.icon}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-value">{s.val}</div>
                </div>
              ))}
            </div>
            <CollapsibleForm label="Log Business Task">
              <BusinessLogForm add={addBusinessTask} afterSubmit={checkAndUnlockAchievements} />
            </CollapsibleForm>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              DISCIPLINE
          ═══════════════════════════════════════════════ */}
          <section id="discipline" className="page-section">
            <SectionHeader id="discipline" icon="🎯" title="Discipline" sub="Daily goals, habit tracking, and mental toughness" color="var(--cyan)" streak={streaks.discipline} />
            <DisciplineSection
              discipline={discipline}
              addGoal={addDisciplineGoal}
              removeGoal={removeDisciplineGoal}
              resetGoals={resetDisciplineGoals}
              toggleGoal={toggleDisciplineGoal}
              logEntry={logDisciplineEntry}
              today={today}
            />
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              DEEN
          ═══════════════════════════════════════════════ */}
          <section id="deen" className="page-section">
            <SectionHeader id="deen" icon="🕌" title="Deen" sub="Salah, Quran, Adhkar, and Fasting — the foundation" color="var(--gold)" streak={streaks.deen} />
            <DeenSection deen={deen} today={today} logSalah={logSalah} logQuranPages={logQuranPages} logDhikr={logDhikr} logFast={logFast} />
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              ANALYTICS
          ═══════════════════════════════════════════════ */}
          <section id="analytics" className="page-section">
            <SectionHeader id="analytics" icon="📊" title="Analytics" sub="Deep insights, bottleneck detection, and performance trends" color="var(--blue)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ borderColor: bottlenecks.length > 0 ? 'rgba(255,71,87,0.25)' : 'rgba(0,230,118,0.25)' }}>
                <div className="card-header">
                  <div className="card-title">⚠️ Bottlenecks</div>
                  {bottlenecks.length === 0 && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>✅ All clear!</span>}
                </div>
                {bottlenecks.length === 0
                  ? <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>No bottlenecks this week. Keep it up!</div>
                  : bottlenecks.map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '9px 12px', background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: 8, marginBottom: 7, fontSize: 13, color: 'var(--text-2)' }}>
                      <span>⚠️</span><span>{b}</span>
                    </div>
                  ))
                }
              </div>
              <div className="card" style={{ borderColor: 'rgba(0,170,255,0.2)' }}>
                <div className="card-header"><div className="card-title">💡 Recommendations</div></div>
                {recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '9px 12px', background: 'rgba(0,170,255,0.06)', border: '1px solid rgba(0,170,255,0.15)', borderRadius: 8, marginBottom: 7, fontSize: 13, color: 'var(--text-2)' }}>
                    <span>💡</span><span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card">
                <div className="card-header"><div className="card-title">📊 Category Balance This Week</div></div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{ top: 0, right: 24, bottom: 0, left: 24 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 10 }} />
                    <Radar name="Score" dataKey="A" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">🌙 Sleep Trend</div></div>
                <SleepChart entries={sleep.entries} target={settings.sleepTarget} height={220} />
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              ACHIEVEMENTS
          ═══════════════════════════════════════════════ */}
          <section id="achievements" className="page-section">
            <SectionHeader id="achievements" icon="🏅" title="Achievements" sub={`${achievements.filter(a => a.unlocked).length} / ${achievements.length} unlocked`} color="var(--gold)" />
            <div className="achievement-grid">
              {achievements
                .sort((a, b) => {
                  if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
                  const order: AchievementRarity[] = ['legendary', 'epic', 'rare', 'common'];
                  return order.indexOf(a.rarity) - order.indexOf(b.rarity);
                })
                .map(a => (
                  <div key={a.id} className={`achievement-card ${a.unlocked ? 'unlocked' : 'locked'}`}
                    style={{ boxShadow: a.unlocked ? `0 0 16px ${RARITY_GLOW[a.rarity]}` : 'none', borderColor: a.unlocked ? RARITY_COLORS[a.rarity] + '44' : 'var(--border)' }}>
                    <div className={`achievement-icon-wrap rarity-${a.rarity}`}>
                      <span>{a.icon}</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span className="achievement-title">{a.title}</span>
                        <span className="rarity-tag" style={{ background: RARITY_COLORS[a.rarity] + '18', color: RARITY_COLORS[a.rarity] }}>{a.rarity}</span>
                      </div>
                      <div className="achievement-desc">{a.description}</div>
                      <div className="achievement-xp">⚡ +{a.xpReward} XP{a.unlockedDate ? ` · ${a.unlockedDate}` : ''}</div>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              SKILL TREE
          ═══════════════════════════════════════════════ */}
          <section id="skills" className="page-section">
            <SectionHeader id="skills" icon="🌳" title="Skill Tree" sub="Unlock and level up skills by logging activity" color="var(--green)" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {(['soccer', 'fitness', 'school'] as const).map(cat => {
                const nodes = skillNodes.filter(n => n.category === cat);
                const colors: Record<string, string> = { soccer: 'var(--green)', fitness: 'var(--red)', school: 'var(--blue)' };
                const labels: Record<string, string> = { soccer: '⚽ Soccer Tree', fitness: '💪 Fitness Tree', school: '🧠 Mental Tree' };
                return (
                  <div key={cat} className="card" style={{ borderColor: colors[cat] + '33' }}>
                    <div className="card-header"><div className="card-title" style={{ color: colors[cat] }}>{labels[cat]}</div></div>
                    {nodes.map(node => (
                      <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 22 }}>{node.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{node.name}</div>
                          <div className="progress-bar" style={{ height: 5 }}>
                            <div className="progress-fill" style={{ width: `${(node.currentLevel / node.maxLevel) * 100}%`, background: colors[cat] }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: colors[cat] }}>
                          {node.currentLevel}/{node.maxLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="section-divider" />

          {/* ═══════════════════════════════════════════════
              SETTINGS
          ═══════════════════════════════════════════════ */}
          <section id="settings" className="page-section">
            <SectionHeader id="settings" icon="⚙️" title="Settings" sub="Targets, profile, and data management" color="var(--text-2)" />
            <SettingsForm />
          </section>

          {/* Bottom padding */}
          <div style={{ height: 60 }} />
        </main>
      </div>

      <QuickLog />
      <LevelUpOverlay />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INLINE FORM COMPONENTS
// ═══════════════════════════════════════════════════════

function SoccerLogForm({ add, afterSubmit }: { add: any; afterSubmit: any }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), type: 'training', duration: '', goals: '0', assists: '0', rating: '3', notes: '' });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    add({ ...form, duration: parseInt(form.duration) || 60, goals: parseInt(form.goals) || 0, assists: parseInt(form.assists) || 0, minutesPlayed: parseInt(form.duration) || 60, rating: parseInt(form.rating) || 3 });
    setForm((f: any) => ({ ...f, duration: '', goals: '0', assists: '0', notes: '' }));
    afterSubmit();
  }
  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid form-grid-3">
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}><option value="training">Training</option><option value="match">Match</option></select></div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" className="form-input" placeholder="90" value={form.duration} onChange={e => setForm((f: any) => ({ ...f, duration: e.target.value }))} required /></div>
      </div>
      {form.type === 'match' && (
        <div className="form-grid form-grid-3">
          <div className="form-group"><label className="form-label">Goals</label><input type="number" className="form-input" value={form.goals} onChange={e => setForm((f: any) => ({ ...f, goals: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Assists</label><input type="number" className="form-input" value={form.assists} onChange={e => setForm((f: any) => ({ ...f, assists: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Rating</label><select className="form-select" value={form.rating} onChange={e => setForm((f: any) => ({ ...f, rating: e.target.value }))}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}</select></div>
        </div>
      )}
      <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="What did you work on?" /></div>
      <button type="submit" className="btn btn-primary btn-full">Log Session ⚡</button>
    </form>
  );
}

function WeakFootForm({ add }: { add: any }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), duration: '', exercises: '', notes: '' });
  function submit(e: React.FormEvent) { e.preventDefault(); add({ ...form, duration: parseInt(form.duration) || 20 }); setForm((f: any) => ({ ...f, duration: '', exercises: '', notes: '' })); }
  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" className="form-input" placeholder="20" value={form.duration} onChange={e => setForm((f: any) => ({ ...f, duration: e.target.value }))} required /></div>
      </div>
      <div className="form-group"><label className="form-label">Exercises</label><input type="text" className="form-input" value={form.exercises} onChange={e => setForm((f: any) => ({ ...f, exercises: e.target.value }))} placeholder="Wall passes, shots, crosses..." /></div>
      <button type="submit" className="btn btn-secondary btn-full">Log Weak Foot 🦶</button>
    </form>
  );
}

function SpeedTestForm({ add }: { add: any }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), distance: '30', time: '' });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const d = parseFloat(form.distance), t = parseFloat(form.time);
    add({ date: form.date, distance: d, time: t, speed: parseFloat(((d / t) * 3.6).toFixed(2)) });
    setForm((f: any) => ({ ...f, time: '' }));
  }
  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid form-grid-3">
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Distance</label><select className="form-select" value={form.distance} onChange={e => setForm((f: any) => ({ ...f, distance: e.target.value }))}><option value="10">10m</option><option value="20">20m</option><option value="30">30m</option><option value="40">40m</option><option value="100">100m</option></select></div>
        <div className="form-group"><label className="form-label">Time (seconds)</label><input type="number" step="0.01" className="form-input" placeholder="4.20" value={form.time} onChange={e => setForm((f: any) => ({ ...f, time: e.target.value }))} required /></div>
      </div>
      <button type="submit" className="btn btn-secondary btn-full">Record Speed ⚡</button>
    </form>
  );
}

function FitnessLogForm({ add, afterSubmit }: { add: any; afterSubmit: any }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), type: 'Strength', duration: '', exercises: '', calories: '', notes: '' });
  function submit(e: React.FormEvent) { e.preventDefault(); add({ ...form, duration: parseInt(form.duration) || 45, calories: parseInt(form.calories) || 0 }); setForm((f: any) => ({ ...f, duration: '', exercises: '', calories: '', notes: '' })); afterSubmit(); }
  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid form-grid-3">
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>{['Strength','Cardio','HIIT','Sprint Training','Plyometrics','Football Specific','Yoga','Other'].map(t => <option key={t}>{t}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" className="form-input" placeholder="45" value={form.duration} onChange={e => setForm((f: any) => ({ ...f, duration: e.target.value }))} required /></div>
      </div>
      <div className="form-group"><label className="form-label">Exercises</label><input type="text" className="form-input" value={form.exercises} onChange={e => setForm((f: any) => ({ ...f, exercises: e.target.value }))} placeholder="Squats, bench, sprints..." /></div>
      <button type="submit" className="btn btn-primary btn-full">Log Workout 💪</button>
    </form>
  );
}

function SleepLogForm({ add, afterSubmit }: { add: any; afterSubmit: any }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), bedTime: '23:00', wakeTime: '07:00', quality: '4', notes: '' });
  function getDuration() {
    try { const b = parseTime(form.bedTime, 'HH:mm', new Date()); let w = parseTime(form.wakeTime, 'HH:mm', new Date()); if (w <= b) w = new Date(w.getTime() + 86400000); return parseFloat((differenceInMinutes(w, b) / 60).toFixed(2)); } catch { return 8; }
  }
  function submit(e: React.FormEvent) { e.preventDefault(); add({ ...form, duration: getDuration(), quality: parseInt(form.quality) as any }); afterSubmit(); }
  const dur = getDuration();
  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid form-grid-3">
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Bed Time</label><input type="time" className="form-input" value={form.bedTime} onChange={e => setForm((f: any) => ({ ...f, bedTime: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Wake Time <span style={{ color: dur >= 7 ? 'var(--green)' : 'var(--orange)' }}>({dur.toFixed(1)}h)</span></label><input type="time" className="form-input" value={form.wakeTime} onChange={e => setForm((f: any) => ({ ...f, wakeTime: e.target.value }))} /></div>
      </div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Quality</label><select className="form-select" value={form.quality} onChange={e => setForm((f: any) => ({ ...f, quality: e.target.value }))}><option value="5">5⭐ Excellent</option><option value="4">4⭐ Good</option><option value="3">3⭐ Average</option><option value="2">2⭐ Poor</option><option value="1">1⭐ Bad</option></select></div>
        <div className="form-group"><label className="form-label">Notes</label><input type="text" className="form-input" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Optional..." /></div>
      </div>
      <button type="submit" className="btn btn-primary btn-full">Log Sleep 🌙</button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════
// DEEN SECTION
// ═══════════════════════════════════════════════════════

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
const PRAYER_ICONS: Record<string, string> = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌆', Isha: '🌙' };
const QURAN_TOTAL_PAGES = 604;

function DeenSection({ deen, today, logSalah, logQuranPages, logDhikr, logFast }: any) {
  const [showQuranLog, setShowQuranLog] = useState(false);
  const [quranForm, setQuranForm]       = useState({ pages: '', surah: '', notes: '' });
  const [fastDate, setFastDate]         = useState(today);
  const [fastType, setFastType]         = useState<'monday' | 'thursday' | 'ayyam-beedh' | 'other'>('monday');

  // ── Today's prayer entries
  const todaySalah  = deen.salah.filter((s: any) => s.date === today);
  const getPrayer   = (p: string) => todaySalah.find((s: any) => s.prayer === p);
  const allOnTime   = PRAYERS.every(p => getPrayer(p)?.status === 'on-time');
  const prayedCount = PRAYERS.filter(p => getPrayer(p)).length;

  // ── Quran stats
  const totalPages   = deen.quran.reduce((t: number, q: any) => t + q.pages, 0);
  const quranPct     = Math.min(100, Math.round((totalPages / QURAN_TOTAL_PAGES) * 100));
  const juzDone      = Math.floor(totalPages / (QURAN_TOTAL_PAGES / 30));
  const todayPages   = deen.quran.filter((q: any) => q.date === today).reduce((t: number, q: any) => t + q.pages, 0);

  // ── Adhkar
  const todayDhikr   = deen.dhikr.filter((d: any) => d.date === today);
  const hasMorning   = todayDhikr.some((d: any) => d.type === 'morning');
  const hasEvening   = todayDhikr.some((d: any) => d.type === 'evening');

  // ── Fasts
  const todayFast    = deen.fasts.find((f: any) => f.date === today);
  const totalFasts   = deen.fasts.filter((f: any) => f.completed).length;

  // ── 7-day prayer grid
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const entries = deen.salah.filter((s: any) => s.date === d);
    const onTime  = entries.filter((s: any) => s.status === 'on-time').length;
    return { date: d, label: format(subDays(new Date(), 6 - i), 'EEE'), onTime, logged: entries.length };
  });

  // ── Deen score (7-day)
  const last7date = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const salahScore = Math.round(
    (deen.salah.filter((s: any) => s.date >= last7date && s.status === 'on-time').length / (5 * 7)) * 100
  );
  const quranDays  = new Set(deen.quran.filter((q: any) => q.date >= last7date).map((q: any) => q.date)).size;
  const quranScore = Math.round((quranDays / 7) * 100);
  const adhkarDays = (() => {
    const byDay: Record<string, Set<string>> = {};
    deen.dhikr.filter((d: any) => d.date >= last7date).forEach((d: any) => {
      byDay[d.date] = byDay[d.date] ?? new Set();
      byDay[d.date].add(d.type);
    });
    return Object.values(byDay).filter(s => s.has('morning') && s.has('evening')).length;
  })();
  const adhkarScore = Math.round((adhkarDays / 7) * 100);
  const deenScore   = Math.round(salahScore * 0.5 + quranScore * 0.3 + adhkarScore * 0.2);

  function submitQuran(e: React.FormEvent) {
    e.preventDefault();
    logQuranPages(parseInt(quranForm.pages) || 1, quranForm.surah, quranForm.notes);
    setQuranForm({ pages: '', surah: '', notes: '' });
    setShowQuranLog(false);
  }

  const statusColor = (status: string | undefined) =>
    status === 'on-time' ? 'var(--green)' : status === 'late' ? 'var(--orange)' : status === 'missed' ? 'var(--red)' : 'var(--border)';
  const statusLabel = (status: string | undefined) =>
    status === 'on-time' ? '✓' : status === 'late' ? '!' : status === 'missed' ? '✗' : '–';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Deen Score + 7-day grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Score rings */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(244,197,66,.07), var(--bg-2))' }}>
          <div className="card-header"><div className="card-title">⭐ Deen Score</div><div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gold)' }}>{deenScore}</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {[
              { label: 'Salah', score: salahScore, color: 'var(--gold)' },
              { label: 'Quran', score: quranScore, color: 'var(--green)' },
              { label: 'Adhkar', score: adhkarScore, color: 'var(--cyan)' },
            ].map(({ label, score, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span style={{ color, fontWeight: 700 }}>{score}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-4)' }}>
                  <div style={{ height: '100%', width: `${score}%`, borderRadius: 3, background: color, transition: 'width .8s ease', boxShadow: score > 0 ? `0 0 6px ${color}` : undefined }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-day prayer mini-grid */}
        <div className="card">
          <div className="card-header"><div className="card-title">📅 7-Day Salah</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {last7.map(day => (
              <div key={day.date} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3 }}>{day.label}</div>
                <div style={{
                  width: '100%', paddingBottom: '100%', borderRadius: 6, position: 'relative',
                  background: day.onTime === 5 ? 'var(--gold)' : day.onTime >= 3 ? 'var(--green)' : day.logged > 0 ? 'var(--orange)' : 'var(--bg-4)',
                  boxShadow: day.onTime === 5 ? '0 0 8px var(--gold)' : undefined,
                }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: day.logged > 0 ? '#000' : 'var(--text-3)' }}>
                    {day.onTime || (day.logged > 0 ? day.logged : '')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, textAlign: 'center' }}>
            🟡 5/5 · 🟢 3-4 · 🟠 1-2 · ⬛ None
          </div>
        </div>
      </div>

      {/* ── Today's Salah ── */}
      <div className="card" style={{ borderColor: allOnTime ? 'var(--gold)' : undefined }}>
        <div className="card-header">
          <div className="card-title">🕌 Today's Salah</div>
          <div style={{ fontSize: 13, color: prayedCount === 5 ? 'var(--gold)' : 'var(--text-3)', fontWeight: 700 }}>
            {prayedCount}/5 {allOnTime ? '🏆 All on time!' : ''}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {PRAYERS.map(prayer => {
            const entry  = getPrayer(prayer);
            const color  = statusColor(entry?.status);
            return (
              <div key={prayer} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>{PRAYER_ICONS[prayer]}<br />{prayer}</div>
                {/* Status badge */}
                <div style={{
                  padding: '4px 0', borderRadius: 8, marginBottom: 6,
                  background: entry ? `${color}22` : 'var(--bg-4)',
                  border: `1px solid ${entry ? color : 'var(--border)'}`,
                  fontSize: 16, fontWeight: 700, color,
                  boxShadow: entry?.status === 'on-time' ? `0 0 8px ${color}55` : undefined,
                }}>
                  {statusLabel(entry?.status)}
                </div>
                {/* 3 status buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {(['on-time', 'late', 'missed'] as const).map(s => (
                    <button key={s} onClick={() => logSalah(prayer, s)}
                      style={{
                        padding: '3px 0', fontSize: 9, borderRadius: 4, border: `1px solid ${entry?.status === s ? statusColor(s) : 'var(--border)'}`,
                        background: entry?.status === s ? `${statusColor(s)}22` : 'var(--bg-4)',
                        color: entry?.status === s ? statusColor(s) : 'var(--text-3)',
                        cursor: 'pointer', fontWeight: entry?.status === s ? 700 : 400,
                        transition: 'all .15s',
                      }}>
                      {s === 'on-time' ? '✓ On Time' : s === 'late' ? '~ Late' : '✗ Missed'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quran + Adhkar (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Quran Progress */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📖 Quran</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowQuranLog(v => !v)}>+ Log</button>
          </div>
          {/* Progress ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="24" fill="none" stroke="var(--bg-4)" strokeWidth="6" />
                <circle cx="32" cy="32" r="24" fill="none" stroke="var(--green)" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 24 * quranPct / 100} ${2 * Math.PI * 24}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s ease', filter: quranPct > 0 ? 'drop-shadow(0 0 4px var(--green))' : undefined }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--green)' }}>{quranPct}%</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>{totalPages}<span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>/{QURAN_TOTAL_PAGES}p</span></div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Juz {juzDone}/30 complete</div>
              <div style={{ fontSize: 11, color: 'var(--gold)' }}>Today: {todayPages}p</div>
            </div>
          </div>

          {showQuranLog && (
            <form onSubmit={submitQuran} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group"><label className="form-label">Pages</label><input type="number" className="form-input" placeholder="10" value={quranForm.pages} onChange={e => setQuranForm(f => ({ ...f, pages: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Surah/Juz</label><input type="text" className="form-input" placeholder="Al-Baqarah..." value={quranForm.surah} onChange={e => setQuranForm(f => ({ ...f, surah: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><input type="text" className="form-input" placeholder="Tajweed notes..." value={quranForm.notes} onChange={e => setQuranForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <button type="submit" className="btn btn-primary btn-full" style={{ fontSize: 12 }}>Log +{parseInt(quranForm.pages || '0') * 3} XP 📖</button>
            </form>
          )}
        </div>

        {/* Adhkar + Fasting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Adhkar */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header"><div className="card-title">🤲 Adhkar</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([['morning', '🌅', 'Morning Adhkar', hasMorning], ['evening', '🌆', 'Evening Adhkar', hasEvening]] as const).map(([type, icon, label, done]) => (
                <div key={type} onClick={() => !done && logDhikr(type)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
                  background: done ? 'rgba(110,231,183,.1)' : 'var(--bg-4)',
                  border: `1px solid ${done ? 'var(--green)' : 'var(--border)'}`,
                  cursor: done ? 'default' : 'pointer', transition: 'all .2s',
                }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: done ? 'var(--text-3)' : 'var(--text-1)', textDecoration: done ? 'line-through' : undefined }}>{label}</span>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? 'var(--green)' : 'transparent', border: `2px solid ${done ? 'var(--green)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, boxShadow: done ? '0 0 8px var(--green)' : undefined }}>
                    {done ? '✓' : ''}
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => logDhikr('custom')}>+ Custom Dhikr (+10 XP)</button>
            </div>
          </div>

          {/* Fasting */}
          <div className="card">
            <div className="card-header"><div className="card-title">🌙 Fasting</div><span style={{ fontSize: 11, color: 'var(--gold)' }}>{totalFasts} total</span></div>
            {todayFast ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--gold)', fontWeight: 600, fontSize: 13 }}>
                <span>🌟</span> Fast logged today · +50 XP
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <select className="form-select" style={{ marginBottom: 6, fontSize: 12 }} value={fastType} onChange={e => setFastType(e.target.value as any)}>
                    <option value="monday">Monday</option>
                    <option value="thursday">Thursday</option>
                    <option value="ayyam-beedh">Ayyam al-Beedh (13-15)</option>
                    <option value="other">Other Sunnah</option>
                  </select>
                  <input type="date" className="form-input" style={{ fontSize: 12 }} value={fastDate} onChange={e => setFastDate(e.target.value)} />
                </div>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '8px 10px' }} onClick={() => logFast(fastDate, fastType)}>Log +50 XP</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Quran log ── */}
      {deen.quran.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">📋 Recent Quran Sessions</div></div>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Pages</th><th>Surah/Juz</th><th>XP</th></tr></thead>
            <tbody>
              {deen.quran.slice().reverse().slice(0, 7).map((q: any) => (
                <tr key={q.id}>
                  <td>{q.date}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>{q.pages}p</td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{q.surah || '—'}</td>
                  <td style={{ color: 'var(--xp)', fontWeight: 600 }}>+{q.xpGained}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DAILY ROUTINE
// ═══════════════════════════════════════════════════════

type RoutineCategory = 'spiritual' | 'fitness' | 'soccer' | 'learning' | 'business' | 'nutrition' | 'rest' | 'personal';

const ROUTINE_BLOCKS: {
  id: string; time: string; mins: number; icon: string; label: string;
  category: RoutineCategory; xp: number; link: string | null; desc: string;
}[] = [
  { id: 'rb-fajr',     time: '05:00', mins: 300,  icon: '🕌', label: 'Wake Up & Fajr',           category: 'spiritual', xp: 30, link: 'discipline', desc: 'Rise before the world wakes up' },
  { id: 'rb-shower1',  time: '05:20', mins: 320,  icon: '🚿', label: 'Shower & Get Ready',        category: 'personal',  xp: 10, link: null,         desc: 'Start fresh, look sharp' },
  { id: 'rb-quran',    time: '05:40', mins: 340,  icon: '📖', label: 'Quran',                     category: 'spiritual', xp: 25, link: 'discipline', desc: '30 min of recitation & reflection' },
  { id: 'rb-stretch',  time: '06:10', mins: 370,  icon: '🧘', label: 'Stretching & Mobility',     category: 'fitness',   xp: 15, link: 'fitness',    desc: 'Activate the body, prevent injury' },
  { id: 'rb-ballwork', time: '06:45', mins: 405,  icon: '⚽', label: 'Morning Ball Work',         category: 'soccer',    xp: 20, link: 'soccer',     desc: 'Technical work — touch, first touch, finishing' },
  { id: 'rb-bfast',    time: '08:00', mins: 480,  icon: '🍳', label: 'Breakfast',                 category: 'nutrition', xp: 10, link: null,         desc: 'Fuel up — protein + carbs' },
  { id: 'rb-study',    time: '08:30', mins: 510,  icon: '📚', label: 'Study Block',               category: 'learning',  xp: 25, link: 'school',     desc: '2 hrs deep work — Maths, Coding, Arabic...' },
  { id: 'rb-gym',      time: '10:30', mins: 630,  icon: '💪', label: 'Gym + Speed',               category: 'fitness',   xp: 30, link: 'fitness',    desc: 'Strength session + sprint work' },
  { id: 'rb-duha',     time: '12:15', mins: 735,  icon: '☀️', label: 'Duha, Lunch & Chill',       category: 'spiritual', xp: 20, link: null,         desc: 'Pray Duha, eat, decompress' },
  { id: 'rb-dhuhr',    time: '13:30', mins: 810,  icon: '🕌', label: 'Dhuhr',                     category: 'spiritual', xp: 20, link: null,         desc: 'Midday prayer' },
  { id: 'rb-biz',      time: '14:00', mins: 840,  icon: '💼', label: 'Business Block',            category: 'business',  xp: 25, link: 'business',   desc: '1.5 hrs — execution, planning, outreach' },
  { id: 'rb-nap',      time: '15:30', mins: 930,  icon: '😴', label: 'Nap',                       category: 'rest',      xp: 10, link: null,         desc: '20-30 min power nap' },
  { id: 'rb-mental',   time: '17:00', mins: 1020, icon: '🧠', label: 'Mental Grind & Prep',       category: 'learning',  xp: 15, link: 'school',     desc: 'Review goals, visualise, prep for training' },
  { id: 'rb-asr',      time: '17:30', mins: 1050, icon: '🙏', label: 'Asr + Dhikr',               category: 'spiritual', xp: 25, link: 'discipline', desc: 'Afternoon prayer + dhikr session' },
  { id: 'rb-training', time: '18:00', mins: 1080, icon: '⚽', label: 'Training Session',          category: 'soccer',    xp: 30, link: 'soccer',     desc: 'Full session — tactical, physical, technical' },
  { id: 'rb-shower2',  time: '20:00', mins: 1200, icon: '🚿', label: 'Shower',                    category: 'personal',  xp:  5, link: null,         desc: 'Recovery begins now' },
  { id: 'rb-dinner',   time: '20:30', mins: 1230, icon: '🍽️', label: 'Dinner',                    category: 'nutrition', xp: 10, link: null,         desc: 'Clean meal — no junk' },
  { id: 'rb-maghrib',  time: '21:00', mins: 1260, icon: '🕌', label: 'Maghrib & Quran',           category: 'spiritual', xp: 20, link: null,         desc: 'Evening prayer + reflection' },
  { id: 'rb-isha',     time: '22:30', mins: 1350, icon: '🌙', label: 'Isha, Journal & Lights Out', category: 'spiritual', xp: 20, link: null,        desc: 'Journal the day. No phone. Sleep.' },
];

const ROUTINE_CAT_COLOR: Record<RoutineCategory, string> = {
  spiritual: 'var(--gold)',
  fitness:   'var(--red)',
  soccer:    'var(--green)',
  learning:  'var(--blue)',
  business:  'var(--orange)',
  nutrition: '#4ade80',
  rest:      'var(--purple)',
  personal:  'var(--text-3)',
};

function DailyRoutine({ log, logBlock, today }: { log: any[]; logBlock: (id: string, xp: number) => void; today: string }) {
  const todayLog = log.filter(l => l.date === today);
  const doneIds  = new Set(todayLog.map(l => l.blockId));
  const done     = doneIds.size;
  const total    = ROUTINE_BLOCKS.length;
  const pct      = Math.round((done / total) * 100);
  const xpToday  = todayLog.reduce((s, l) => s + l.xpGained, 0);

  // Current time → highlight active block
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const activeIdx = ROUTINE_BLOCKS.reduce<number>((best, b, i) => b.mins <= nowMins ? i : best, -1);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const ringCirc = 2 * Math.PI * 28;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Summary card ── */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,.07), var(--bg-2))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* SVG ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--bg-4)" strokeWidth="7" />
              <circle cx="36" cy="36" r="28" fill="none"
                stroke={pct === 100 ? 'var(--gold)' : 'var(--orange)'}
                strokeWidth="7"
                strokeDasharray={`${ringCirc * pct / 100} ${ringCirc}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray .8s ease', filter: pct > 0 ? 'drop-shadow(0 0 5px var(--orange))' : undefined }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: pct === 100 ? 'var(--gold)' : 'var(--orange)' }}>{pct}%</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
              {pct === 100 ? '🏆 Perfect Day!' : pct >= 75 ? '🔥 Almost There!' : pct >= 50 ? '💪 Halfway Done' : pct > 0 ? '⚡ Keep Going' : '⏰ Ready to Start'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
              {done} of {total} blocks complete · <span style={{ color: 'var(--xp)', fontWeight: 600 }}>+{xpToday} XP</span> earned today
            </div>
            {/* Mini progress bar */}
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-4)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct === 100 ? 'var(--gold)' : 'linear-gradient(90deg, var(--orange), var(--gold))', transition: 'width .8s ease' }} />
            </div>
          </div>

          {/* Live clock */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
              {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>NOW</div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="card" style={{ padding: '20px 16px' }}>
        <div style={{ position: 'relative' }}>
          {/* Vertical spine */}
          <div style={{ position: 'absolute', left: 76, top: 8, bottom: 8, width: 2, background: 'var(--bg-4)', borderRadius: 1 }} />

          {ROUTINE_BLOCKS.map((block, i) => {
            const isDone    = doneIds.has(block.id);
            const isActive  = i === activeIdx && !isDone;
            const isMissed  = block.mins < nowMins && !isDone && i < activeIdx;
            const color     = ROUTINE_CAT_COLOR[block.category];

            return (
              <div key={block.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: i < ROUTINE_BLOCKS.length - 1 ? 4 : 0 }}>

                {/* Time label */}
                <div style={{ width: 60, paddingTop: 10, fontSize: 11, fontWeight: 700, color: isActive ? color : isDone ? 'var(--text-3)' : 'var(--text-3)', textAlign: 'right', flexShrink: 0 }}>
                  {block.time}
                </div>

                {/* Dot (sits on the spine) */}
                <div style={{ width: 32, display: 'flex', justifyContent: 'center', paddingTop: 8, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: isDone ? 14 : isActive ? 16 : 12,
                    height: isDone ? 14 : isActive ? 16 : 12,
                    borderRadius: '50%',
                    background: isDone ? color : isActive ? color : 'var(--bg-3)',
                    border: `2px solid ${isDone || isActive ? color : 'var(--border)'}`,
                    boxShadow: isActive ? `0 0 0 4px ${color}33, 0 0 12px ${color}66` : isDone ? `0 0 6px ${color}55` : undefined,
                    transition: 'all .3s',
                    flexShrink: 0,
                  }} />
                </div>

                {/* Block card */}
                <div style={{ flex: 1, marginBottom: 6 }}>
                  <div style={{
                    padding: isActive ? '10px 14px' : '8px 12px',
                    borderRadius: 10,
                    background: isActive ? `${color}12` : isDone ? 'transparent' : 'transparent',
                    border: `1px solid ${isActive ? color : 'transparent'}`,
                    boxShadow: isActive ? `0 0 20px ${color}22` : undefined,
                    transition: 'all .3s',
                    opacity: isMissed ? 0.45 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: isActive ? 22 : 18, flexShrink: 0 }}>{block.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? 'var(--text-3)' : 'var(--text-1)', textDecoration: isDone ? 'line-through' : undefined, lineHeight: 1.3 }}>
                          {block.label}
                          {isActive && <span style={{ marginLeft: 8, fontSize: 10, color, fontWeight: 800, letterSpacing: 1 }}>● NOW</span>}
                        </div>
                        {isActive && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{block.desc}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: isDone ? 'var(--text-3)' : 'var(--xp)', fontWeight: 700 }}>+{block.xp}</span>
                        {block.link && !isDone && (
                          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => scrollTo(block.link!)}>→</button>
                        )}
                        <button
                          className="btn btn-sm"
                          style={{
                            padding: '3px 10px', fontSize: 11, minWidth: 58,
                            background: isDone ? 'transparent' : isActive ? color : 'var(--bg-4)',
                            color: isDone ? 'var(--text-3)' : isActive ? '#000' : 'var(--text-2)',
                            border: isDone ? '1px solid var(--border)' : `1px solid ${isActive ? color : 'var(--border)'}`,
                            fontWeight: isDone ? 400 : 700,
                            cursor: isDone ? 'default' : 'pointer',
                          }}
                          disabled={isDone}
                          onClick={() => !isDone && logBlock(block.id, block.xp)}
                        >
                          {isDone ? '✓ Done' : 'Log ✓'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Summer subjects config — edit freely
const SUMMER_SUBJECTS: { name: string; icon: string; color: string; target: number }[] = [
  { name: 'Maths',          icon: '📐', color: 'var(--blue)',   target: 300 },
  { name: 'Arabic',         icon: '🌙', color: 'var(--gold)',   target: 240 },
  { name: 'Islamic Studies',icon: '📖', color: 'var(--green)',  target: 180 },
  { name: 'Coding',         icon: '💻', color: 'var(--cyan)',   target: 360 },
  { name: 'English',        icon: '✍️', color: 'var(--purple)', target: 180 },
  { name: 'Business',       icon: '💼', color: 'var(--orange)', target: 120 },
  { name: 'Science',        icon: '🔬', color: 'var(--red)',    target: 120 },
  { name: 'Online Course',  icon: '🎓', color: '#6ee7f7',       target: 300 },
];

function SummerFocusCard({ sessions }: { sessions: any[] }) {
  // Minutes per subject across all sessions
  const bySubject: Record<string, number> = {};
  sessions.forEach((s: any) => {
    bySubject[s.subject] = (bySubject[s.subject] ?? 0) + s.duration;
  });

  // Days until Sep 1 (rough end of summer)
  const now = new Date();
  const summerEnd = new Date(now.getFullYear(), 8, 1); // Sep 1
  const daysLeft = Math.max(0, Math.ceil((summerEnd.getTime() - now.getTime()) / 86400000));
  const totalSummerDays = 92; // ~Jun–Aug
  const daysPassed = Math.max(0, totalSummerDays - daysLeft);
  const summerPct = Math.min(100, Math.round((daysPassed / totalSummerDays) * 100));

  return (
    <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(59,130,246,.08), var(--bg-2))' }}>
      <div className="card-header">
        <div className="card-title">☀️ Summer Progress</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{daysLeft}</span> days left
        </div>
      </div>

      {/* Summer timeline bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
          <span>Jun 1</span><span style={{ color: 'var(--gold)', fontWeight: 600 }}>Today {summerPct}%</span><span>Sep 1</span>
        </div>
        <div style={{ height: 10, borderRadius: 6, background: 'var(--bg-4)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${summerPct}%`, borderRadius: 6, background: 'linear-gradient(90deg, var(--blue), var(--cyan))', transition: 'width 1s ease' }} />
        </div>
      </div>

      {/* Subject progress bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SUMMER_SUBJECTS.map(sub => {
          const done = bySubject[sub.name] ?? 0;
          const pct  = Math.min(100, Math.round((done / sub.target) * 100));
          const hrs  = (done / 60).toFixed(1);
          const tgt  = (sub.target / 60).toFixed(0);
          return (
            <div key={sub.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{sub.icon}</span>{sub.name}
                </span>
                <span style={{ fontSize: 11, color: pct >= 100 ? sub.color : 'var(--text-3)' }}>
                  {pct >= 100 ? '✓ ' : ''}{hrs}h / {tgt}h
                </span>
              </div>
              <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-4)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, width: `${pct}%`,
                  background: sub.color,
                  boxShadow: pct > 0 ? `0 0 6px ${sub.color}` : undefined,
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
        Targets = recommended hours for the full summer. Tap a subject to log.
      </div>
    </div>
  );
}

const SUMMER_SUBJECT_NAMES = SUMMER_SUBJECTS.map(s => s.name).concat(['PE / Sport', 'Other']);
const SUMMER_SESSION_TYPES = [
  { value: 'self-study',     label: '🧠 Self-Study' },
  { value: 'online-course',  label: '🎓 Online Course' },
  { value: 'video-lecture',  label: '📺 Video Lecture' },
  { value: 'practice',       label: '✏️ Practice Problems' },
  { value: 'project',        label: '🛠️ Project Work' },
  { value: 'reading',        label: '📖 Reading / Research' },
  { value: 'revision',       label: '🔄 Revision' },
  { value: 'tutoring',       label: '👨‍🏫 Tutoring Session' },
];

function SchoolLogForm({ add, afterSubmit }: { add: any; afterSubmit: any }) {
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    subject: 'Maths',
    duration: '',
    type: 'self-study',
    notes: '',
  });

  const subjectConfig = SUMMER_SUBJECTS.find(s => s.name === form.subject);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    add({ ...form, duration: parseInt(form.duration) || 60, grade: '' });
    setForm(f => ({ ...f, duration: '', notes: '' }));
    afterSubmit();
  }

  return (
    <form onSubmit={submit} className="form-grid">
      {/* Subject picker — visual chips */}
      <div className="form-group">
        <label className="form-label">Subject</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUMMER_SUBJECT_NAMES.map(s => {
            const cfg = SUMMER_SUBJECTS.find(x => x.name === s);
            const active = form.subject === s;
            return (
              <button key={s} type="button"
                onClick={() => setForm(f => ({ ...f, subject: s }))}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${active ? (cfg?.color ?? 'var(--gold)') : 'var(--border)'}`,
                  background: active ? `${cfg?.color ?? 'var(--gold)'}22` : 'var(--bg-4)',
                  color: active ? (cfg?.color ?? 'var(--gold)') : 'var(--text-2)',
                  cursor: 'pointer', transition: 'all .15s',
                  boxShadow: active ? `0 0 8px ${cfg?.color ?? 'var(--gold)'}44` : undefined,
                }}>
                {cfg?.icon ?? '📌'} {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="form-grid form-grid-3">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (min)</label>
          <input type="number" className="form-input" placeholder="60" value={form.duration}
            onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label className="form-label">Session Type</label>
          <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {SUMMER_SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Inline summer target progress hint */}
      {subjectConfig && (() => {
        const pct = Math.min(100, Math.round(((form.duration ? parseInt(form.duration) : 0) / subjectConfig.target) * 100));
        return null; // hint suppressed — the focus card shows it
      })()}

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="What did you cover? Key concepts, chapters, URLs..." />
      </div>
      <button type="submit" className="btn btn-primary btn-full"
        style={{ background: subjectConfig ? `linear-gradient(90deg, ${subjectConfig.color}, var(--blue))` : undefined }}>
        Log Session ☀️ +XP
      </button>
    </form>
  );
}

function ReadingLogForm({ add, addBook, books, afterSubmit }: { add: any; addBook: any; books: any[]; afterSubmit: any }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), book: '', author: '', pagesRead: '', totalPages: '', notes: '' });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!books.find((b: any) => b.title.toLowerCase() === form.book.toLowerCase()) && form.totalPages) {
      addBook({ title: form.book, author: form.author, totalPages: parseInt(form.totalPages), pagesRead: 0, startDate: form.date, status: 'reading' });
    }
    add({ ...form, pagesRead: parseInt(form.pagesRead) || 0, totalPages: parseInt(form.totalPages) || 300 });
    setForm((f: any) => ({ ...f, pagesRead: '', notes: '' }));
    afterSubmit();
  }
  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Book Title</label>
          <input type="text" className="form-input" list="app-books" value={form.book} onChange={e => { const b = books.find((b: any) => b.title === e.target.value); setForm((f: any) => ({ ...f, book: e.target.value, author: b?.author ?? f.author, totalPages: b ? String(b.totalPages) : f.totalPages })); }} required placeholder="Book title" />
          <datalist id="app-books">{books.map((b: any) => <option key={b.id} value={b.title} />)}</datalist>
        </div>
      </div>
      <div className="form-grid form-grid-3">
        <div className="form-group"><label className="form-label">Author</label><input type="text" className="form-input" value={form.author} onChange={e => setForm((f: any) => ({ ...f, author: e.target.value }))} placeholder="Author name" /></div>
        <div className="form-group"><label className="form-label">Pages Read</label><input type="number" className="form-input" placeholder="30" value={form.pagesRead} onChange={e => setForm((f: any) => ({ ...f, pagesRead: e.target.value }))} required /></div>
        <div className="form-group"><label className="form-label">Total Pages</label><input type="number" className="form-input" placeholder="320" value={form.totalPages} onChange={e => setForm((f: any) => ({ ...f, totalPages: e.target.value }))} /></div>
      </div>
      <button type="submit" className="btn btn-primary btn-full">Log Reading 📖</button>
    </form>
  );
}

function BusinessLogForm({ add, afterSubmit }: { add: any; afterSubmit: any }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), category: 'execution', title: '', impact: 'medium', duration: '30', notes: '' });
  function submit(e: React.FormEvent) { e.preventDefault(); add({ ...form, duration: parseInt(form.duration) || 30, description: '' }); setForm((f: any) => ({ ...f, title: '', notes: '' })); afterSubmit(); }
  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>{['planning','networking','learning','execution','marketing','finance','other'].map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select></div>
      </div>
      <div className="form-group"><label className="form-label">Task Title</label><input type="text" className="form-input" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} required placeholder="What did you work on?" /></div>
      <div className="form-grid form-grid-2">
        <div className="form-group"><label className="form-label">Impact</label><select className="form-select" value={form.impact} onChange={e => setForm((f: any) => ({ ...f, impact: e.target.value }))}><option value="high">High (+65 XP)</option><option value="medium">Medium (+45 XP)</option><option value="low">Low (+25 XP)</option></select></div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" className="form-input" value={form.duration} onChange={e => setForm((f: any) => ({ ...f, duration: e.target.value }))} /></div>
      </div>
      <button type="submit" className="btn btn-primary btn-full">Log Task 💼</button>
    </form>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Spiritual: 'var(--gold)',
  Nutrition:  'var(--green)',
  Discipline: 'var(--cyan)',
  Physical:   'var(--red)',
  Mental:     'var(--purple)',
  Sleep:      'var(--blue)',
};

function DisciplineSection({ discipline, addGoal, removeGoal, resetGoals, toggleGoal, logEntry, today }: any) {
  const [showAdd, setShowAdd]   = useState(false);
  const [showMgmt, setShowMgmt] = useState(false);
  const [gForm, setGForm]       = useState({ title: '', category: 'Spiritual', icon: '📿' });
  const ICONS = ['📿','🙏','🕌','📖','🥗','🛡️','💪','📵','🌙','💧','🧘','🏃','✍️','🚫','⏰','💊','🎯'];

  const activeGoals  = discipline.goals.filter((g: any) => g.active);
  const todayEntries = discipline.entries.filter((e: any) => e.date === today);
  const done         = activeGoals.filter((g: any) => todayEntries.find((e: any) => e.goalId === g.id && e.achieved)).length;
  const pct          = activeGoals.length > 0 ? Math.round((done / activeGoals.length) * 100) : 0;
  const allDone      = done === activeGoals.length && activeGoals.length > 0;

  // Group by category for display
  const categories: string[] = [...new Set<string>(activeGoals.map((g: any) => g.category as string))];

  function addG(e: React.FormEvent) {
    e.preventDefault();
    addGoal({ ...gForm, active: true });
    setGForm({ title: '', category: 'Spiritual', icon: '📿' });
    setShowAdd(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Daily Check-in Card ── */}
      <div className="card" style={{ borderColor: allDone ? 'var(--gold)' : undefined, background: allDone ? 'linear-gradient(135deg, rgba(244,197,66,.08), var(--bg-2))' : undefined }}>
        <div className="card-header">
          <div className="card-title">
            {allDone ? '🏆 Perfect Day!' : '🎯 Today\'s Habits'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: allDone ? 'var(--gold)' : 'var(--text-2)' }}>{done}/{activeGoals.length}</span>
            <div style={{ width: 48, height: 48, position: 'relative', flexShrink: 0 }}>
              <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="24" cy="24" r="18" fill="none" stroke="var(--bg-4)" strokeWidth="5" />
                <circle cx="24" cy="24" r="18" fill="none"
                  stroke={allDone ? 'var(--gold)' : 'var(--cyan)'} strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 18 * pct / 100} ${2 * Math.PI * 18}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray .6s ease', filter: allDone ? 'drop-shadow(0 0 4px var(--gold))' : undefined }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: allDone ? 'var(--gold)' : 'var(--text-1)' }}>{pct}%</div>
            </div>
          </div>
        </div>

        {activeGoals.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🎯</div><div className="empty-state-title">No habits yet</div><div className="empty-state-desc">Add a habit below to start tracking</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {categories.map(cat => {
              const catGoals = activeGoals.filter((g: any) => g.category === cat);
              const catColor = CATEGORY_COLORS[cat] ?? 'var(--text-3)';
              return (
                <div key={cat}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: catColor, marginBottom: 8, textTransform: 'uppercase' }}>{cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {catGoals.map((goal: any) => {
                      const entry    = todayEntries.find((e: any) => e.goalId === goal.id);
                      const achieved = entry?.achieved ?? false;
                      return (
                        <div key={goal.id}
                          onClick={() => !entry && logEntry({ date: today, goalId: goal.id, achieved: true, notes: '' })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 10,
                            background: achieved ? `${catColor}18` : 'var(--bg-4)',
                            border: `1px solid ${achieved ? catColor : 'var(--border)'}`,
                            cursor: entry ? 'default' : 'pointer',
                            transition: 'all .2s',
                          }}>
                          <span style={{ fontSize: 22 }}>{goal.icon}</span>
                          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: achieved ? 'var(--text-1)' : 'var(--text-2)' }}>{goal.title}</span>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            border: `2px solid ${achieved ? catColor : 'var(--border)'}`,
                            background: achieved ? catColor : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all .2s',
                            boxShadow: achieved ? `0 0 8px ${catColor}` : undefined,
                          }}>
                            {achieved && <span style={{ fontSize: 13 }}>✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { setShowAdd(v => !v); setShowMgmt(false); }}>+ Add Habit</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowMgmt(v => !v); setShowAdd(false); }}>⚙️ Manage</button>
        </div>
      </div>

      {/* ── Add Habit Form ── */}
      {showAdd && (
        <div className="card">
          <div className="card-header"><div className="card-title">✨ New Habit</div></div>
          <form onSubmit={addG} className="form-grid">
            <div className="form-group">
              <label className="form-label">Habit Name</label>
              <input type="text" className="form-input" value={gForm.title} onChange={e => setGForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Morning walk" />
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={gForm.category} onChange={e => setGForm(f => ({ ...f, category: e.target.value }))}>
                  {['Spiritual','Nutrition','Discipline','Physical','Mental','Sleep','Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Icon</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'var(--bg-4)', padding: 6, borderRadius: 8 }}>
                  {ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setGForm(f => ({ ...f, icon: ic }))}
                      style={{ fontSize: 18, padding: 4, borderRadius: 6, border: gForm.icon === ic ? '2px solid var(--gold)' : '2px solid transparent', background: 'none', cursor: 'pointer' }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Habit ✨</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Manage Habits ── */}
      {showMgmt && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚙️ Manage Habits</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Reset to default habits?')) resetGoals(); }}>↺ Reset</button>
          </div>
          {discipline.goals.length === 0
            ? <div className="empty-state"><div className="empty-state-desc">No habits yet</div></div>
            : discipline.goals.map((g: any) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', opacity: g.active ? 1 : 0.45 }}>
                <span style={{ fontSize: 20 }}>{g.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: CATEGORY_COLORS[g.category] ?? 'var(--text-3)' }}>{g.category}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleGoal(g.id)}>{g.active ? 'Pause' : 'Resume'}</button>
                <button className="btn btn-danger btn-sm" onClick={() => removeGoal(g.id)}>✕</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function SettingsForm() {
  const { settings, updateSettings, saveWeeklySnapshot, profile } = useGameStore();
  const [form, setForm] = useState({ ...settings, playerName: profile.name });
  const [saved, setSaved] = useState(false);
  function submit(e: React.FormEvent) { e.preventDefault(); updateSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  function exportData() { const d = JSON.stringify(useGameStore.getState(), null, 2); const b = new Blob([d], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `levelup-${format(new Date(),'yyyy-MM-dd')}.json`; a.click(); URL.revokeObjectURL(u); }
  return (
    <form onSubmit={submit} style={{ maxWidth: 700 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">👤 Profile</div></div>
        <div className="form-group"><label className="form-label">Player Name</label><input type="text" className="form-input" value={form.playerName} onChange={e => setForm((f: any) => ({ ...f, playerName: e.target.value }))} /></div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">🎯 Weekly Targets</div></div>
        <div className="form-grid form-grid-3">
          {[
            { label: '⚽ Soccer Sessions/Week', key: 'soccerWeeklyTarget', min: 1, max: 14 },
            { label: '💪 Workouts/Week', key: 'fitnessWeeklyTarget', min: 1, max: 14 },
            { label: '💼 Business Tasks/Week', key: 'businessWeeklyTarget', min: 1, max: 30 },
            { label: '🌙 Sleep Target (h)', key: 'sleepTarget', min: 5, max: 12, step: 0.5 },
            { label: '📚 Study Target (h/day)', key: 'studyDailyTarget', min: 0.5, max: 12, step: 0.5 },
            { label: '📖 Reading Target (pages/day)', key: 'readingDailyTarget', min: 5, max: 200, step: 5 },
          ].map(f => (
            <div key={f.key} className="form-group">
              <label className="form-label">{f.label}</label>
              <input type="number" className="form-input" min={f.min} max={f.max} step={(f as any).step ?? 1}
                value={(form as any)[f.key]}
                onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: parseFloat(e.target.value) || f.min }))} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }}>{saved ? '✅ Saved!' : '💾 Save Settings'}</button>
        <button type="button" className="btn btn-secondary" onClick={() => saveWeeklySnapshot()}>📅 Snapshot</button>
        <button type="button" className="btn btn-secondary" onClick={exportData}>📤 Export</button>
        <button type="button" className="btn btn-danger" onClick={() => { if (confirm('Delete ALL data?')) { localStorage.removeItem('levelup-storage'); window.location.reload(); } }}>🗑️ Clear Data</button>
      </div>
    </form>
  );
}

// Chart helpers
function FitnessChart({ workouts }: { workouts: any[] }) {
  const data = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    return { date: format(subDays(new Date(), 13 - i), 'MMM d'), minutes: workouts.filter((w: any) => w.date === d).reduce((t: number, w: any) => t + w.duration, 0) };
  });
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="m" />
        <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
        <Bar dataKey="minutes" fill="var(--red)" radius={[4, 4, 0, 0]} name="Minutes" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SleepChart({ entries, target, height = 180 }: { entries: any[]; target: number; height?: number }) {
  const data = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    const e = entries.find((s: any) => s.date === d);
    return { date: format(subDays(new Date(), 13 - i), 'MMM d'), hours: e?.duration ?? null };
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 12]} tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
        <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} formatter={(v: any) => v ? [`${v}h`, 'Sleep'] : ['—', 'Sleep']} />
        <Line type="monotone" dataKey="hours" stroke="var(--purple)" strokeWidth={2} connectNulls={false}
          dot={(p: any) => p.value ? <circle cx={p.cx} cy={p.cy} r={4} fill={p.value >= target ? 'var(--green)' : p.value >= 6 ? 'var(--orange)' : 'var(--red)'} stroke="none" /> : <g />} />
      </LineChart>
    </ResponsiveContainer>
  );
}
