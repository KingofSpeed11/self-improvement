import { useState } from 'react';
import { format } from 'date-fns';
import { useGameStore } from '../store/gameStore';
import { getDisciplineScore } from '../utils/analytics';

const GOAL_ICONS = ['🎯', '💪', '📵', '🌙', '🥗', '💧', '🧘', '📖', '🏃', '✍️', '🚫', '⏰', '🙏', '💊', '🛌'];

export default function Discipline() {
  const { discipline, addDisciplineGoal, toggleDisciplineGoal, removeDisciplineGoal, logDisciplineEntry, streaks } = useGameStore();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', category: '', icon: '🎯' });

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayEntries = discipline.entries.filter(e => e.date === today);
  const activeGoals = discipline.goals.filter(g => g.active);

  const disciplineScore = getDisciplineScore(discipline.entries, discipline.goals);

  // Last 7 days history
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = format(new Date(Date.now() - i * 86400000), 'yyyy-MM-dd');
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : format(new Date(Date.now() - i * 86400000), 'EEE');
    const dayEntries = discipline.entries.filter(e => e.date === d);
    const met = dayEntries.filter(e => e.achieved).length;
    const possible = activeGoals.length;
    return { date: d, label: dayLabel, met, possible, pct: possible > 0 ? Math.round((met / possible) * 100) : 0 };
  }).reverse();

  function toggleGoalForToday(goalId: string, currentlyAchieved: boolean) {
    const existing = todayEntries.find(e => e.goalId === goalId);
    if (existing) return; // Already logged today
    logDisciplineEntry({
      date: today,
      goalId,
      achieved: !currentlyAchieved,
      notes: '',
    });
  }

  function addGoal(e: React.FormEvent) {
    e.preventDefault();
    addDisciplineGoal({ title: goalForm.title, category: goalForm.category, icon: goalForm.icon, active: true });
    setGoalForm({ title: '', category: '', icon: '🎯' });
    setShowAddGoal(false);
  }

  const allMet = activeGoals.length > 0 && activeGoals.every(g => todayEntries.find(e => e.goalId === g.id && e.achieved));
  const donToday = activeGoals.filter(g => todayEntries.find(e => e.goalId === g.id && e.achieved)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Discipline Score', value: `${disciplineScore}%`, icon: '🎯', accent: 'var(--cyan)', sub: 'last 7 days' },
          { label: "Today's Goals", value: `${donToday}/${activeGoals.length}`, icon: '✅', accent: 'var(--green)', sub: 'completed' },
          { label: 'Streak', value: streaks.discipline, icon: '🔥', accent: 'var(--orange)', sub: 'days' },
          { label: 'Total Goals', value: discipline.goals.length, icon: '📋', accent: 'var(--blue)', sub: 'configured' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Today's checklist */}
      <div className="card card-glow-purple" style={{ background: allMet ? 'linear-gradient(135deg, var(--bg-2), rgba(0,230,118,0.05))' : 'var(--bg-2)' }}>
        <div className="card-header">
          <div className="card-title">
            {allMet ? '🎉 All Goals Smashed Today!' : `🎯 Today's Checklist`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{donToday}/{activeGoals.length}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddGoal(!showAddGoal)}>
              + Goal
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar" style={{ height: 10, marginBottom: 16 }}>
          <div className="progress-fill" style={{
            width: `${activeGoals.length > 0 ? (donToday / activeGoals.length) * 100 : 0}%`,
            background: allMet ? 'var(--green)' : 'linear-gradient(90deg, var(--cyan), var(--purple))',
          }} />
        </div>

        {activeGoals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No goals set</div>
            <div className="empty-state-desc">Add daily goals to track your discipline</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeGoals.map(goal => {
              const entry = todayEntries.find(e => e.goalId === goal.id);
              const achieved = entry?.achieved ?? false;
              const logged = !!entry;
              return (
                <div key={goal.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  background: achieved ? 'rgba(0,230,118,0.08)' : 'var(--bg-3)',
                  border: `1px solid ${achieved ? 'rgba(0,230,118,0.25)' : 'var(--border)'}`,
                  cursor: logged ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }} onClick={() => !logged && toggleGoalForToday(goal.id, achieved)}>
                  <span style={{ fontSize: 22 }}>{goal.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: achieved ? 'var(--green)' : 'var(--text-1)', textDecoration: achieved ? 'line-through' : 'none' }}>
                      {goal.title}
                    </div>
                    {goal.category && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{goal.category}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!logged && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>tap to log</span>}
                    <span style={{ fontSize: 22 }}>{achieved ? '✅' : '⭕'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add goal form */}
      {showAddGoal && (
        <div className="card">
          <div className="card-header"><div className="card-title">+ Add Discipline Goal</div></div>
          <form onSubmit={addGoal} className="form-grid">
            <div className="form-group">
              <label className="form-label">Goal Title</label>
              <input type="text" className="form-input" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} required placeholder="No social media before noon" />
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input type="text" className="form-input" value={goalForm.category} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))} placeholder="Mental, Physical, Sleep..." />
              </div>
              <div className="form-group">
                <label className="form-label">Icon</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: 8, background: 'var(--bg-3)', borderRadius: 10 }}>
                  {GOAL_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setGoalForm(f => ({ ...f, icon }))}
                      style={{ fontSize: 20, padding: 4, borderRadius: 6, border: goalForm.icon === icon ? '2px solid var(--gold)' : '2px solid transparent', background: 'none', cursor: 'pointer' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Goal</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddGoal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* 7-day heatmap */}
      <div className="card">
        <div className="card-header"><div className="card-title">📊 Last 7 Days</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {last7Days.map(day => (
            <div key={day.date} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{day.label}</div>
              <div style={{
                height: 60, borderRadius: 8,
                background: day.pct === 0 ? 'var(--bg-3)' : `rgba(0,229,255,${day.pct / 100 * 0.7 + 0.1})`,
                border: `1px solid ${day.pct === 100 ? 'var(--cyan)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: day.pct > 50 ? 'var(--text-1)' : 'var(--text-3)',
              }}>
                {day.possible > 0 ? `${day.pct}%` : '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{day.met}/{day.possible}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal management */}
      <div className="card">
        <div className="card-header"><div className="card-title">⚙️ Manage Goals</div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {discipline.goals.map(goal => (
            <div key={goal.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: goal.active ? 'var(--bg-3)' : 'rgba(0,0,0,0.2)',
              border: `1px solid ${goal.active ? 'var(--border)' : 'transparent'}`,
              opacity: goal.active ? 1 : 0.5,
            }}>
              <span style={{ fontSize: 18 }}>{goal.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{goal.title}</div>
                {goal.category && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{goal.category}</div>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleDisciplineGoal(goal.id)}>
                {goal.active ? 'Disable' : 'Enable'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => removeDisciplineGoal(goal.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
