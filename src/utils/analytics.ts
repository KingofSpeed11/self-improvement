import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import type { SoccerSession, WorkoutSession, SleepEntry, StudySession, ReadingEntry, BusinessTask, DisciplineEntry, DisciplineGoal, SpeedTest, WeakFootSession } from '../types';

export function getConsistencyScore(
  entries: { date: string }[],
  days = 30
): number {
  const today = new Date();
  let active = 0;
  for (let i = 0; i < days; i++) {
    const d = format(subDays(today, i), 'yyyy-MM-dd');
    if (entries.some(e => e.date === d)) active++;
  }
  return Math.round((active / days) * 100);
}

export function getDisciplineScore(
  entries: DisciplineEntry[],
  goals: DisciplineGoal[],
  days = 7
): number {
  if (goals.filter(g => g.active).length === 0) return 0;
  const today = new Date();
  let totalPossible = 0;
  let achieved = 0;
  for (let i = 0; i < days; i++) {
    const d = format(subDays(today, i), 'yyyy-MM-dd');
    const dayEntries = entries.filter(e => e.date === d);
    const activeGoals = goals.filter(g => g.active);
    totalPossible += activeGoals.length;
    achieved += dayEntries.filter(e => e.achieved).length;
  }
  return totalPossible === 0 ? 0 : Math.round((achieved / totalPossible) * 100);
}

export function getAcademyReadinessScore(params: {
  soccerSessions: SoccerSession[];
  weakFootSessions: WeakFootSession[];
  speedTests: SpeedTest[];
  sleepEntries: SleepEntry[];
  disciplineScore: number;
  soccerWeeklyTarget: number;
}): number {
  const { soccerSessions, weakFootSessions, speedTests, sleepEntries, disciplineScore, soccerWeeklyTarget } = params;
  const last30 = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  // Training consistency (30%)
  const recentSessions = soccerSessions.filter(s => s.date >= last30);
  const weeklyAvg = recentSessions.length / 4.3;
  const trainingScore = Math.min((weeklyAvg / soccerWeeklyTarget) * 100, 100);

  // Technical skills (25%)
  const matches = recentSessions.filter(s => s.type === 'match');
  const totalGoals = matches.reduce((s, m) => s + m.goals, 0);
  const totalAssists = matches.reduce((s, m) => s + m.assists, 0);
  const techScore = matches.length === 0 ? 50 : Math.min(((totalGoals + totalAssists) / matches.length) * 25, 100);

  // Physical development (20%)
  const recentSpeed = speedTests.slice(-5);
  const speedImprovement = recentSpeed.length >= 2
    ? Math.min(((recentSpeed[recentSpeed.length - 1].speed - recentSpeed[0].speed) / recentSpeed[0].speed) * 200 + 60, 100)
    : 50;
  const weakFootScore = Math.min((weakFootSessions.filter(s => s.date >= last30).length / 12) * 100, 100);
  const physicalScore = (speedImprovement + weakFootScore) / 2;

  // Mental toughness (15%) - based on discipline
  const mentalScore = disciplineScore;

  // Professional habits (10%) - based on sleep
  const recentSleep = sleepEntries.filter(s => s.date >= last30);
  const avgSleep = recentSleep.length === 0 ? 7 : recentSleep.reduce((s, e) => s + e.duration, 0) / recentSleep.length;
  const sleepScore = avgSleep >= 7 && avgSleep <= 9 ? 100 : avgSleep >= 6 ? 60 : 30;

  return Math.round(
    trainingScore * 0.30 +
    techScore * 0.25 +
    physicalScore * 0.20 +
    mentalScore * 0.15 +
    sleepScore * 0.10
  );
}

export function getWeeklyXPHistory(snapshots: import('../types').WeeklySnapshot[]) {
  return snapshots.slice(-12).map(s => ({
    week: format(parseISO(s.weekStart), 'MMM d'),
    xp: s.xpGained,
  }));
}

export function getActivityHeatmap(entries: { date: string }[], days = 84) {
  const today = new Date();
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(today, i), 'yyyy-MM-dd');
    result.push({ date: d, count: entries.filter(e => e.date === d).length });
  }
  return result;
}

export function detectBottlenecks(params: {
  soccerSessions: SoccerSession[];
  workouts: WorkoutSession[];
  sleepEntries: SleepEntry[];
  studySessions: StudySession[];
  readingEntries: ReadingEntry[];
  businessTasks: BusinessTask[];
  disciplineEntries: DisciplineEntry[];
}): string[] {
  const last7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const bottlenecks: string[] = [];

  if (params.soccerSessions.filter(s => s.date >= last7).length < 2)
    bottlenecks.push('Soccer training is inconsistent — less than 2 sessions this week');
  if (params.workouts.filter(w => w.date >= last7).length < 2)
    bottlenecks.push('Fitness — missing workout consistency this week');

  const sleepWeek = params.sleepEntries.filter(s => s.date >= last7);
  if (sleepWeek.length > 0) {
    const avg = sleepWeek.reduce((s, e) => s + e.duration, 0) / sleepWeek.length;
    if (avg < 7) bottlenecks.push(`Sleep average is ${avg.toFixed(1)}h — below the 7h target`);
  }

  if (params.studySessions.filter(s => s.date >= last7).length < 3)
    bottlenecks.push('School — study sessions this week are below target');
  if (params.readingEntries.filter(r => r.date >= last7).length < 3)
    bottlenecks.push('Reading streak is at risk — less than 3 sessions this week');
  if (params.businessTasks.filter(b => b.date >= last7).length < 2)
    bottlenecks.push('Business — low activity this week');

  return bottlenecks;
}

export function getRecommendations(bottlenecks: string[], disciplineScore: number): string[] {
  const recs: string[] = [];
  if (disciplineScore < 60) recs.push('Focus on discipline — set 2-3 non-negotiable daily habits');
  if (bottlenecks.some(b => b.includes('Sleep'))) recs.push('Prioritise sleep — set a consistent bedtime alarm');
  if (bottlenecks.some(b => b.includes('Soccer'))) recs.push('Block 3 soccer training slots in your weekly calendar');
  if (bottlenecks.some(b => b.includes('Fitness'))) recs.push('Pair workouts with an existing habit to build consistency');
  if (bottlenecks.some(b => b.includes('Reading'))) recs.push('Read 10 pages every night before bed to maintain streak');
  if (recs.length === 0) recs.push('Great consistency! Push intensity in your weakest area this week');
  return recs;
}

export function getSleepTrend(entries: SleepEntry[], days = 14) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = format(subDays(today, days - 1 - i), 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === d);
    return { date: format(subDays(today, days - 1 - i), 'MMM d'), hours: entry?.duration ?? null, quality: entry?.quality ?? null };
  });
}

export function getWeeklyStudyBySubject(sessions: StudySession[]) {
  const last7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const recent = sessions.filter(s => s.date >= last7);
  const map: Record<string, number> = {};
  recent.forEach(s => { map[s.subject] = (map[s.subject] ?? 0) + s.duration / 60; });
  return Object.entries(map).map(([subject, hours]) => ({ subject, hours: parseFloat(hours.toFixed(1)) }));
}
