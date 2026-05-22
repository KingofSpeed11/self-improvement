import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useGameStore } from '../store/gameStore';
import type { Quest, QuestType } from '../types';

const TYPE_COLORS: Record<QuestType, string> = {
  daily: 'var(--green)',
  weekly: 'var(--blue)',
  monthly: 'var(--gold)',
};

const CAT_ICONS: Record<string, string> = {
  soccer: '⚽', fitness: '💪', sleep: '🌙', school: '📚',
  reading: '📖', business: '💼', discipline: '🎯', general: '⚡',
};

function QuestCard({ quest }: { quest: Quest }) {
  const pct = Math.min((quest.current / quest.target) * 100, 100);
  const timeLeft = formatDistanceToNow(new Date(quest.expiresAt), { addSuffix: true });
  const color = TYPE_COLORS[quest.type];

  return (
    <div className={`quest-card ${quest.completed ? 'completed' : ''}`}
      style={{ borderLeft: `3px solid ${quest.completed ? 'var(--green)' : color}` }}>
      <div className="quest-icon-wrap" style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
        <span style={{ fontSize: 22 }}>{quest.icon}</span>
      </div>
      <div className="quest-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span className="quest-title">{quest.title}</span>
          {quest.completed && <span style={{ fontSize: 16 }}>✅</span>}
        </div>
        <div className="quest-desc">{quest.description}</div>
        <div className="quest-progress-row">
          <div className="progress-bar" style={{ flex: 1, height: 6 }}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: quest.completed ? 'var(--green)' : color }} />
          </div>
          <span className="quest-progress-text">{quest.current}/{quest.target}</span>
          {!quest.completed && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>expires {timeLeft}</span>}
        </div>
      </div>
      <div className="quest-xp">⚡{quest.xpReward}</div>
    </div>
  );
}

export default function Quests() {
  const { quests, refreshQuests } = useGameStore();

  const { daily, weekly, monthly } = useMemo(() => {
    const active = quests.filter(q => !((new Date()) > new Date(q.expiresAt)));
    return {
      daily: active.filter(q => q.type === 'daily'),
      weekly: active.filter(q => q.type === 'weekly'),
      monthly: active.filter(q => q.type === 'monthly'),
    };
  }, [quests]);

  const totalXPAvailable = [...daily, ...weekly, ...monthly].filter(q => !q.completed).reduce((t, q) => t + q.xpReward, 0);
  const completedToday = daily.filter(q => q.completed).length;
  const completedWeekly = weekly.filter(q => q.completed).length;
  const completedMonthly = monthly.filter(q => q.completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {[
          { label: 'Daily Quests', value: `${completedToday}/${daily.length}`, icon: '🌅', accent: 'var(--green)' },
          { label: 'Weekly Quests', value: `${completedWeekly}/${weekly.length}`, icon: '📅', accent: 'var(--blue)' },
          { label: 'Monthly Quests', value: `${completedMonthly}/${monthly.length}`, icon: '🗓️', accent: 'var(--gold)' },
          { label: 'XP Available', value: totalXPAvailable, icon: '⚡', accent: 'var(--xp)', sub: 'to earn' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub || 'completed'}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={refreshQuests}>🔄 Refresh Quests</button>
      </div>

      {/* Daily */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🌅</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>Daily Quests</h2>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>Resets tomorrow</span>
        </div>
        {/* Daily progress bar */}
        <div style={{ marginBottom: 12 }}>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${daily.length > 0 ? (completedToday / daily.length) * 100 : 0}%`, background: 'var(--green)' }} />
          </div>
        </div>
        <div className="quest-grid">
          {daily.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🌅</div><div className="empty-state-title">No active daily quests</div></div>
          ) : (
            daily.map(q => <QuestCard key={q.id} quest={q} />)
          )}
        </div>
      </div>

      {/* Weekly */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--blue)' }}>Weekly Quests</h2>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>Resets Monday</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${weekly.length > 0 ? (completedWeekly / weekly.length) * 100 : 0}%`, background: 'var(--blue)' }} />
          </div>
        </div>
        <div className="quest-grid">
          {weekly.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">No active weekly quests</div></div>
          ) : (
            weekly.map(q => <QuestCard key={q.id} quest={q} />)
          )}
        </div>
      </div>

      {/* Monthly */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🗓️</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>Monthly Quests</h2>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>Resets 1st of month</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${monthly.length > 0 ? (completedMonthly / monthly.length) * 100 : 0}%`, background: 'var(--gold)' }} />
          </div>
        </div>
        <div className="quest-grid">
          {monthly.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🗓️</div><div className="empty-state-title">No active monthly quests</div></div>
          ) : (
            monthly.map(q => <QuestCard key={q.id} quest={q} />)
          )}
        </div>
      </div>
    </div>
  );
}
