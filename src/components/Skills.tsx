import { useGameStore } from '../store/gameStore';

const TREE_LAYOUTS: Record<string, { rows: string[][] }> = {
  soccer: {
    rows: [
      ['sk-s1'],
      ['sk-s2', 'sk-s3'],
      ['sk-s4'],
      ['sk-s5'],
    ],
  },
  fitness: {
    rows: [
      ['sk-f1'],
      ['sk-f2'],
      ['sk-f3'],
      ['sk-f4'],
    ],
  },
  school: {
    rows: [
      ['sk-m1'],
      ['sk-m2'],
      ['sk-m3'],
    ],
  },
};

const CAT_COLORS: Record<string, string> = {
  soccer: 'var(--green)',
  fitness: 'var(--red)',
  school: 'var(--blue)',
};

const CAT_LABELS: Record<string, string> = {
  soccer: '⚽ Soccer Tree',
  fitness: '💪 Fitness Tree',
  school: '🧠 Mental Tree',
};

export default function Skills() {
  const { skillNodes, profile } = useGameStore();

  const categories = ['soccer', 'fitness', 'school'] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Info banner */}
      <div className="card card-glow-gold">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 40 }}>🌳</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Skill Trees</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 600 }}>
              Skill nodes unlock automatically as you level up and log activity. Each node has {5} levels. Progress by consistently training in the relevant area.
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'var(--gold)' }}>
              {skillNodes.filter(n => n.currentLevel > 0).length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>nodes active</div>
          </div>
        </div>
      </div>

      {/* Trees */}
      {categories.map(cat => {
        const layout = TREE_LAYOUTS[cat];
        const catColor = CAT_COLORS[cat];

        return (
          <div key={cat} className="card" style={{ borderColor: catColor + '33' }}>
            <div className="card-header">
              <div className="card-title" style={{ color: catColor }}>{CAT_LABELS[cat]}</div>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                {skillNodes.filter(n => n.category === cat && n.currentLevel > 0).length} / {skillNodes.filter(n => n.category === cat).length} nodes
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', padding: '8px 0' }}>
              {layout.rows.map((row, rowIdx) => (
                <div key={rowIdx} style={{ display: 'flex', gap: 20, justifyContent: 'center', width: '100%', position: 'relative' }}>
                  {/* Connector line (simplified) */}
                  {rowIdx > 0 && (
                    <div style={{
                      position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                      width: 2, height: 20, background: catColor + '44',
                    }} />
                  )}

                  {row.map(nodeId => {
                    const node = skillNodes.find(n => n.id === nodeId);
                    if (!node) return null;

                    const isUnlocked = node.unlocked || node.prerequisites.every(
                      prereqId => (skillNodes.find(n => n.id === prereqId)?.currentLevel ?? 0) > 0
                    );
                    const progress = (node.currentLevel / node.maxLevel) * 100;

                    return (
                      <div key={node.id}
                        className={`skill-node ${isUnlocked ? 'unlocked' : 'locked'}`}
                        style={{
                          width: 120,
                          borderColor: isUnlocked ? catColor : 'var(--border)',
                          boxShadow: isUnlocked ? `0 0 16px ${catColor}33` : 'none',
                        }}>
                        <span className="skill-node-icon">{node.icon}</span>
                        <div className="skill-node-name">{node.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6 }}>{node.description}</div>

                        {/* Level dots */}
                        <div className="skill-node-dots">
                          {Array.from({ length: node.maxLevel }, (_, i) => (
                            <div key={i} className={`skill-dot ${i < node.currentLevel ? 'filled' : ''}`}
                              style={i < node.currentLevel ? { background: catColor, borderColor: catColor, boxShadow: `0 0 4px ${catColor}88` } : {}} />
                          ))}
                        </div>

                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
                          Lv {node.currentLevel}/{node.maxLevel}
                        </div>

                        {/* Progress bar */}
                        <div className="progress-bar" style={{ height: 3, marginTop: 6 }}>
                          <div className="progress-fill" style={{ width: `${progress}%`, background: catColor }} />
                        </div>

                        {!isUnlocked && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                            <span style={{ fontSize: 20 }}>🔒</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* List view of unlocked nodes */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {skillNodes.filter(n => n.category === cat).map(node => (
                <div key={node.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8,
                  opacity: node.unlocked || node.currentLevel > 0 ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: 18 }}>{node.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{node.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{node.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: catColor }}>
                      Lv {node.currentLevel}/{node.maxLevel}
                    </div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', marginTop: 3 }}>
                      {Array.from({ length: node.maxLevel }, (_, i) => (
                        <div key={i} style={{
                          width: 12, height: 12, borderRadius: '50%',
                          background: i < node.currentLevel ? catColor : 'var(--bg-4)',
                          border: `1px solid ${i < node.currentLevel ? catColor : 'var(--border)'}`,
                          boxShadow: i < node.currentLevel ? `0 0 4px ${catColor}66` : 'none',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* How to progress note */}
      <div className="card" style={{ borderColor: 'rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.03)' }}>
        <div className="card-title" style={{ marginBottom: 12 }}>📖 How Skills Progress</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '⚽', label: 'Soccer skills', how: 'Log training & match sessions' },
            { icon: '💪', label: 'Fitness skills', how: 'Complete workouts consistently' },
            { icon: '🧠', label: 'Mental skills', how: 'Study sessions & reading' },
          ].map(item => (
            <div key={item.label} style={{ padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 10 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.how}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
