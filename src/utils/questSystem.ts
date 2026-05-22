import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths } from 'date-fns';
import type { Quest } from '../types';

function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export const QUEST_TEMPLATES: Omit<Quest, 'id' | 'current' | 'completed' | 'completedDate' | 'expiresAt'>[] = [
  // Daily
  { title: 'Early Night', description: 'Log sleep before midnight', type: 'daily', category: 'sleep', icon: '🌙', target: 1, xpReward: 20 },
  { title: 'Touch the Ball', description: 'Log any soccer session', type: 'daily', category: 'soccer', icon: '⚽', target: 1, xpReward: 30 },
  { title: 'Grind Mode', description: 'Log a study session', type: 'daily', category: 'school', icon: '📚', target: 1, xpReward: 25 },
  { title: 'Page Turner', description: 'Read for at least 20 minutes', type: 'daily', category: 'reading', icon: '📖', target: 20, xpReward: 20 },
  { title: 'Sweat it Out', description: 'Complete a workout', type: 'daily', category: 'fitness', icon: '💪', target: 1, xpReward: 35 },
  { title: 'Business Time', description: 'Log a business task', type: 'daily', category: 'business', icon: '💼', target: 1, xpReward: 25 },
  { title: 'Discipline Check', description: 'Meet all your daily discipline goals', type: 'daily', category: 'discipline', icon: '🎯', target: 1, xpReward: 40 },

  // Weekly
  { title: 'Training Warrior', description: 'Log 5+ soccer sessions this week', type: 'weekly', category: 'soccer', icon: '🥅', target: 5, xpReward: 150 },
  { title: 'Fitness Grind', description: 'Complete 4+ workouts this week', type: 'weekly', category: 'fitness', icon: '🏋️', target: 4, xpReward: 120 },
  { title: 'Sleep Master', description: 'Log 7+ hours sleep 5 nights', type: 'weekly', category: 'sleep', icon: '😴', target: 5, xpReward: 100 },
  { title: 'Scholar Mode', description: 'Study for 10+ hours total', type: 'weekly', category: 'school', icon: '🎓', target: 600, xpReward: 130 },
  { title: 'Bookworm', description: 'Read on 5 different days', type: 'weekly', category: 'reading', icon: '📚', target: 5, xpReward: 90 },
  { title: 'Entrepreneur', description: 'Complete 5+ business tasks', type: 'weekly', category: 'business', icon: '🚀', target: 5, xpReward: 110 },
  { title: 'Iron Will', description: 'Hit discipline goals 7 days straight', type: 'weekly', category: 'discipline', icon: '🔥', target: 7, xpReward: 200 },

  // Monthly
  { title: 'Soccer Dedication', description: 'Log 20+ soccer sessions', type: 'monthly', category: 'soccer', icon: '⚽', target: 20, xpReward: 500 },
  { title: 'Fitness Champion', description: 'Complete 16+ workouts', type: 'monthly', category: 'fitness', icon: '🏆', target: 16, xpReward: 400 },
  { title: 'Sleep Optimised', description: 'Average 7.5+ hours for the month', type: 'monthly', category: 'sleep', icon: '💤', target: 1, xpReward: 350 },
  { title: 'Academic Excellence', description: 'Study 40+ hours this month', type: 'monthly', category: 'school', icon: '🏅', target: 2400, xpReward: 450 },
  { title: 'Literary Explorer', description: 'Read 200+ pages or finish a book', type: 'monthly', category: 'reading', icon: '📕', target: 200, xpReward: 300 },
  { title: 'Business Builder', description: 'Complete 20+ business tasks', type: 'monthly', category: 'business', icon: '💡', target: 20, xpReward: 400 },
  { title: 'Unbreakable', description: 'Meet discipline goals 25+ days', type: 'monthly', category: 'discipline', icon: '💎', target: 25, xpReward: 600 },
];

export function generateQuests(today: Date): Quest[] {
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekEnd = endOfDay(endOfWeek(today, { weekStartsOn: 1 }));
  const monthEnd = endOfDay(endOfMonth(today));

  return QUEST_TEMPLATES.map((template, i) => ({
    ...template,
    id: `${template.type}-${template.category}-${i}`,
    current: 0,
    completed: false,
    expiresAt: template.type === 'daily' ? endOfDay(today) : template.type === 'weekly' ? weekEnd : monthEnd,
  }));
}

export function isQuestExpired(quest: Quest): boolean {
  return new Date() > new Date(quest.expiresAt);
}
