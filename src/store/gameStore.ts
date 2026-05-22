import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, subDays, startOfWeek } from 'date-fns';
import type {
  UserProfile, Streaks, SoccerSession, WeakFootSession, SpeedTest, HighlightVideo,
  WorkoutSession, SleepEntry, StudySession, ReadingEntry, Book, BusinessTask,
  DisciplineGoal, DisciplineEntry, RoutineEntry, Quest, Achievement, SkillNode, WeeklySnapshot, Settings
} from '../types';
import { applyXP, calculateXPForLevel, getRankForLevel } from '../utils/xpSystem';
import { generateQuests, isQuestExpired } from '../utils/questSystem';
import { ALL_ACHIEVEMENTS } from '../utils/achievementSystem';

interface GameState {
  profile: UserProfile;
  streaks: Streaks;
  soccer: { sessions: SoccerSession[]; weakFoot: WeakFootSession[]; speedTests: SpeedTest[]; highlights: HighlightVideo[] };
  fitness: { workouts: WorkoutSession[] };
  sleep: { entries: SleepEntry[] };
  school: { sessions: StudySession[] };
  reading: { entries: ReadingEntry[]; books: Book[] };
  business: { tasks: BusinessTask[] };
  discipline: { goals: DisciplineGoal[]; entries: DisciplineEntry[] };
  routine: { log: RoutineEntry[] };
  quests: Quest[];
  achievements: Achievement[];
  skillNodes: SkillNode[];
  weeklySnapshots: WeeklySnapshot[];
  settings: Settings;
  activeTab: string;
  notifications: { id: string; message: string; type: 'xp' | 'achievement' | 'quest' | 'level'; timestamp: number }[];

