export interface UserProfile {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXP: number;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Legend';
  joinDate: string;
  avatar: string;
}

export interface Streaks {
  soccer: number;
  fitness: number;
  sleep: number;
  school: number;
  reading: number;
  business: number;
  discipline: number;
  deen: number;
  lastLogged: Record<string, string>;
}

// Soccer
export interface SoccerSession {
  id: string;
  date: string;
  type: 'training' | 'match';
  duration: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  rating: number;
  notes: string;
  xpGained: number;
}

export interface WeakFootSession {
  id: string;
  date: string;
  duration: number;
  exercises: string;
  notes: string;
}

export interface SpeedTest {
  id: string;
  date: string;
  distance: number;
  time: number;
  speed: number;
}

export interface HighlightVideo {
  id: string;
  date: string;
  title: string;
  platform: string;
  link: string;
  views: number;
  notes: string;
}

// Fitness
export interface WorkoutSession {
  id: string;
  date: string;
  type: string;
  duration: number;
  exercises: string;
  calories: number;
  notes: string;
  xpGained: number;
}

// Sleep
export interface SleepEntry {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  duration: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes: string;
  xpGained: number;
}

// School
export interface StudySession {
  id: string;
  date: string;
  subject: string;
  duration: number;
  type: 'homework' | 'revision' | 'project' | 'exam prep' | 'reading';
  grade?: string;
  notes: string;
  xpGained: number;
}

// Reading
export interface ReadingEntry {
  id: string;
  date: string;
  book: string;
  author: string;
  pagesRead: number;
  totalPages: number;
  notes: string;
  xpGained: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  pagesRead: number;
  startDate: string;
  finishDate?: string;
  status: 'reading' | 'completed' | 'paused';
  rating?: 1 | 2 | 3 | 4 | 5;
}

// Business
export interface BusinessTask {
  id: string;
  date: string;
  category: 'planning' | 'networking' | 'learning' | 'execution' | 'marketing' | 'finance' | 'other';
  title: string;
  description: string;
  duration: number;
  impact: 'low' | 'medium' | 'high';
  notes: string;
  xpGained: number;
}

// Deen
export type SalahName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
export type SalahStatus = 'on-time' | 'late' | 'missed';

export interface SalahEntry {
  id: string;
  date: string;
  prayer: SalahName;
  status: SalahStatus;
  xpGained: number;
}

export interface QuranEntry {
  id: string;
  date: string;
  pages: number;
  surah: string;
  notes: string;
  xpGained: number;
}

export interface DhikrEntry {
  id: string;
  date: string;
  type: 'morning' | 'evening' | 'custom';
  xpGained: number;
}

export interface FastEntry {
  id: string;
  date: string;
  type: 'monday' | 'thursday' | 'ayyam-beedh' | 'other';
  completed: boolean;
  xpGained: number;
}

// Routine
export interface RoutineEntry {
  id: string;
  date: string;
  blockId: string;
  xpGained: number;
}

// Discipline
export interface DisciplineGoal {
  id: string;
  title: string;
  category: string;
  icon: string;
  active: boolean;
}

export interface DisciplineEntry {
  id: string;
  date: string;
  goalId: string;
  achieved: boolean;
  notes: string;
  xpGained: number;
}

// Quests
export type QuestType = 'daily' | 'weekly' | 'monthly';
export type QuestCategory = 'soccer' | 'fitness' | 'sleep' | 'school' | 'reading' | 'business' | 'discipline' | 'general';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  category: QuestCategory;
  icon: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  completedDate?: string;
  expiresAt: string;
}

// Achievements
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: QuestCategory | 'general';
  rarity: AchievementRarity;
  xpReward: number;
  unlocked: boolean;
  unlockedDate?: string;
  condition: string;
}

// Skill Tree
export interface SkillNode {
  id: string;
  name: string;
  description: string;
  category: string;
  level: number;
  maxLevel: number;
  currentLevel: number;
  xpPerLevel: number;
  unlocked: boolean;
  prerequisites: string[];
  icon: string;
}

// Analytics
export interface WeeklySnapshot {
  weekStart: string;
  xpGained: number;
  soccerMinutes: number;
  workouts: number;
  sleepAvg: number;
  studyHours: number;
  pagesRead: number;
  businessTasks: number;
  disciplineScore: number;
  consistencyScore: number;
}

export interface Settings {
  playerName: string;
  soccerWeeklyTarget: number;
  fitnessWeeklyTarget: number;
  sleepTarget: number;
  studyDailyTarget: number;
  readingDailyTarget: number;
  businessWeeklyTarget: number;
  notifications: boolean;
  theme: 'dark';
  accentColor: string;
}
