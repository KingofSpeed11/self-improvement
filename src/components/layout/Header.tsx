import { useEffect } from 'react';
import { format } from 'date-fns';
import { useGameStore } from '../../store/gameStore';
import { getXPProgress, RANK_ICONS, getRankColor } from '../../utils/xpSystem';

export default function Header() {
  const { profile, streaks, notifications, dismissNotification, checkAndUnlockAchievements } = useGameStore();
  const progress = getXPProgress(profile);
  const rankColor = getRankColor(profile.rank);
  const overallStreak = Math.max(0, ...Object.values(streaks).filter(v => typeof v === 'number') as number[]);

  useEffect(() => { checkAndUnlockAchievements(); }, []);

  useEffect(() => {
    const timers = notifications.map(n => setTimeout(() => dismissNotification(n.id), 5000));
    return () => timers.forEach(clearTimeout);
  }, [notifications.length]);

  return (
    <>
      <header className="header">
        <div className="header-brand">LEVELUP</div>

        {/* XP Section */}
        <div className="header-xp-section">
          <div className="header-xp-row">
            <div className="header-level">
              <span className="level-pill">LV {profile.level}</span>
              <span style={{ fontSize: 11, color: rankColor, fontWeight: 700 }}>
                {RANK_ICONS[profile.rank]} {profile.rank}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {profile.xp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()} XP
            </span>
          </div>
          <div className="header-xp-track">
            <div className="header-xp-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Chips */}
        <div className="header-chips">
          {overallStreak > 0 && (
            <div className="header-chip">
              🔥 <strong>{overallStreak}</strong> day streak
            </div>
          )}
          <div className="header-chip">
            ⚡ <strong>{profile.totalXP.toLocaleString()}</strong> total XP
          </div>
          <div className="header-chip" style={{ color: 'var(--text-3)', fontSize: 11 }}>
            {format(new Date(), 'EEE d MMM')}
          </div>
        </div>
      </header>

      {/* Toast notifications */}
      <div className="notifications-area">
        {notifications.slice(-3).map(n => (
          <div key={n.id} className={`toast ${n.type}`} onClick={() => dismissNotification(n.id)}>
            <span className="toast-icon">
              {n.type === 'xp' ? '⚡' : n.type === 'achievement' ? '🏆' : n.type === 'level' ? '🌟' : '✅'}
            </span>
            <span className="toast-msg">{n.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
