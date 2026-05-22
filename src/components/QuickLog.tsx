import { useState, useEffect, useRef } from 'react';
import { format, differenceInMinutes, parse } from 'date-fns';
import { useGameStore } from '../store/gameStore';

type Category = 'soccer' | 'fitness' | 'sleep' | 'school' | 'reading' | 'business' | 'discipline';

const CATS: { id: Category; icon: string; label: string; color: string }[] = [
  { id: 'soccer',     icon: '⚽', label: 'Soccer',    color: 'var(--green)' },
  { id: 'fitness',    icon: '💪', label: 'Fitness',   color: 'var(--red)' },
  { id: 'sleep',      icon: '🌙', label: 'Sleep',     color: 'var(--purple)' },
  { id: 'school',     icon: '📚', label: 'School',    color: 'var(--blue)' },
  { id: 'reading',    icon: '📖', label: 'Reading',   color: 'var(--gold)' },
  { id: 'business',   icon: '💼', label: 'Business',  color: 'var(--orange)' },
  { id: 'discipline', icon: '🎯', label: 'Discipline', color: 'var(--cyan)' },
];

export default function QuickLog() {
  const store = useGameStore();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Category | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') { setOpen(false); setCat(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const fab = document.getElementById('ql-fab');
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && e.target !== fab) {
        setOpen(false); setCat(null);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      switch (cat) {
        case 'soccer': {
          const type = fd.get('type') as 'training' | 'match';
          store.addSoccerSession({
            date: today, type,
            duration: parseInt(fd.get('duration') as string) || 60,
            goals: parseInt(fd.get('goals') as string) || 0,
            assists: parseInt(fd.get('assists') as string) || 0,
            minutesPlayed: parseInt(fd.get('duration') as string) || 60,
            rating: 3, notes: fd.get('notes') as string || '',
          });
          break;
        }
        case 'fitness': {
          store.addWorkout({
            date: today,
            type: fd.get('type') as string || 'Strength',
            duration: parseInt(fd.get('duration') as string) || 45,
            exercises: fd.get('exercises') as string || '',
            calories: 0, notes: '',
          });
          break;
        }
        case 'sleep': {
          const bed = fd.get('bed') as string;
          const wake = fd.get('wake') as string;
          let dur = 8;
          try {
            const b = parse(bed, 'HH:mm', new Date());
            let w = parse(wake, 'HH:mm', new Date());
            if (w <= b) w = new Date(w.getTime() + 86400000);
            dur = parseFloat((differenceInMinutes(w, b) / 60).toFixed(2));
          } catch {}
          store.addSleepEntry({
            date: today, bedTime: bed, wakeTime: wake, duration: dur,
            quality: parseInt(fd.get('quality') as string) as any || 3, notes: '',
          });
          break;
        }
        case 'school': {
          store.addStudySession({
            date: today,
            subject: fd.get('subject') as string || 'Other',
            duration: parseInt(fd.get('duration') as string) || 60,
            type: 'revision', notes: fd.get('notes') as string || '',
          });
          break;
        }
        case 'reading': {
          store.addReadingEntry({
            date: today,
            book: fd.get('book') as string || 'Unknown',
            author: '',
            pagesRead: parseInt(fd.get('pages') as string) || 0,
            totalPages: 300,
            notes: '',
          });
          break;
        }
        case 'business': {
          store.addBusinessTask({
            date: today,
            category: 'execution',
            title: fd.get('title') as string || 'Task',
            description: '',
            duration: 30,
            impact: fd.get('impact') as any || 'medium',
            notes: '',
          });
          break;
        }
        case 'discipline': {
          const goals = store.discipline.goals.filter(g => g.active);
          goals.forEach(goal => {
            const achieved = fd.get(`goal_${goal.id}`) === 'on';
            store.logDisciplineEntry({ date: today, goalId: goal.id, achieved, notes: '' });
          });
          break;
        }
      }
      store.checkAndUnlockAchievements();
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setCat(null); setOpen(false); }, 1400);
    } catch (err) {
      console.error(err);
    }
  }

  const activeCat = CATS.find(c => c.id === cat);

  return (
    <>
      {/* FAB */}
      <button
        id="ql-fab"
        className={`fab ${open ? 'open' : ''}`}
        onClick={() => { setOpen(o => !o); if (open) setCat(null); }}
        title="Quick Log (⌘K)"
      >
        {open ? '✕' : '+'}
      </button>

      {/* Panel */}
      {open && (
        <div className="ql-overlay" style={{ pointerEvents: 'none', position: 'fixed', bottom: 0, right: 0, top: 0, left: 0, zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0 24px 100px' }}>
          <div ref={panelRef} className="ql-panel" style={{ pointerEvents: 'all' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>⚡</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>Logged!</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>XP added to your total</div>
              </div>
            ) : cat ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCat(null)}>← Back</button>
                  <span style={{ fontSize: 22 }}>{activeCat?.icon}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: activeCat?.color }}>
                    Quick Log — {activeCat?.label}
                  </span>
                </div>
                <form onSubmit={handleSubmit} className="ql-form">
                  <QuickForm cat={cat} />
                  <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 4 }}>
                    Log + Earn XP ⚡
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="ql-title">⚡ QUICK LOG <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>⌘K</span></div>
                <div className="ql-cats">
                  {CATS.map(c => (
                    <button key={c.id} className="ql-cat-btn" onClick={() => setCat(c.id)}>
                      <span className="ql-cat-icon">{c.icon}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>Select a category to log</div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function QuickForm({ cat }: { cat: Category }) {
  const store = useGameStore();
  switch (cat) {
    case 'soccer': return (
      <>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select name="type" className="form-select"><option value="training">Training</option><option value="match">Match</option></select>
        </div>
        <div className="form-group">
          <label className="form-label">Duration (min)</label>
          <input name="duration" type="number" className="form-input" defaultValue="90" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Goals</label><input name="goals" type="number" className="form-input" defaultValue="0" /></div>
          <div className="form-group"><label className="form-label">Assists</label><input name="assists" type="number" className="form-input" defaultValue="0" /></div>
        </div>
        <div className="form-group"><label className="form-label">Notes</label><input name="notes" type="text" className="form-input" placeholder="e.g. good pressing session" /></div>
      </>
    );
    case 'fitness': return (
      <>
        <div className="form-group">
          <label className="form-label">Workout Type</label>
          <select name="type" className="form-select">
            {['Strength','Cardio','HIIT','Sprint Training','Plyometrics','Football Specific','Yoga','Other'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input name="duration" type="number" className="form-input" defaultValue="45" /></div>
        <div className="form-group"><label className="form-label">Exercises</label><input name="exercises" type="text" className="form-input" placeholder="Squats, bench, sprints..." /></div>
      </>
    );
    case 'sleep': return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group"><label className="form-label">Bed Time</label><input name="bed" type="time" className="form-input" defaultValue="23:00" /></div>
          <div className="form-group"><label className="form-label">Wake Time</label><input name="wake" type="time" className="form-input" defaultValue="07:00" /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Quality</label>
          <select name="quality" className="form-select">
            <option value="5">5 ⭐ Excellent</option><option value="4">4 ⭐ Good</option>
            <option value="3">3 ⭐ Average</option><option value="2">2 ⭐ Poor</option><option value="1">1 ⭐ Bad</option>
          </select>
        </div>
      </>
    );
    case 'school': return (
      <>
        <div className="form-group">
          <label className="form-label">Subject</label>
          <input name="subject" list="ql-subjects" type="text" className="form-input" placeholder="Maths, Coding, Arabic..." />
          <datalist id="ql-subjects">
            {['Maths','Arabic','Islamic Studies','Coding','English','Business','Science','Online Course','PE / Sport','Other'].map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="form-group">
          <label className="form-label">Session Type</label>
          <select name="type" className="form-select">
            <option value="self-study">🧠 Self-Study</option>
            <option value="online-course">🎓 Online Course</option>
            <option value="video-lecture">📺 Video Lecture</option>
            <option value="practice">✏️ Practice Problems</option>
            <option value="project">🛠️ Project Work</option>
            <option value="reading">📖 Reading / Research</option>
            <option value="revision">🔄 Revision</option>
            <option value="tutoring">👨‍🏫 Tutoring Session</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Duration (min)</label><input name="duration" type="number" className="form-input" defaultValue="60" /></div>
        <div className="form-group"><label className="form-label">Notes</label><input name="notes" type="text" className="form-input" placeholder="Topics covered..." /></div>
      </>
    );
    case 'reading': return (
      <>
        <div className="form-group">
          <label className="form-label">Book</label>
          <input name="book" list="ql-books" type="text" className="form-input" placeholder="Book title..." />
          <datalist id="ql-books">{store.reading.books.map(b => <option key={b.id} value={b.title} />)}</datalist>
        </div>
        <div className="form-group"><label className="form-label">Pages Read</label><input name="pages" type="number" className="form-input" defaultValue="30" /></div>
      </>
    );
    case 'business': return (
      <>
        <div className="form-group"><label className="form-label">Task Title</label><input name="title" type="text" className="form-input" placeholder="What did you work on?" required /></div>
        <div className="form-group">
          <label className="form-label">Impact</label>
          <select name="impact" className="form-select"><option value="high">High (+65 XP)</option><option value="medium">Medium (+45 XP)</option><option value="low">Low (+25 XP)</option></select>
        </div>
      </>
    );
    case 'discipline': {
      const goals = store.discipline.goals.filter(g => g.active);
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntries = store.discipline.entries.filter(e => e.date === today);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {goals.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
              No active goals. Set them up in the Discipline section.
            </div>
          ) : goals.map(g => {
            const already = todayEntries.find(e => e.goalId === g.id);
            return (
              <label key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg-4)', border: '1px solid var(--border)',
                cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1,
              }}>
                <input type="checkbox" name={`goal_${g.id}`} defaultChecked={already?.achieved} disabled={!!already} style={{ accentColor: 'var(--gold)', width: 16, height: 16 }} />
                <span style={{ fontSize: 18 }}>{g.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{g.title}</span>
                {already && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>already logged</span>}
              </label>
            );
          })}
        </div>
      );
    }
    default: return null;
  }
}
