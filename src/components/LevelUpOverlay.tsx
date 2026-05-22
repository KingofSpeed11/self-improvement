import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export default function LevelUpOverlay() {
  const { notifications, dismissNotification } = useGameStore();
  const levelNotif = notifications.find(n => n.type === 'level');
  const [show, setShow] = useState(false);
  const [level, setLevel] = useState('');

  useEffect(() => {
    if (levelNotif) {
      const match = levelNotif.message.match(/Level (\d+)/);
      if (match) { setLevel(match[1]); setShow(true); }
    }
  }, [levelNotif?.id]);

  if (!show || !levelNotif) return null;

  function close() {
    setShow(false);
    if (levelNotif) dismissNotification(levelNotif.id);
  }

  return (
    <div className="levelup-overlay" onClick={close}>
      {/* Confetti particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${5 + (i * 4.7) % 92}%`,
          top: `-20px`,
          width: `${6 + (i % 3) * 3}px`,
          height: `${6 + (i % 3) * 3}px`,
          borderRadius: i % 2 === 0 ? '50%' : '2px',
          background: ['var(--gold)', 'var(--xp)', 'var(--green)', 'var(--blue)', 'var(--orange)'][i % 5],
          animation: `confetti-fall ${1.5 + (i % 4) * 0.4}s ease-in ${(i % 6) * 0.15}s forwards`,
          pointerEvents: 'none',
        }} />
      ))}

      <div className="levelup-card" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, color: 'var(--gold)', fontFamily: 'var(--font-display)', letterSpacing: 3, marginBottom: 20 }}>
          LEVEL UP!
        </div>
        <div className="levelup-badge">{level}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>
          Level {level} Reached
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-3)', marginBottom: 32 }}>
          Keep pushing. The grind never stops. 🔥
        </div>
        <button className="btn btn-primary btn-xl" onClick={close}>
          CONTINUE ⚡
        </button>
      </div>
    </div>
  );
}
