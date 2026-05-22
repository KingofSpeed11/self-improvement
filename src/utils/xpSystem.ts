import type { UserProfile } from '../types';

export const XP_REWARDS = {
  soccer: {
    training: 50,     // per hour
    match: 75,        // per match
    goal: 15,         // per goal scored
    assist: 10,       // per assist
    weakFoot: 20,     // per session
    speedTest: 30,    // per test
  },
  fitness: {
    workout: 45,      // per session
    longWorkout: 70,  // 60+ min session
  },
  sleep: {
    good: 30,         // 7-9 hours
    perfect: 50,      // exactly 8 hours, quality 5
    poor: 5,          // under 6 hours
  },
  school: {
    study: 35,        // per hour
    examPrep: 50,     // per hour
  },
  reading: {
    session: 25,      // per 30 min
    bookFinished: 100,
  },
  business: {
    task: 40,
    highImpact: 65,
  },
  discipline: {
    goal: 20,         // per goal met
    allGoals: 50,     // bonus for meeting all
  },
};

export function calculateXPForLevel(level: number): number {
  if (level <= 5) return 100 * level;
  if (level <= 10) return 500 + 200 * (level - 5);
  if (level <= 20) return 1500 + 400 * (level - 10);
  if (level <= 30) return 5500 + 800 * (level - 20);
  return 13500 + 1500 * (level - 30);
}

export function getRankForLevel(level: number): UserProfile['rank'] {
  if (level >= 50) return 'Legend';
  if (level >= 40) return 'Diamond';
  if (level >= 30) return 'Platinum';
  if (level >= 20) return 'Gold';
  if (level >= 10) return 'Silver';
  return 'Bronze';
}

export function getRankColor(rank: UserProfile['rank']): string {
  switch (rank) {
    case 'Bronze': return '#cd7f32';
    case 'Silver': return '#c0c0c0';
    case 'Gold': return '#f4c542';
    case 'Platinum': return '#00e5ff';
    case 'Diamond': return '#b9f2ff';
    case 'Legend': return '#ff6b2b';
  }
}

export function applyXP(profile: UserProfile, amount: number): UserProfile {
  let { xp, level, totalXP } = profile;
  xp += amount;
  totalXP += amount;

  while (xp >= calculateXPForLevel(level)) {
    xp -= calculateXPForLevel(level);
    level += 1;
  }

  return {
    ...profile,
    xp,
    level,
    totalXP,
    xpToNextLevel: calculateXPForLevel(level),
    rank: getRankForLevel(level),
  };
}

export function getXPProgress(profile: UserProfile): number {
  return Math.min((profile.xp / profile.xpToNextLevel) * 100, 100);
}

export const RANK_ICONS: Record<UserProfile['rank'], string> = {
  Bronze: '🥉',
  Silver: '🥈',
  Gold: '🥇',
  Platinum: '💎',
  Diamond: '💠',
  Legend: '👑',
};
