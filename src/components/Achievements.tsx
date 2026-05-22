import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { RARITY_COLORS, RARITY_GLOW } from '../utils/achievementSystem';
import type { AchievementRarity } from '../types';

const RARITY_ORDER: AchievementRarity[] = ['legendary', 'epic', 'rare', 'common'];
const CATEGORY_FILTERS = ['all', 'soccer', 'fitness', 'sleep', 'school', 'reading', 'business', 'general'] as const;

export default function Achievements() {
  const { achievements } = useGameStore();
  const [filter, setFilter] = useState<typeof CATEGORY_FILTERS[number]>('all');
  const [rarityFilter, setRarityFilter] = useState<AchievementRarity | 'all'>('all');
  const [showLocked, setShowLocked] = useState(true);

  const filtered = useMemo(() => {
    return achievements
      .filter(a => filter === 'all' || a.category === filter)
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter)
      .filter(a => showLocked || a.unlocked)
      .sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      });
  }, [achievements, filter, rarityFilter, showLocked]);

  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const xpFromAchievements = achievements.filter(a => a.unlocked).reduce((t, a) => t + a.xpReward, 0);

  const byCat = useMemo(() => {
    const map: Record<string, { unlocked: number; total: number }> = {};
    achievements.forEach(a => {
      if (!map[a.category]) map[a.category] = { unlocked: 0, total: 0 };
      map[a.category].total++;
      if (a.unlocked) map[a.category].unlocked++;
    });
    return map;
  }, [achievements]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview */}
      <div className="card card-glow-gold">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{unlocked}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>of {total} unlocked</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-3)' }}>
              XP earned from achievements: <span style={{ color: 'var(--xp)', fontWeight: 700 }}>+{xpFromAchievements.toLocaleString()}</span>
            </div>
            <div className="progress-bar" style={{ height: 14 }}>
              <div className="progress-fill" style={{ width: `${(unlocked / total) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--orange))' }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>{Math.round((unlocked / total) * 100)}% complete</div>
          </div>

          {/* Rarity breakdown */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {RARITY_ORDER.map(rarity => {
              const rarityAchs = achievements.filter(a => a.rarity === rarity);
              const unlockedRarity = rarityAchs.filter(a => a.unlocked).length;
              return (
                <div key={rarity} style={{ textAlign: 'center', padding: '8px 12px', background: `${RARITY_GLOW[rarity].replace(')', ', 0.08)').replace('rgba', 'rgba')}`, borderRadius: 10, border: `1px solid ${RARITY_COLORS[rarity]}33`, minWidth: 70 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: RARITY_COLORS[rarity] }}>{unlockedRarity}/{rarityAchs.length}</div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: RARITY_COLORS[rarity], fontWeight: 700 }}>{rarity}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {Object.entries(byCat).map(([cat, { unlocked: u, total: t }]) => (
          <div key={cat} className="stat-card" onClick={() => setFilter(cat as any)}
            style={{ cursor: 'pointer', '--accent': 'var(--gold)' } as React.CSSProperties}>
            <div className="stat-card-label" style={{ textTransform: 'capitalize' }}>{cat}</div>
            <div className="stat-card-value" style={{ fontSize: 20 }}>{u}/{t}</div>
            <div className="progress-bar" style={{ height: 4, marginTop: 8 }}>
              <div className="progress-fill" style={{ width: `${(u / t) * 100}%`, background: 'var(--gold)' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CATEGORY_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', ...RARITY_ORDER] as const).map(r => (
            <button key={r} onClick={() => setRarityFilter(r)}
              className={`btn btn-sm ${rarityFilter === r ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: r !== 'all' ? RARITY_COLORS[r as AchievementRarity] : undefined, textTransform: 'capitalize' }}>{r}</button>
          ))}
        </div>
        <button className={`btn btn-sm ${showLocked ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setShowLocked(!showLocked)}>
          {showLocked ? '🔒 Hide Locked' : '🔒 Show Locked'}
        </button>
      </div>

      {/* Achievement grid */}
      <div className="achievement-grid">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-title">No achievements match this filter</div>
          </div>
        ) : filtered.map(a => (
          <div key={a.id}
            className={`achievement-card ${a.unlocked ? 'unlocked' : 'locked'}`}
            style={{
              boxShadow: a.unlocked ? `0 0 16px ${RARITY_GLOW[a.rarity]}` : 'none',
              borderColor: a.unlocked ? RARITY_COLORS[a.rarity] + '44' : 'var(--border)',
            }}>
            <div className={`achievement-icon-wrap rarity-${a.rarity}`} style={{
              boxShadow: a.unlocked ? `0 0 12px ${RARITY_GLOW[a.rarity]}` : 'none',
            }}>
              <span>{a.icon}</span>
            </div>
            <div className="achievement-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span className="achievement-title">{a.title}</span>
                <span className="rarity-tag" style={{ background: `${RARITY_COLORS[a.rarity]}18`, color: RARITY_COLORS[a.rarity], fontSize: 9 }}>
                  {a.rarity}
                </span>
              </div>
              <div className="achievement-desc">{a.description}</div>
              <div className="achievement-xp">⚡ +{a.xpReward} XP</div>
              {a.unlocked && a.unlockedDate && (
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>Unlocked {a.unlockedDate}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
