import type { Achievement } from '../types';

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Soccer
  { id: 'soccer-first', title: 'First Touch', description: 'Log your first soccer session', icon: '⚽', category: 'soccer', rarity: 'common', xpReward: 50, unlocked: false, condition: 'soccer_sessions >= 1' },
  { id: 'soccer-10', title: 'Regular Baller', description: 'Log 10 soccer sessions', icon: '🎽', category: 'soccer', rarity: 'common', xpReward: 100, unlocked: false, condition: 'soccer_sessions >= 10' },
  { id: 'soccer-50', title: 'Pitch Warrior', description: 'Log 50 soccer sessions', icon: '🏟️', category: 'soccer', rarity: 'rare', xpReward: 250, unlocked: false, condition: 'soccer_sessions >= 50' },
  { id: 'soccer-hattrick', title: 'Hat Trick', description: 'Score 3 goals in a single match', icon: '🎩', category: 'soccer', rarity: 'rare', xpReward: 200, unlocked: false, condition: 'match_goals >= 3' },
  { id: 'soccer-10assists', title: 'Playmaker', description: 'Record 10 total assists', icon: '🎯', category: 'soccer', rarity: 'rare', xpReward: 200, unlocked: false, condition: 'total_assists >= 10' },
  { id: 'soccer-100hrs', title: 'Training Machine', description: 'Log 100 hours of training', icon: '⏱️', category: 'soccer', rarity: 'epic', xpReward: 500, unlocked: false, condition: 'training_hours >= 100' },
  { id: 'soccer-weakfoot-50', title: 'Ambidextrous', description: 'Complete 50 weak foot sessions', icon: '🦶', category: 'soccer', rarity: 'epic', xpReward: 400, unlocked: false, condition: 'weak_foot_sessions >= 50' },
  { id: 'soccer-speed', title: 'Speed Demon', description: 'Log a speed test above 28 km/h', icon: '⚡', category: 'soccer', rarity: 'legendary', xpReward: 1000, unlocked: false, condition: 'speed_test >= 28' },
  { id: 'soccer-academy100', title: 'Academy Ready', description: 'Reach 100 Academy Readiness Score', icon: '🏆', category: 'soccer', rarity: 'legendary', xpReward: 1000, unlocked: false, condition: 'academy_score >= 100' },

  // Fitness
  { id: 'fitness-first', title: 'First Sweat', description: 'Log your first workout', icon: '💦', category: 'fitness', rarity: 'common', xpReward: 50, unlocked: false, condition: 'workouts >= 1' },
  { id: 'fitness-10', title: 'Getting Consistent', description: 'Log 10 workouts', icon: '🔄', category: 'fitness', rarity: 'common', xpReward: 100, unlocked: false, condition: 'workouts >= 10' },
  { id: 'fitness-7streak', title: 'Week Warrior', description: '7-day workout streak', icon: '🔥', category: 'fitness', rarity: 'rare', xpReward: 300, unlocked: false, condition: 'fitness_streak >= 7' },
  { id: 'fitness-50', title: 'Iron Body', description: 'Log 50 workouts', icon: '🏋️', category: 'fitness', rarity: 'epic', xpReward: 500, unlocked: false, condition: 'workouts >= 50' },
  { id: 'fitness-100', title: 'Beast Mode', description: 'Log 100 workouts', icon: '🦁', category: 'fitness', rarity: 'legendary', xpReward: 1000, unlocked: false, condition: 'workouts >= 100' },

  // Sleep
  { id: 'sleep-first', title: 'Logged It', description: 'Log your first sleep entry', icon: '🌙', category: 'sleep', rarity: 'common', xpReward: 30, unlocked: false, condition: 'sleep_entries >= 1' },
  { id: 'sleep-perfect5', title: 'Dream Streak', description: 'Log 8+ hours, quality 5, for 5 nights', icon: '⭐', category: 'sleep', rarity: 'rare', xpReward: 250, unlocked: false, condition: 'perfect_sleep_streak >= 5' },
  { id: 'sleep-30', title: 'Sleep Champion', description: 'Log sleep for 30 consecutive days', icon: '🌟', category: 'sleep', rarity: 'epic', xpReward: 500, unlocked: false, condition: 'sleep_streak >= 30' },

  // School
  { id: 'school-first', title: 'Student', description: 'Log your first study session', icon: '📝', category: 'school', rarity: 'common', xpReward: 50, unlocked: false, condition: 'study_sessions >= 1' },
  { id: 'school-50hrs', title: 'Scholar', description: 'Study for 50 total hours', icon: '📚', category: 'school', rarity: 'rare', xpReward: 300, unlocked: false, condition: 'study_hours >= 50' },
  { id: 'school-200hrs', title: 'Academic', description: 'Study for 200 total hours', icon: '🎓', category: 'school', rarity: 'epic', xpReward: 750, unlocked: false, condition: 'study_hours >= 200' },
  { id: 'school-500hrs', title: 'Genius', description: 'Study for 500 total hours', icon: '🧠', category: 'school', rarity: 'legendary', xpReward: 1500, unlocked: false, condition: 'study_hours >= 500' },

  // Reading
  { id: 'reading-first', title: 'First Page', description: 'Start your first reading entry', icon: '📄', category: 'reading', rarity: 'common', xpReward: 30, unlocked: false, condition: 'reading_entries >= 1' },
  { id: 'reading-book1', title: 'Bookworm', description: 'Finish your first book', icon: '📗', category: 'reading', rarity: 'common', xpReward: 150, unlocked: false, condition: 'books_finished >= 1' },
  { id: 'reading-book5', title: 'Avid Reader', description: 'Finish 5 books', icon: '📘', category: 'reading', rarity: 'rare', xpReward: 400, unlocked: false, condition: 'books_finished >= 5' },
  { id: 'reading-book20', title: 'Library', description: 'Finish 20 books', icon: '🏛️', category: 'reading', rarity: 'epic', xpReward: 1000, unlocked: false, condition: 'books_finished >= 20' },

  // Business
  { id: 'business-first', title: 'Entrepreneur Seed', description: 'Log your first business task', icon: '🌱', category: 'business', rarity: 'common', xpReward: 50, unlocked: false, condition: 'business_tasks >= 1' },
  { id: 'business-50', title: 'Hustler', description: 'Log 50 business tasks', icon: '💼', category: 'business', rarity: 'rare', xpReward: 300, unlocked: false, condition: 'business_tasks >= 50' },
  { id: 'business-200', title: 'CEO Mindset', description: 'Log 200 business tasks', icon: '🏢', category: 'business', rarity: 'epic', xpReward: 800, unlocked: false, condition: 'business_tasks >= 200' },

  // General / Streaks
  { id: 'general-7', title: 'Dedicated', description: '7-day overall activity streak', icon: '📅', category: 'general', rarity: 'common', xpReward: 100, unlocked: false, condition: 'overall_streak >= 7' },
  { id: 'general-30', title: 'Consistent', description: '30-day overall activity streak', icon: '🗓️', category: 'general', rarity: 'rare', xpReward: 500, unlocked: false, condition: 'overall_streak >= 30' },
  { id: 'general-90', title: 'Champion', description: '90-day overall activity streak', icon: '🥇', category: 'general', rarity: 'epic', xpReward: 1500, unlocked: false, condition: 'overall_streak >= 90' },
  { id: 'general-365', title: 'Legend', description: '365-day overall activity streak', icon: '👑', category: 'general', rarity: 'legendary', xpReward: 5000, unlocked: false, condition: 'overall_streak >= 365' },
  { id: 'general-level10', title: 'Rising Star', description: 'Reach Level 10', icon: '⭐', category: 'general', rarity: 'common', xpReward: 200, unlocked: false, condition: 'level >= 10' },
  { id: 'general-level25', title: 'Veteran', description: 'Reach Level 25', icon: '🌟', category: 'general', rarity: 'rare', xpReward: 500, unlocked: false, condition: 'level >= 25' },
  { id: 'general-level50', title: 'Legend Status', description: 'Reach Level 50', icon: '💫', category: 'general', rarity: 'legendary', xpReward: 2000, unlocked: false, condition: 'level >= 50' },
];

export const RARITY_COLORS: Record<string, string> = {
  common: '#8b8b8b',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
};

export const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(139, 139, 139, 0.3)',
  rare: 'rgba(0, 112, 221, 0.4)',
  epic: 'rgba(163, 53, 238, 0.4)',
  legendary: 'rgba(255, 128, 0, 0.5)',
};
