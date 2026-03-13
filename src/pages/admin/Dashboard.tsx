import { useEffect, useState, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { auth } from '@/services/firebase';
import {
  subscribeToAllQuotes,
  saveManualQuote,
  updateQuote,
  deleteQuote,
  toggleVisibility,
  promoteToManual,
} from '@/services/quotes';
import { subscribeToStats, updateActiveUsers } from '@/services/stats';
import { getAllSessions } from '@/services/sessions';
import { formatDate, formatDuration, downloadCSV } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Quote, Stats, Session } from '@/types';

type Panel = 'stats' | 'quotes' | 'ai' | 'sessions';
type SortField = 'startedAt' | 'durationSeconds' | 'scrollCount';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-1">
      <p className="text-white/40 text-xs uppercase tracking-widest">{label}</p>
      <p className="text-white text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: 'manual' | 'ai' }) {
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-medium tracking-widest',
        type === 'manual'
          ? 'bg-blue-500/20 text-blue-300'
          : 'bg-red-500/20 text-red-300'
      )}
    >
      {type === 'manual' ? 'manual' : 'ai'}
    </span>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mostLiked, setMostLiked] = useState<Quote | null>(null);

  // Quote manager state
  const [newQuoteText, setNewQuoteText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'manual' | 'ai' | 'liked' | 'recent'>('all');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Sessions state
  const [sortField, setSortField] = useState<SortField>('startedAt');

  const statsUnsubRef = useRef<(() => void) | null>(null);
  const quotesUnsubRef = useRef<(() => void) | null>(null);

  // ── Data subscriptions ─────────────────────────────────────────────────────
  useEffect(() => {
    void updateActiveUsers();

    statsUnsubRef.current = subscribeToStats((s) => setStats(s));
    quotesUnsubRef.current = subscribeToAllQuotes((q) => {
      setQuotes(q);
      const top = [...q].sort((a, b) => b.likes - a.likes)[0] ?? null;
      setMostLiked(top);
    });

    getAllSessions().then(setSessions).catch(console.error);

    return () => {
      statsUnsubRef.current?.();
      quotesUnsubRef.current?.();
    };
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await signOut(auth);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  // ── Quote actions ──────────────────────────────────────────────────────────
  const handleAddQuote = async () => {
    if (!newQuoteText.trim()) return;
    try {
      await saveManualQuote(newQuoteText);
      setNewQuoteText('');
      toast.success('Quote saved 💙');
    } catch { toast.error('Failed to save quote'); }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateQuote(id, editText);
      setEditingId(null);
      toast.success('Quote updated');
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    try {
      await deleteQuote(id);
      setConfirmDelete(null);
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const handleToggleVisible = async (q: Quote) => {
    try {
      await toggleVisibility(q.id, !q.visible);
      toast.success(q.visible ? 'Hidden from feed' : 'Visible in feed');
    } catch { toast.error('Update failed'); }
  };

  const handlePromote = async (id: string) => {
    try {
      await promoteToManual(id);
      toast.success('Promoted to manual 💙');
    } catch { toast.error('Promotion failed'); }
  };

  // ── Filtered quotes ────────────────────────────────────────────────────────
  const filteredQuotes = quotes
    .filter((q) => {
      if (filterMode === 'manual') return q.type === 'manual';
      if (filterMode === 'ai') return q.type === 'ai';
      return true;
    })
    .filter((q) => !search || q.text.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (filterMode === 'liked') return b.likes - a.likes;
      if (filterMode === 'recent') return b.createdAt - a.createdAt;
      return b.createdAt - a.createdAt;
    });

  const aiSavedQuotes = quotes.filter((q) => q.type === 'ai' && q.savedBy === 'user_like');

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortField === 'durationSeconds') return b.durationSeconds - a.durationSeconds;
    if (sortField === 'scrollCount') return b.scrollCount - a.scrollCount;
    return b.startedAt - a.startedAt;
  });

  const tabs: { id: Panel; label: string }[] = [
    { id: 'stats', label: 'Live Stats' },
    { id: 'quotes', label: 'Quotes' },
    { id: 'ai', label: 'AI Saved' },
    { id: 'sessions', label: 'Sessions' },
  ];

  return (
    <div className="min-h-dvh bg-black text-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👑</span>
          <span className="text-white/60 text-sm font-medium">princess admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/40 hover:text-white/80 text-xs transition px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          sign out
        </button>
      </header>

      {/* Tab nav */}
      <nav className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setPanel(t.id)}
            className={cn(
              'px-5 py-3 text-sm whitespace-nowrap transition',
              panel === t.id
                ? 'text-pink-400 border-b-2 border-pink-500'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16">
        {/* ── Panel 1: Live Stats ─────────────────────────────────────────── */}
        {panel === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-white/50 text-xs uppercase tracking-widest">live stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Total Users" value={stats?.totalUsers ?? '—'} />
              <KpiCard label="Active Now" value={stats?.activeUsers ?? '—'} />
              <KpiCard label="Hours Scrolled" value={stats && stats.totalHoursScrolled !== undefined ? stats.totalHoursScrolled.toFixed(1) + 'h' : '—'} />
              <KpiCard label="Total 🫠" value={stats?.totalLikes ?? '—'} />
              <KpiCard label="Total Scrolls" value={stats?.totalScrolls ?? '—'} />
              <KpiCard label="Quotes Loaded" value={quotes.length} />
            </div>
            {mostLiked && (
              <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-5 space-y-2">
                <p className="text-pink-400/80 text-xs uppercase tracking-widest">Most liked quote</p>
                <p className="text-white text-sm leading-relaxed italic">"{mostLiked.text}"</p>
                <p className="text-white/30 text-xs">🫠 {mostLiked.likes} likes</p>
              </div>
            )}
          </div>
        )}

        {/* ── Panel 2: Quote Manager ──────────────────────────────────────── */}
        {panel === 'quotes' && (
          <div className="space-y-6">
            {/* Add new quote */}
            <div className="space-y-3">
              <h2 className="text-white/50 text-xs uppercase tracking-widest">add quote</h2>
              <textarea
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="Write it here..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm outline-none focus:border-pink-500/40 resize-none"
              />
              <button
                onClick={handleAddQuote}
                disabled={!newQuoteText.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition font-medium"
              >
                save quote 💙
              </button>
            </div>

            {/* Filter + search bar */}
            <div className="flex flex-wrap gap-2 items-center">
              {(['all', 'manual', 'ai', 'liked', 'recent'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterMode(f)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs transition',
                    filterMode === f
                      ? 'bg-pink-600 text-white'
                      : 'bg-white/5 text-white/40 hover:text-white/70'
                  )}
                >
                  {f}
                </button>
              ))}
              <input
                type="search"
                placeholder="search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-auto bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white placeholder:text-white/20 text-xs outline-none focus:border-pink-500/30 w-40"
              />
            </div>

            {/* Quotes table */}
            <div className="space-y-2">
              {filteredQuotes.map((q) => (
                <div
                  key={q.id}
                  className={cn(
                    'bg-white/5 border rounded-xl p-4 space-y-3 transition',
                    !q.visible && 'opacity-40',
                    q.visible ? 'border-white/10' : 'border-white/5'
                  )}
                >
                  {editingId === q.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-pink-500/40 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(q.id)} className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs rounded-lg transition">save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-white/10 text-white/60 text-xs rounded-lg hover:bg-white/20 transition">cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/80 text-sm leading-relaxed">{q.text}</p>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <TypeBadge type={q.type} />
                      <span className="text-white/30 text-xs">{formatDate(q.createdAt)}</span>
                      <span className="text-white/30 text-xs">🫠 {q.likes}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleVisible(q)}
                        className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition"
                      >
                        {q.visible ? 'hide' : 'show'}
                      </button>
                      <button
                        onClick={() => { setEditingId(q.id); setEditText(q.text); }}
                        className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className={cn(
                          'text-xs px-2 py-1 rounded-lg transition',
                          confirmDelete === q.id
                            ? 'bg-red-600 text-white'
                            : 'text-red-400/50 hover:text-red-400 hover:bg-white/5'
                        )}
                      >
                        {confirmDelete === q.id ? 'confirm' : 'delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredQuotes.length === 0 && (
                <p className="text-white/20 text-sm text-center py-8">no quotes found</p>
              )}
            </div>
          </div>
        )}

        {/* ── Panel 3: AI Saved Quotes ────────────────────────────────────── */}
        {panel === 'ai' && (
          <div className="space-y-4">
            <h2 className="text-white/50 text-xs uppercase tracking-widest">
              ai quotes saved via 🫠 ({aiSavedQuotes.length})
            </h2>
            {aiSavedQuotes.length === 0 && (
              <p className="text-white/20 text-sm text-center py-10">
                no saved ai quotes yet — keep scrolling 🌙
              </p>
            )}
            {aiSavedQuotes.map((q) => (
              <div key={q.id} className="bg-white/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                <p className="text-white/80 text-sm leading-relaxed italic">"{q.text}"</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-white/30 text-xs">🫠 {q.likes} · {formatDate(q.createdAt)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePromote(q.id)}
                      className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white text-xs rounded-lg transition"
                    >
                      promote to manual 💙
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className={cn(
                        'text-xs px-2 py-1 rounded-lg transition',
                        confirmDelete === q.id
                          ? 'bg-red-600 text-white'
                          : 'text-red-400/50 hover:text-red-400 hover:bg-white/5'
                      )}
                    >
                      {confirmDelete === q.id ? 'confirm' : 'delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Panel 4: Session Log ────────────────────────────────────────── */}
        {panel === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white/50 text-xs uppercase tracking-widest">
                session log ({sessions.length})
              </h2>
              <button
                onClick={() =>
                  downloadCSV(
                    sessions.map((s) => ({
                      sessionId: s.sessionId,
                      startedAt: formatDate(s.startedAt),
                      duration: formatDuration(s.durationSeconds),
                      scrollCount: s.scrollCount,
                      likeCount: s.likeCount,
                    })),
                    'princess-sessions.csv'
                  )
                }
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-xl transition"
              >
                export csv ↓
              </button>
            </div>

            {/* Sort controls */}
            <div className="flex gap-2">
              {([
                { field: 'startedAt', label: 'date' },
                { field: 'durationSeconds', label: 'duration' },
                { field: 'scrollCount', label: 'scrolls' },
              ] as const).map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => setSortField(field)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs transition',
                    sortField === field
                      ? 'bg-pink-600 text-white'
                      : 'bg-white/5 text-white/40 hover:text-white/70'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {sortedSessions.map((s) => (
                <div key={s.sessionId} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-white/50 font-mono">{s.sessionId.slice(0, 8)}…</p>
                    <p className="text-white/25">{formatDate(s.startedAt)}</p>
                  </div>
                  <div className="flex gap-4 text-white/50">
                    <span>⏱ {formatDuration(s.durationSeconds)}</span>
                    <span>📜 {s.scrollCount}</span>
                    <span>🫠 {s.likeCount}</span>
                  </div>
                </div>
              ))}

              {/* Totals row */}
              {sessions.length > 0 && (
                <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-white/60 font-medium">totals</span>
                  <div className="flex gap-4 text-white/60">
                    <span>⏱ {formatDuration(sessions.reduce((s, x) => s + x.durationSeconds, 0))}</span>
                    <span>📜 {sessions.reduce((s, x) => s + x.scrollCount, 0)}</span>
                    <span>🫠 {sessions.reduce((s, x) => s + x.likeCount, 0)}</span>
                  </div>
                </div>
              )}

              {sessions.length === 0 && (
                <p className="text-white/20 text-sm text-center py-10">no sessions yet</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
