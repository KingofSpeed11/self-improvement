import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { format } from 'date-fns';

export default function Settings() {
  const { settings, updateSettings, profile, saveWeeklySnapshot } = useGameStore();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...settings, playerName: profile.name });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportData() {
    const store = useGameStore.getState();
    const data = JSON.stringify(store, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `levelup-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // Restore to localStorage directly
        localStorage.setItem('levelup-storage', JSON.stringify({ state: data, version: 1 }));
        window.location.reload();
      } catch {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (confirm('⚠️ This will permanently delete ALL your data. Are you sure?')) {
      localStorage.removeItem('levelup-storage');
      window.location.reload();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      <form onSubmit={handleSave}>
        {/* Profile */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">👤 Profile</div></div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Player Name</label>
              <input type="text" className="form-input" value={form.playerName} onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Weekly Targets */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">🎯 Weekly & Daily Targets</div></div>
          <div className="form-grid form-grid-3">
            {[
              { label: 'Soccer Sessions / Week', key: 'soccerWeeklyTarget', min: 1, max: 14, icon: '⚽' },
              { label: 'Workouts / Week', key: 'fitnessWeeklyTarget', min: 1, max: 14, icon: '💪' },
              { label: 'Business Tasks / Week', key: 'businessWeeklyTarget', min: 1, max: 30, icon: '💼' },
            ].map(({ label, key, min, max, icon }) => (
              <div key={key} className="form-group">
                <label className="form-label">{icon} {label}</label>
                <input
                  type="number" min={min} max={max}
                  className="form-input"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || min }))}
                />
              </div>
            ))}
            {[
              { label: 'Sleep Target (hours)', key: 'sleepTarget', min: 5, max: 12, step: 0.5, icon: '🌙' },
              { label: 'Study Target (hours/day)', key: 'studyDailyTarget', min: 0.5, max: 12, step: 0.5, icon: '📚' },
              { label: 'Reading Target (pages/day)', key: 'readingDailyTarget', min: 5, max: 200, step: 5, icon: '📖' },
            ].map(({ label, key, min, max, step, icon }) => (
              <div key={key} className="form-group">
                <label className="form-label">{icon} {label}</label>
                <input
                  type="number" min={min} max={max} step={step ?? 1}
                  className="form-input"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || min }))}
                />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginBottom: 20 }}>
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </form>

      {/* Stats snapshot */}
      <div className="card">
        <div className="card-header"><div className="card-title">📊 Save Weekly Snapshot</div></div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
          Save this week's stats for the personal leaderboard. This happens automatically each week, but you can trigger it manually.
        </p>
        <button className="btn btn-secondary" onClick={() => saveWeeklySnapshot()}>
          📅 Save Snapshot Now
        </button>
      </div>

      {/* Data management */}
      <div className="card">
        <div className="card-header"><div className="card-title">💾 Data Management</div></div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
          All data is stored locally in your browser. Export a backup to save your progress.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={exportData}>
            📤 Export Backup
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            📥 Import Backup
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
          </label>
          <button className="btn btn-danger" onClick={clearAllData}>
            🗑️ Clear All Data
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card" style={{ borderColor: 'rgba(244,197,66,0.15)', background: 'rgba(244,197,66,0.02)' }}>
        <div className="card-header"><div className="card-title">⚡ About LevelUp</div></div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.8 }}>
          <p>LevelUp is a gamified self-improvement tracker built to help you stay consistent across Soccer, Fitness, Sleep, School, Reading, Business, and Discipline.</p>
          <br />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            {[
              ['Version', '1.0.0'],
              ['Player', profile.name],
              ['Level', String(profile.level)],
              ['Rank', profile.rank],
              ['Total XP', profile.totalXP.toLocaleString()],
              ['Joined', profile.joinDate],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-3)', borderRadius: 6 }}>
                <span style={{ color: 'var(--text-3)' }}>{label}</span>
                <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
