'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Deck = {
  id: string;
  title: string;
  summary: string;
  created_at: number;
  filename: string | null;
  filetype: string | null;
  total_cards: number;
  due_cards: number;
  new_cards: number;
  mastered_cards: number;
};

type Stats = {
  decks: number;
  cards: number;
  documents: number;
  dueNow: number;
  mastered: number;
  reviewsToday: number;
  retentionPct: number | null;
};

const EMOJI: Record<string, string> = { pdf: '📕', docx: '📘', pptx: '📙', text: '📗' };

export default function LibraryPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/decks', { cache: 'no-store' });
    const data = await response.json();
    setDecks(data.decks);
    setStats(data.stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(deck: Deck) {
    if (!confirm(`Delete "${deck.title}" and all ${deck.total_cards} of its cards?`)) return;
    await fetch(`/api/decks/${deck.id}`, { method: 'DELETE' });
    void load();
  }

  async function reset(deck: Deck) {
    if (!confirm(`Reset all progress on "${deck.title}" and study it from scratch?`)) return;
    await fetch(`/api/decks/${deck.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    void load();
  }

  if (loading) return <p className="muted">Loading your library…</p>;

  return (
    <main>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 6px' }}>Your library</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Every document you have ever uploaded, and every deck it produced.
      </p>

      {stats && (
        <div className="stat-grid" style={{ margin: '20px 0 8px' }}>
          <div className="stat">
            <div className="stat-value gradient-text">{stats.decks}</div>
            <div className="stat-label">Decks</div>
          </div>
          <div className="stat">
            <div className="stat-value gradient-text">{stats.cards}</div>
            <div className="stat-label">Total cards</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ color: 'var(--tangerine)' }}>
              {stats.dueNow}
            </div>
            <div className="stat-label">Due right now</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ color: 'var(--mint)' }}>
              {stats.mastered}
            </div>
            <div className="stat-label">Mastered (21d+)</div>
          </div>
        </div>
      )}

      {decks.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🗂️</div>
          <h2>No decks yet</h2>
          <p>
            Upload your first document and it will show up here forever.
            <br />
            <Link href="/">Go to upload →</Link>
          </p>
        </div>
      ) : (
        <>
          <h2 className="section-title">Decks</h2>
          <div className="deck-grid">
            {decks.map((deck) => (
              <article className="deck" key={deck.id}>
                <div className="deck-top">
                  <span className="deck-emoji">{EMOJI[deck.filetype ?? 'text'] ?? '📄'}</span>
                  <div>
                    <h3>{deck.title}</h3>
                    <p className="deck-summary">{deck.summary}</p>
                  </div>
                </div>

                <div className="pill-row">
                  <span className="pill pill-total">{deck.total_cards} cards</span>
                  {deck.due_cards > 0 && <span className="pill pill-due">{deck.due_cards} due</span>}
                  {deck.new_cards > 0 && <span className="pill pill-new">{deck.new_cards} new</span>}
                  {deck.mastered_cards > 0 && (
                    <span className="pill pill-done">{deck.mastered_cards} mastered</span>
                  )}
                </div>

                <div className="small muted">
                  {deck.filename ?? 'Manual deck'} · added{' '}
                  {new Date(deck.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>

                <div className="deck-actions">
                  <Link className="btn btn-primary btn-sm" href={`/study/${deck.id}`}>
                    {deck.due_cards > 0 ? `Study ${deck.due_cards}` : 'Study'}
                  </Link>
                  <Link className="btn btn-ghost btn-sm" href={`/library/${deck.id}`}>
                    Browse cards
                  </Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => reset(deck)}>
                    Reset
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(deck)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
