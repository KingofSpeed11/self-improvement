import { useMemo } from 'react';
import { format, subDays, subMonths, startOfWeek } from 'date-fns';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts';
import { useGameStore } from '../store/gameStore';
import { getConsistencyScore, getDisciplineScore, detectBottlenecks, getRecommendations, getAcademyReadinessScore } from '../utils/analytics';

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="card-header">
        <div className="card-title">{title}</div>
      </div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const { soccer, fitness, sleep, school, reading, business, discipline, weeklySnapshots, settings, profile } = useGameStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const last7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const last30 = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const consistencyScore = useMemo(() => getConsistencyScore([
    ...soccer.sessions, ...fitness.workouts, ...sleep.entries,
    ...school.sessions, ...reading.entries, ...business.tasks,
  ]), [soccer, fitness, sleep, school, reading, business]);

  const disciplineScore = useMemo(() => getDisciplineScore(discipline.entries, discipline.goals), [discipline]);

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

  // Daily multi-metric chart (last 14 days)
  const dailyData = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    const label = format(subDays(new Date(), 13 - i), 'MMM d');
    const soc = soccer.sessions.filter(s => s.date === d).length;
    const fit = fitness.workouts.filter(w => w.date === d).length;
    const slp = sleep.entries.find(s => s.date === d)?.duration ?? 0;
    const stu = (school.sessions.filter(s => s.date === d).reduce((t, s) => t + s.duration, 0)) / 60;
    return { date: label, Soccer: soc, Fitness: fit, Sleep: parseFloat(slp.toFixed(1)), Study: parseFloat(stu.toFixed(1)) };
  }), [soccer, fitness, sleep, school]);

  // Monthly XP trend (last 6 months)
  const monthlyXP = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const monthStart = format(subMonths(new Date(), 5 - i), 'yyyy-MM');
    const allSessions = [
      ...soccer.sessions.filter(s => s.date.startsWith(monthStart)),
      ...fitness.workouts.filter(w => w.date.startsWith(monthStart)),
      ...sleep.entries.filter(s => s.date.startsWith(monthStart)),
      ...school.sessions.filter(s => s.date.startsWith(monthStart)),
      ...reading.entries.filter(r => r.date.startsWith(monthStart)),
      ...business.tasks.filter(b => b.date.startsWith(monthStart)),
    ];
    const xp = allSessions.reduce((t: number, s: any) => t + (s.xpGained || 0), 0);
    return { month: format(subMonths(new Date(), 5 - i), 'MMM'), xp };
  }), [soccer, fitness, sleep, school, reading, business]);

  // Radar - weekly performance vs target
  const radarData = [
    { subject: 'Soccer', A: Math.min((soccer.sessions.filter(s => s.date >= last7).length / settings.soccerWeeklyTarget) * 100, 100), fullMark: 100 },
    { subject: 'Fitness', A: Math.min((fitness.workouts.filter(w => w.date >= last7).length / settings.fitnessWeeklyTarget) * 100, 100), fullMark: 100 },
    { subject: 'Sleep', A: (() => { const e = sleep.entries.filter(s => s.date >= last7); return e.length ? (e.filter(s => s.duration >= settings.sleepTarget).length / 7) * 100 : 0; })(), fullMark: 100 },
    { subject: 'School', A: Math.min((school.sessions.filter(s => s.date >= last7).reduce((t, s) => t + s.duration, 0) / 60 / (settings.studyDailyTarget * 7)) * 100, 100), fullMark: 100 },
    { subject: 'Reading', A: Math.min((reading.entries.filter(r => r.date >= last7).reduce((t, r) => t + r.pagesRead, 0) / (settings.readingDailyTarget * 7)) * 100, 100), fullMark: 100 },
    { subject: 'Business', A: Math.min((business.tasks.filter(b => b.date >= last7).length / settings.businessWeeklyTarget) * 100, 100), fullMark: 100 },
    { subject: 'Discipline', A: disciplineScore, fullMark: 100 },
  ];

  // Sleep quality trend
  const sleepData = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    const entry = sleep.entries.find(s => s.date === d);
    return { date: format(subDays(new Date(), 13 - i), 'MMM d'), hours: entry?.duration ?? 0, quality: entry?.quality ?? 0 };
  }), [sleep.entries]);

  // Weekly snapshot comparison
  const weeklyComp = useMemo(() => weeklySnapshots.slice(-8).map(s => ({
    week: format(new Date(s.weekStart), 'MMM d'),
    xp: s.xpGained,
    soccer: Math.round(s.soccerMinutes / 60 * 10) / 10,
    discipline: s.disciplineScore,
  })), [weeklySnapshots]);

  // Category scores this week
  const catScores = radarData.map(d => ({ category: d.subject, score: Math.round(d.A) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Score cards */}
      <div className="stat-grid">
        {[
          { label: 'Consistency', value: `${consistencyScore}%`, icon: '📊', accent: 'var(--blue)', sub: 'last 30 days' },
          { label: 'Discipline', value: `${disciplineScore}%`, icon: '🎯', accent: 'var(--gold)', sub: 'last 7 days' },
          { label: 'Academy Score', value: academyScore, icon: '⚽', accent: 'var(--green)', sub: '/100' },
          { label: 'Total XP', value: profile.totalXP.toLocaleString(), icon: '⚡', accent: 'var(--xp)', sub: 'all time' },
          { label: 'Level', value: profile.level, icon: '🌟', accent: 'var(--gold)', sub: profile.rank },
          { label: 'Bottlenecks', value: bottlenecks.length, icon: '⚠️', accent: bottlenecks.length > 0 ? 'var(--red)' : 'var(--green)', sub: 'detected' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottleneck + Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ borderColor: bottlenecks.length > 0 ? 'rgba(255,71,87,0.25)' : 'rgba(0,230,118,0.25)' }}>
          <div className="card-header">
            <div className="card-title">⚠️ Bottleneck Detection</div>
            {bottlenecks.length === 0 && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>All clear!</span>}
          </div>
          {bottlenecks.length === 0 ? (
            <div style={{ padding: '12px 0', color: 'var(--green)', fontSize: 14, fontWeight: 600 }}>
              ✅ No bottlenecks detected this week. Keep it up!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bottlenecks.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: 8 }}>
                  <span>⚠️</span>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ borderColor: 'rgba(0,163,255,0.2)' }}>
          <div className="card-header">
            <div className="card-title">💡 Recommendations</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(0,163,255,0.06)', border: '1px solid rgba(0,163,255,0.15)', borderRadius: 8 }}>
                <span>💡</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily multi-metric */}
      <ReviewSection title="📊 Daily Activity — Last 14 Days">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
            <Legend wrapperStyle={{ color: 'var(--text-3)', fontSize: 11 }} />
            <Bar dataKey="Soccer" fill="var(--green)" radius={[2,2,0,0]} />
            <Bar dataKey="Fitness" fill="var(--red)" radius={[2,2,0,0]} />
            <Bar dataKey="Study" fill="var(--blue)" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ReviewSection>

      {/* Radar + Weekly XP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ReviewSection title="🎯 Weekly Category Balance">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 0, right: 24, bottom: 0, left: 24 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
              <Radar name="This Week" dataKey="A" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {catScores.map(({ category, score }) => (
              <div key={category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                  <span style={{ color: 'var(--text-3)' }}>{category}</span>
                  <span style={{ fontWeight: 700, color: score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : 'var(--red)' }}>{score}%</span>
                </div>
                <div className="progress-bar" style={{ height: 4 }}>
                  <div className="progress-fill" style={{ width: `${score}%`, background: score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : 'var(--red)' }} />
                </div>
              </div>
            ))}
          </div>
        </ReviewSection>

        <ReviewSection title="⚡ Monthly XP Trend">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyXP} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="xpMonthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--xp)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--xp)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
              <Area type="monotone" dataKey="xp" stroke="var(--xp)" strokeWidth={2} fill="url(#xpMonthGrad)" dot={{ fill: 'var(--xp)', r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ReviewSection>
      </div>

      {/* Sleep quality chart */}
      <ReviewSection title="🌙 Sleep Analysis — Last 14 Nights">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={sleepData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
            <Legend wrapperStyle={{ color: 'var(--text-3)', fontSize: 11 }} />
            <Line type="monotone" dataKey="hours" stroke="var(--purple)" strokeWidth={2} dot={false} name="Hours" />
            <Line type="monotone" dataKey="quality" stroke="var(--gold)" strokeWidth={2} dot={false} name="Quality" />
          </LineChart>
        </ResponsiveContainer>
      </ReviewSection>

      {/* Weekly snapshot comparison */}
      {weeklyComp.length > 0 && (
        <ReviewSection title="📅 Weekly Snapshot History">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyComp} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="week" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
              <Legend wrapperStyle={{ color: 'var(--text-3)', fontSize: 11 }} />
              <Bar dataKey="xp" fill="var(--xp)" radius={[4,4,0,0]} name="XP" />
              <Bar dataKey="discipline" fill="var(--cyan)" radius={[4,4,0,0]} name="Discipline %" />
            </BarChart>
          </ResponsiveContainer>
        </ReviewSection>
      )}

      {/* Weekly review summary */}
      <div className="card">
        <div className="card-header"><div className="card-title">📋 Weekly Review</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Soccer Sessions', value: soccer.sessions.filter(s => s.date >= last7).length, target: settings.soccerWeeklyTarget, unit: 'sessions', color: 'var(--green)' },
            { label: 'Workouts', value: fitness.workouts.filter(w => w.date >= last7).length, target: settings.fitnessWeeklyTarget, unit: 'workouts', color: 'var(--red)' },
            { label: 'Study Hours', value: parseFloat((school.sessions.filter(s => s.date >= last7).reduce((t, s) => t + s.duration, 0) / 60).toFixed(1)), target: settings.studyDailyTarget * 7, unit: 'h', color: 'var(--blue)' },
            { label: 'Pages Read', value: reading.entries.filter(r => r.date >= last7).reduce((t, r) => t + r.pagesRead, 0), target: settings.readingDailyTarget * 7, unit: 'pages', color: 'var(--gold)' },
            { label: 'Business Tasks', value: business.tasks.filter(b => b.date >= last7).length, target: settings.businessWeeklyTarget, unit: 'tasks', color: 'var(--orange)' },
            { label: 'Good Sleep Nights', value: sleep.entries.filter(s => s.date >= last7 && s.duration >= settings.sleepTarget - 0.5).length, target: 7, unit: 'nights', color: 'var(--purple)' },
          ].map(m => {
            const pct = Math.min((m.value / m.target) * 100, 100);
            return (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{m.label}</span>
                  <span style={{ fontWeight: 700, color: pct >= 100 ? 'var(--green)' : pct >= 60 ? m.color : 'var(--red)' }}>
                    {m.value}{m.unit === 'h' ? 'h' : m.unit === 'pages' ? 'p' : ''} / {m.target}{m.unit === 'h' ? 'h' : ''}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : m.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