  // Actions
  setActiveTab: (tab: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  addXP: (amount: number, source: string) => void;

  // Soccer
  addSoccerSession: (s: Omit<SoccerSession, 'id' | 'xpGained'>) => void;
  addWeakFootSession: (s: Omit<WeakFootSession, 'id'>) => void;
  addSpeedTest: (s: Omit<SpeedTest, 'id'>) => void;
  addHighlight: (h: Omit<HighlightVideo, 'id'>) => void;

  // Fitness
  addWorkout: (w: Omit<WorkoutSession, 'id' | 'xpGained'>) => void;

  // Sleep
  addSleepEntry: (s: Omit<SleepEntry, 'id' | 'xpGained'>) => void;

  // School
  addStudySession: (s: Omit<StudySession, 'id' | 'xpGained'>) => void;

  // Reading
  addReadingEntry: (r: Omit<ReadingEntry, 'id' | 'xpGained'>) => void;
  addBook: (b: Omit<Book, 'id'>) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;

  // Business
  addBusinessTask: (t: Omit<BusinessTask, 'id' | 'xpGained'>) => void;

  // Routine
  logRoutineBlock: (blockId: string, xp: number) => void;

  // Discipline
  addDisciplineGoal: (g: Omit<DisciplineGoal, 'id'>) => void;
  toggleDisciplineGoal: (id: string) => void;
  removeDisciplineGoal: (id: string) => void;
  resetDisciplineGoals: () => void;
  logDisciplineEntry: (e: Omit<DisciplineEntry, 'id' | 'xpGained'>) => void;

  // Quests & Achievements
  refreshQuests: () => void;
  checkAndUnlockAchievements: () => void;
  dismissNotification: (id: string) => void;

  // Snapshots
  saveWeeklySnapshot: () => void;
}

const DEFAULT_DISCIPLINE_GOALS: DisciplineGoal[] = [
  { id: 'dg-1', title: 'Healthy Eating', category: 'Nutrition', icon: '🥗', active: true },
  { id: 'dg-2', title: 'No Fap', category: 'Discipline', icon: '🛡️', active: true },
  { id: 'dg-3', title: 'Fajr On Time', category: 'Spiritual', icon: '🕌', active: true },
  { id: 'dg-4', title: 'Quran Reading', category: 'Spiritual', icon: '📖', active: true },
  { id: 'dg-5', title: 'Istighfar', category: 'Spiritual', icon: '🙏', active: true },
  { id: 'dg-6', title: 'Dhikr', category: 'Spiritual', icon: '📿', active: true },
];

const DEFAULT_SKILL_NODES: SkillNode[] = [
  // Soccer
  { id: 'sk-s1', name: 'Ball Control', description: 'Master close control and touch', category: 'soccer', level: 1, maxLevel: 5, currentLevel: 0, xpPerLevel: 200, unlocked: true, prerequisites: [], icon: '⚽' },
  { id: 'sk-s2', name: 'Passing', description: 'Short and long-range passing accuracy', category: 'soccer', level: 2, maxLevel: 5, currentLevel: 0, xpPerLevel: 300, unlocked: false, prerequisites: ['sk-s1'], icon: '🎯' },
  { id: 'sk-s3', name: 'Shooting', description: 'Power, placement and finishing', category: 'soccer', level: 2, maxLevel: 5, currentLevel: 0, xpPerLevel: 300, unlocked: false, prerequisites: ['sk-s1'], icon: '🥅' },
  { id: 'sk-s4', name: 'Dribbling', description: 'Speed dribbling and skill moves', category: 'soccer', level: 3, maxLevel: 5, currentLevel: 0, xpPerLevel: 400, unlocked: false, prerequisites: ['sk-s2'], icon: '🌀' },
  { id: 'sk-s5', name: 'Vision', description: 'Reading the game and finding space', category: 'soccer', level: 4, maxLevel: 5, currentLevel: 0, xpPerLevel: 600, unlocked: false, prerequisites: ['sk-s4'], icon: '👁️' },
  // Fitness
  { id: 'sk-f1', name: 'Endurance', description: 'Cardiovascular base and stamina', category: 'fitness', level: 1, maxLevel: 5, currentLevel: 0, xpPerLevel: 200, unlocked: true, prerequisites: [], icon: '🏃' },
  { id: 'sk-f2', name: 'Strength', description: 'Core and functional strength', category: 'fitness', level: 2, maxLevel: 5, currentLevel: 0, xpPerLevel: 300, unlocked: false, prerequisites: ['sk-f1'], icon: '🏋️' },
  { id: 'sk-f3', name: 'Speed', description: 'Explosiveness and sprint training', category: 'fitness', level: 3, maxLevel: 5, currentLevel: 0, xpPerLevel: 400, unlocked: false, prerequisites: ['sk-f2'], icon: '⚡' },
  { id: 'sk-f4', name: 'Athletic', description: 'Elite athletic conditioning', category: 'fitness', level: 4, maxLevel: 5, currentLevel: 0, xpPerLevel: 600, unlocked: false, prerequisites: ['sk-f3'], icon: '🥇' },
  // Mental
  { id: 'sk-m1', name: 'Focus', description: 'Deep work and concentration', category: 'school', level: 1, maxLevel: 5, currentLevel: 0, xpPerLevel: 200, unlocked: true, prerequisites: [], icon: '🎯' },
  { id: 'sk-m2', name: 'Memory', description: 'Retention and recall techniques', category: 'school', level: 2, maxLevel: 5, currentLevel: 0, xpPerLevel: 300, unlocked: false, prerequisites: ['sk-m1'], icon: '🧠' },
  { id: 'sk-m3', name: 'Critical Thinking', description: 'Analysis and problem solving', category: 'school', level: 3, maxLevel: 5, currentLevel: 0, xpPerLevel: 500, unlocked: false, prerequisites: ['sk-m2'], icon: '💡' },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function updateStreak(streaks: Streaks, category: keyof Omit<Streaks, 'lastLogged'>): Streaks {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const last = streaks.lastLogged[category];

  if (last === today) return streaks;

  const newCount = last === yesterday ? streaks[category] + 1 : 1;
  return {
    ...streaks,
    [category]: newCount,
    lastLogged: { ...streaks.lastLogged, [category]: today },
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: {
        name: 'Player',
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        totalXP: 0,
        rank: 'Bronze',
        joinDate: format(new Date(), 'yyyy-MM-dd'),
        avatar: '⚡',
      },
      streaks: {
        soccer: 0, fitness: 0, sleep: 0, school: 0,
        reading: 0, business: 0, discipline: 0,
        lastLogged: {},
      },
      soccer: { sessions: [], weakFoot: [], speedTests: [], highlights: [] },
      fitness: { workouts: [] },
      sleep: { entries: [] },
      school: { sessions: [] },
      reading: { entries: [], books: [] },
      business: { tasks: [] },
      discipline: { goals: DEFAULT_DISCIPLINE_GOALS, entries: [] },
      routine: { log: [] },
      quests: generateQuests(new Date()),
      achievements: ALL_ACHIEVEMENTS,
      skillNodes: DEFAULT_SKILL_NODES,
      weeklySnapshots: [],
      settings: {
        playerName: 'Player',
        soccerWeeklyTarget: 5,
        fitnessWeeklyTarget: 4,
        sleepTarget: 8,
        studyDailyTarget: 2,
        readingDailyTarget: 30,
        businessWeeklyTarget: 5,
        notifications: true,
        theme: 'dark',
        accentColor: '#f4c542',
      },
      activeTab: 'dashboard',
      notifications: [],

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateSettings: (s) => set(state => ({
        settings: { ...state.settings, ...s },
        profile: s.playerName ? { ...state.profile, name: s.playerName } : state.profile,
      })),

      addXP: (amount, _source) => set(state => {
        const newProfile = applyXP(state.profile, amount);
        const leveled = newProfile.level > state.profile.level;
        const notif = leveled ? [{
          id: uid(), message: `LEVEL UP! You're now Level ${newProfile.level}!`, type: 'level' as const, timestamp: Date.now()
        }] : [];
        return { profile: newProfile, notifications: [...state.notifications, ...notif] };
      }),

      addSoccerSession: (s) => set(state => {
        const xp = Math.round(
          (s.duration / 60) * (s.type === 'training' ? 50 : 75) +
          s.goals * 15 + s.assists * 10
        );
        const session: SoccerSession = { ...s, id: uid(), xpGained: xp };
        const newProfile = applyXP(state.profile, xp);
        const newStreaks = updateStreak(state.streaks, 'soccer');
        const notif = { id: uid(), message: `+${xp} XP — Soccer session logged!`, type: 'xp' as const, timestamp: Date.now() };
        return {
          soccer: { ...state.soccer, sessions: [...state.soccer.sessions, session] },
          profile: newProfile,
          streaks: newStreaks,
          notifications: [...state.notifications, notif],
        };
      }),

      addWeakFootSession: (s) => set(state => ({
        soccer: { ...state.soccer, weakFoot: [...state.soccer.weakFoot, { ...s, id: uid() }] },
      })),

      addSpeedTest: (s) => set(state => ({
        soccer: { ...state.soccer, speedTests: [...state.soccer.speedTests, { ...s, id: uid() }] },
      })),

      addHighlight: (h) => set(state => ({
        soccer: { ...state.soccer, highlights: [...state.soccer.highlights, { ...h, id: uid() }] },
      })),

      addWorkout: (w) => set(state => {
        const xp = w.duration >= 60 ? 70 : 45;
        const workout: WorkoutSession = { ...w, id: uid(), xpGained: xp };
        const newProfile = applyXP(state.profile, xp);
        const newStreaks = updateStreak(state.streaks, 'fitness');
        const notif = { id: uid(), message: `+${xp} XP — Workout complete!`, type: 'xp' as const, timestamp: Date.now() };
        return {
          fitness: { workouts: [...state.fitness.workouts, workout] },
          profile: newProfile,
          streaks: newStreaks,
          notifications: [...state.notifications, notif],
        };
      }),

      addSleepEntry: (s) => set(state => {
        const isPerfect = s.duration >= 7.5 && s.duration <= 9 && s.quality === 5;
        const xp = isPerfect ? 50 : s.duration >= 7 ? 30 : 5;
        const entry: SleepEntry = { ...s, id: uid(), xpGained: xp };
        const newProfile = applyXP(state.profile, xp);
        const newStreaks = updateStreak(state.streaks, 'sleep');
        return {
          sleep: { entries: [...state.sleep.entries, entry] },
          profile: newProfile,
          streaks: newStreaks,
        };
      }),

      addStudySession: (s) => set(state => {
        const xp = Math.round((s.duration / 60) * (s.type === 'exam prep' ? 50 : 35));
        const session: StudySession = { ...s, id: uid(), xpGained: xp };
        const newProfile = applyXP(state.profile, xp);
        const newStreaks = updateStreak(state.streaks, 'school');
        const notif = { id: uid(), message: `+${xp} XP — Study session logged!`, type: 'xp' as const, timestamp: Date.now() };
        return {
          school: { sessions: [...state.school.sessions, session] },
          profile: newProfile,
          streaks: newStreaks,
          notifications: [...state.notifications, notif],
        };
      }),

      addReadingEntry: (r) => set(state => {
        const xp = Math.round((r.pagesRead / 20) * 25);
        const entry: ReadingEntry = { ...r, id: uid(), xpGained: xp };
        const newProfile = applyXP(state.profile, xp);
        const newStreaks = updateStreak(state.streaks, 'reading');

        // Update book progress
        const updatedBooks = state.reading.books.map(b =>
          b.title === r.book
            ? { ...b, pagesRead: Math.min(b.pagesRead + r.pagesRead, b.totalPages), status: b.pagesRead + r.pagesRead >= b.totalPages ? 'completed' as const : b.status, finishDate: b.pagesRead + r.pagesRead >= b.totalPages ? r.date : b.finishDate }
            : b
        );
        return {
          reading: { ...state.reading, entries: [...state.reading.entries, entry], books: updatedBooks },
          profile: newProfile,
          streaks: newStreaks,
        };
      }),

      addBook: (b) => set(state => ({
        reading: { ...state.reading, books: [...state.reading.books, { ...b, id: uid() }] },
      })),

      updateBook: (id, updates) => set(state => ({
        reading: {
          ...state.reading,
          books: state.reading.books.map(b => b.id === id ? { ...b, ...updates } : b),
        },
      })),

      addBusinessTask: (t) => set(state => {
        const xp = t.impact === 'high' ? 65 : t.impact === 'medium' ? 45 : 25;
        const task: BusinessTask = { ...t, id: uid(), xpGained: xp };
        const newProfile = applyXP(state.profile, xp);
        const newStreaks = updateStreak(state.streaks, 'business');
        return {
          business: { tasks: [...state.business.tasks, task] },
          profile: newProfile,
          streaks: newStreaks,
        };
      }),

      addDisciplineGoal: (g) => set(state => ({
        discipline: { ...state.discipline, goals: [...state.discipline.goals, { ...g, id: uid() }] },
      })),

      toggleDisciplineGoal: (id) => set(state => ({
        discipline: {
          ...state.discipline,
          goals: state.discipline.goals.map(g => g.id === id ? { ...g, active: !g.active } : g),
        },
      })),

      removeDisciplineGoal: (id) => set(state => ({
        discipline: {
          ...state.discipline,
          goals: state.discipline.goals.filter(g => g.id !== id),
        },
      })),

      resetDisciplineGoals: () => set(state => ({
        discipline: { ...state.discipline, goals: DEFAULT_DISCIPLINE_GOALS },
      })),

      logRoutineBlock: (blockId, xp) => set(state => {
        const today = format(new Date(), 'yyyy-MM-dd');
        if (state.routine.log.some(l => l.date === today && l.blockId === blockId)) return state;
        const entry: RoutineEntry = { id: uid(), date: today, blockId, xpGained: xp };
        const newProfile = applyXP(state.profile, xp);
        const leveled = newProfile.level > state.profile.level;
        const notifs = [
          { id: uid(), message: `+${xp} XP — Routine block done! 🔥`, type: 'xp' as const, timestamp: Date.now() },
          ...(leveled ? [{ id: uid(), message: `LEVEL UP! You're now Level ${newProfile.level}!`, type: 'level' as const, timestamp: Date.now() }] : []),
        ];
        return {
          routine: { log: [...state.routine.log, entry] },
          profile: newProfile,
          notifications: [...state.notifications, ...notifs],
        };
      }),

      logDisciplineEntry: (e) => set(state => {
        const xp = e.achieved ? 20 : 0;
        const entry: DisciplineEntry = { ...e, id: uid(), xpGained: xp };
        const newProfile = xp > 0 ? applyXP(state.profile, xp) : state.profile;

        // Check if all goals met today
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayEntries = [...state.discipline.entries.filter(en => en.date === today && en.id !== entry.id), entry];
        const activeGoals = state.discipline.goals.filter(g => g.active);
        const allMet = activeGoals.every(g => todayEntries.find(en => en.goalId === g.id && en.achieved));
        const bonusXP = allMet ? 50 : 0;
        const finalProfile = bonusXP > 0 ? applyXP(newProfile, bonusXP) : newProfile;
        const newStreaks = allMet ? updateStreak(state.streaks, 'discipline') : state.streaks;

        return {
          discipline: { ...state.discipline, entries: [...state.discipline.entries, entry] },
          profile: finalProfile,
          streaks: newStreaks,
        };
      }),

      refreshQuests: () => set(state => {
        const active = state.quests.filter(q => !isQuestExpired(q));
        const existing = new Set(active.map(q => q.id));
        const fresh = generateQuests(new Date()).filter(q => !existing.has(q.id));
        return { quests: [...active, ...fresh] };
      }),

      checkAndUnlockAchievements: () => set(state => {
        const { soccer, fitness, sleep, school, reading, business, discipline, streaks, profile } = state;
        const totalTrainingHours = soccer.sessions.filter(s => s.type === 'training').reduce((t, s) => t + s.duration / 60, 0);
        const totalAssists = soccer.sessions.reduce((t, s) => t + s.assists, 0);
        const totalStudyHours = school.sessions.reduce((t, s) => t + s.duration / 60, 0);
        const booksFinished = reading.books.filter(b => b.status === 'completed').length;

        const conditions: Record<string, boolean> = {
          'soccer-first': soccer.sessions.length >= 1,
          'soccer-10': soccer.sessions.length >= 10,
          'soccer-50': soccer.sessions.length >= 50,
          'soccer-hattrick': soccer.sessions.some(s => s.goals >= 3),
          'soccer-10assists': totalAssists >= 10,
          'soccer-100hrs': totalTrainingHours >= 100,
          'soccer-weakfoot-50': soccer.weakFoot.length >= 50,
          'soccer-speed': soccer.speedTests.some(t => t.speed >= 28),
          'fitness-first': fitness.workouts.length >= 1,
          'fitness-10': fitness.workouts.length >= 10,
          'fitness-7streak': streaks.fitness >= 7,
          'fitness-50': fitness.workouts.length >= 50,
          'fitness-100': fitness.workouts.length >= 100,
          'sleep-first': sleep.entries.length >= 1,
          'sleep-30': streaks.sleep >= 30,
          'school-first': school.sessions.length >= 1,
          'school-50hrs': totalStudyHours >= 50,
          'school-200hrs': totalStudyHours >= 200,
          'school-500hrs': totalStudyHours >= 500,
          'reading-first': reading.entries.length >= 1,
          'reading-book1': booksFinished >= 1,
          'reading-book5': booksFinished >= 5,
          'reading-book20': booksFinished >= 20,
          'business-first': business.tasks.length >= 1,
          'business-50': business.tasks.length >= 50,
          'business-200': business.tasks.length >= 200,
          'general-7': streaks.soccer >= 7 || streaks.fitness >= 7 || streaks.school >= 7,
          'general-30': streaks.soccer >= 30 || streaks.fitness >= 30,
          'general-90': streaks.soccer >= 90,
          'general-level10': profile.level >= 10,
          'general-level25': profile.level >= 25,
          'general-level50': profile.level >= 50,
        };

        let newProfile = { ...profile };
        const newNotifications = [...state.notifications];

        const updatedAchievements = state.achievements.map(a => {
          if (!a.unlocked && conditions[a.id]) {
            newProfile = applyXP(newProfile, a.xpReward);
            newNotifications.push({
              id: uid(), message: `Achievement Unlocked: ${a.title}! +${a.xpReward} XP`, type: 'achievement', timestamp: Date.now()
            });
            return { ...a, unlocked: true, unlockedDate: format(new Date(), 'yyyy-MM-dd') };
          }
          return a;
        });

        return { achievements: updatedAchievements, profile: newProfile, notifications: newNotifications };
      }),

      dismissNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id),
      })),

      saveWeeklySnapshot: () => set(state => {
        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        if (state.weeklySnapshots.some(s => s.weekStart === weekStart)) return {};

        const last7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        const entries7d = <T extends { date: string }>(arr: T[]) => arr.filter(e => e.date >= last7);

        const xpGained = [
          ...entries7d(state.soccer.sessions).map(e => e.xpGained),
          ...entries7d(state.fitness.workouts).map(e => e.xpGained),
          ...entries7d(state.sleep.entries).map(e => e.xpGained),
          ...entries7d(state.school.sessions).map(e => e.xpGained),
          ...entries7d(state.reading.entries).map(e => e.xpGained),
          ...entries7d(state.business.tasks).map(e => e.xpGained),
        ].reduce((a, b) => a + b, 0);

        const soccerSessions7 = entries7d(state.soccer.sessions);
        const sleepEntries7 = entries7d(state.sleep.entries);
        const disciplineEntries7 = entries7d(state.discipline.entries);
        const activeGoals = state.discipline.goals.filter(g => g.active).length;
        const disciplineAchieved = disciplineEntries7.filter(e => e.achieved).length;

        const snapshot: WeeklySnapshot = {
          weekStart,
          xpGained: typeof xpGained === 'number' ? xpGained : 0,
          soccerMinutes: soccerSessions7.reduce((t, s) => t + s.duration, 0),
          workouts: entries7d(state.fitness.workouts).length,
          sleepAvg: sleepEntries7.length ? sleepEntries7.reduce((t, s) => t + s.duration, 0) / sleepEntries7.length : 0,
          studyHours: entries7d(state.school.sessions).reduce((t, s) => t + s.duration / 60, 0),
          pagesRead: entries7d(state.reading.entries).reduce((t, r) => t + r.pagesRead, 0),
          businessTasks: entries7d(state.business.tasks).length,
          disciplineScore: activeGoals > 0 ? Math.round((disciplineAchieved / (activeGoals * 7)) * 100) : 0,
          consistencyScore: 0,
        };

        return { weeklySnapshots: [...state.weeklySnapshots, snapshot] };
      }),
    }),
    {
      name: 'levelup-storage',
      version: 2,
      migrate: (persistedState: any, fromVersion: number) => {
        if (fromVersion < 2) {
          // Replace old generic goals with the personal habit set
          persistedState.discipline = {
            ...(persistedState.discipline ?? { entries: [] }),
            goals: DEFAULT_DISCIPLINE_GOALS,
          };
        }
        return persistedState;
      },
    }
  )
);
