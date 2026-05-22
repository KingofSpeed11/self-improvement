import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

const SECTIONS = [
  { id: 'command-center', icon: '🏠', label: 'HOME' },
  { id: 'today',          icon: '🎯', label: 'TODAY' },
  { id: 'routine',        icon: '⏰', label: 'PLAN' },
  { id: 'leaderboard',   icon: '🏆', label: 'RANKS' },
  { id: 'soccer',        icon: '⚽', label: 'SOCCER',   streakKey: 'soccer' },
  { id: 'fitness',       icon: '💪', label: 'FITNESS',  streakKey: 'fitness' },
  { id: 'sleep',         icon: '🌙', label: 'SLEEP',    streakKey: 'sleep' },
  { id: 'school',        icon: '☀️', label: 'LEARN',    streakKey: 'school' },
  { id: 'reading',       icon: '📖', label: 'READING',  streakKey: 'reading' },
  { id: 'business',      icon: '💼', label: 'BIZ',      streakKey: 'business' },
  { id: 'discipline',    icon: '🎯', label: 'DISC',     streakKey: 'discipline' },
  { id: 'analytics',     icon: '📊', label: 'STATS' },
  { id: 'achievements',  icon: '🏅', label: 'BADGES' },
  { id: 'skills',        icon: '🌳', label: 'SKILLS' },
  { id: 'settings',      icon: '⚙️', label: 'CONFIG' },
] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Sidebar() {
  const { streaks } = useGameStore();
  const [active, setActive] = useState('command-center');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => scrollTo('command-center')}>⚡</div>
      <div className="sidebar-divider" />

      {SECTIONS.map(s => {
        const streak = 'streakKey' in s ? (streaks[s.streakKey as keyof typeof streaks] as number) : 0;
        const hasStreak = typeof streak === 'number' && streak > 0;

        return (
          <button
            key={s.id}
            className={`nav-btn ${active === s.id ? 'active' : ''}`}
            onClick={() => scrollTo(s.id)}
            title={s.label}
          >
            {hasStreak && <span className="nav-streak-dot" />}
            <span className="nav-icon">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
