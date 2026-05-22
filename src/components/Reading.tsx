import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGameStore } from '../store/gameStore';

export default function Reading() {
  const { reading, addReadingEntry, addBook, updateBook, streaks, checkAndUnlockAchievements } = useGameStore();
  const [tab, setTab] = useState<'log' | 'books' | 'history'>('log');
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), book: '', author: '', pagesRead: '', totalPages: '', notes: '' });
  const [bookForm, setBookForm] = useState({ title: '', author: '', totalPages: '', startDate: format(new Date(), 'yyyy-MM-dd') });

  function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    // Auto-add book if not exists
    const existing = reading.books.find(b => b.title.toLowerCase() === form.book.toLowerCase());
    if (!existing && form.totalPages) {
      addBook({ title: form.book, author: form.author, totalPages: parseInt(form.totalPages), pagesRead: 0, startDate: form.date, status: 'reading' });
    }
    addReadingEntry({ date: form.date, book: form.book, author: form.author, pagesRead: parseInt(form.pagesRead) || 0, totalPages: parseInt(form.totalPages) || 0, notes: form.notes });
    setForm(f => ({ ...f, pagesRead: '', notes: '' }));
    checkAndUnlockAchievements();
  }

  function submitBook(e: React.FormEvent) {
    e.preventDefault();
    addBook({ title: bookForm.title, author: bookForm.author, totalPages: parseInt(bookForm.totalPages) || 200, pagesRead: 0, startDate: bookForm.startDate, status: 'reading' });
    setBookForm({ title: '', author: '', totalPages: '', startDate: format(new Date(), 'yyyy-MM-dd') });
  }

  const totalPages = reading.entries.reduce((t, r) => t + r.pagesRead, 0);
  const booksFinished = reading.books.filter(b => b.status === 'completed').length;
  const currentBook = reading.books.find(b => b.status === 'reading');
  const thisWeekPages = reading.entries.filter(r => r.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd')).reduce((t, r) => t + r.pagesRead, 0);

  // Daily pages chart
  const chartData = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    return { date: format(subDays(new Date(), 13 - i), 'MMM d'), pages: reading.entries.filter(r => r.date === d).reduce((t, r) => t + r.pagesRead, 0) };
  }), [reading.entries]);

  // Book suggestions for dropdown
  const bookTitles = [...new Set(reading.books.map(b => b.title))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Pages', value: totalPages.toLocaleString(), icon: '📄', accent: 'var(--gold)' },
          { label: 'Books Finished', value: booksFinished, icon: '📗', accent: 'var(--green)' },
          { label: 'This Week', value: `${thisWeekPages}p`, icon: '📅', accent: 'var(--blue)' },
          { label: 'Streak', value: streaks.reading, icon: '🔥', accent: 'var(--orange)', sub: 'days' },
          { label: 'Reading Now', value: currentBook ? '1' : '0', icon: '📖', accent: 'var(--purple)', sub: currentBook?.title.slice(0,20) ?? 'none' },
          { label: 'Sessions', value: reading.entries.length, icon: '🗓️', accent: 'var(--text-3)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--accent': s.accent } as React.CSSProperties}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub || 'total'}</div>
          </div>
        ))}
      </div>

      {/* Current book progress */}
      {currentBook && (
        <div className="card card-glow-gold">
          <div className="card-header">
            <div className="card-title">📖 Currently Reading</div>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{Math.round((currentBook.pagesRead / currentBook.totalPages) * 100)}% complete</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{currentBook.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>by {currentBook.author}</div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${(currentBook.pagesRead / currentBook.totalPages) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--orange))' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>
                <span>{currentBook.pagesRead} pages read</span>
                <span>{currentBook.totalPages} total</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tab-bar">
        {(['log', 'books', 'history'] as const).map(t => (
          <button key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'log' ? '+ Log Reading' : t === 'books' ? '📚 Books' : '📋 History'}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">📖 Log Reading Session</div></div>
            <form onSubmit={submitEntry} className="form-grid">
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Book Title</label>
                  <input type="text" className="form-input" list="book-list" value={form.book} onChange={e => {
                    const b = reading.books.find(b => b.title === e.target.value);
                    setForm(f => ({ ...f, book: e.target.value, author: b?.author ?? f.author, totalPages: b ? String(b.totalPages) : f.totalPages }));
                  }} required placeholder="Book title" />
                  <datalist id="book-list">{bookTitles.map(t => <option key={t} value={t} />)}</datalist>
                </div>
              </div>
              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input type="text" className="form-input" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Pages Read</label>
                  <input type="number" className="form-input" placeholder="30" value={form.pagesRead} onChange={e => setForm(f => ({ ...f, pagesRead: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Pages</label>
                  <input type="number" className="form-input" placeholder="320" value={form.totalPages} onChange={e => setForm(f => ({ ...f, totalPages: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Key insights, quotes..." />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Log Reading 📖</button>
            </form>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📊 Pages Read — 14 Days</div></div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pagesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-3)', border: 'none', borderRadius: 8 }} />
                <Area type="monotone" dataKey="pages" stroke="var(--gold)" strokeWidth={2} fill="url(#pagesGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'books' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">+ Add Book</div></div>
            <form onSubmit={submitBook} className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="form-input" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} required placeholder="Book title" />
              </div>
              <div className="form-group">
                <label className="form-label">Author</label>
                <input type="text" className="form-input" value={bookForm.author} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} placeholder="Author" />
              </div>
              <div className="form-group">
                <label className="form-label">Total Pages</label>
                <input type="number" className="form-input" value={bookForm.totalPages} onChange={e => setBookForm(f => ({ ...f, totalPages: e.target.value }))} placeholder="300" />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={bookForm.startDate} onChange={e => setBookForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <button type="submit" className="btn btn-primary btn-full">Add Book 📚</button>
              </div>
            </form>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reading.books.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">No books yet</div></div>
            ) : reading.books.map(b => (
              <div key={b.id} className="card" style={{ border: b.status === 'completed' ? '1px solid rgba(0,230,118,0.2)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.status === 'completed' ? '✅ ' : b.status === 'reading' ? '📖 ' : '⏸️ '}
                      {b.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>by {b.author} · {b.totalPages}p</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min((b.pagesRead / b.totalPages) * 100, 100)}%`, background: b.status === 'completed' ? 'var(--green)' : 'linear-gradient(90deg, var(--gold), var(--orange))' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-3)' }}>
                      <span>{b.pagesRead} / {b.totalPages} pages</span>
                      <span>{Math.round((b.pagesRead / b.totalPages) * 100)}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {b.status !== 'completed' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => updateBook(b.id, { status: 'completed', pagesRead: b.totalPages, finishDate: format(new Date(), 'yyyy-MM-dd') })}>
                        ✅ Done
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => updateBook(b.id, { status: b.status === 'paused' ? 'reading' : 'paused' })}>
                      {b.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="card-header"><div className="card-title">📋 Reading Log</div></div>
          {reading.entries.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📖</div><div className="empty-state-title">No entries yet</div></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Book</th><th>Pages</th><th>XP</th></tr></thead>
              <tbody>
                {reading.entries.slice().reverse().slice(0, 20).map(r => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td style={{ maxWidth: 200 }}><span style={{ color: 'var(--gold)', fontWeight: 600 }}>{r.book}</span></td>
                    <td>+{r.pagesRead}p</td>
                    <td><span style={{ color: 'var(--xp)', fontWeight: 600 }}>+{r.xpGained}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
