'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

type Card = {
  id: string;
  front: string;
  back: string;
  hint: string;
  tag: string;
  state: number;
  due: number;
  interval_days: number;
  ease: number;
  reps: number;
  lapses: number;
};

type Deck = { id: string; title: string; summary: string; total_cards: number };

const STATE_NAMES = ['New', 'Learning', 'Review', 'Relearning'];

function formatDue(due: number): string {
  const diff = due - Date.now();
  if (diff <= 0) return 'Due now';
  const days = diff / (24 * 60 * 60 * 1000);
  if (days < 1) return `in ${Math.max(1, Math.round(diff / 60000))} min`;
  if (days < 30) return `in ${Math.round(days)} days`;
  return new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DeckBrowserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`/api/decks/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setDeck(data.deck);
        setCards(data.cards ?? []);
      });
  }, [id]);

  if (!deck) return <p className="muted">Loading deck…</p>;

  const filtered = query
    ? cards.filter((c) =>
        `${c.front} ${c.back} ${c.tag}`.toLowerCase().includes(query.toLowerCase())
      )
    : cards;

  return (
    <main>
      <div className="study-head">
        <h1>{deck.title}</h1>
        <Link className="btn btn-primary btn-sm" href={`/study/${deck.id}`}>
          Study this deck
        </Link>
        <Link className="btn btn-ghost btn-sm" href="/library">
          ← Library
        </Link>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        {deck.summary}
      </p>

      <input
        className="chip"
        style={{ width: '100%', padding: '12px 16px', fontSize: 15, marginBottom: 16, borderRadius: 14 }}
        placeholder="Search these cards…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Question</th>
              <th style={{ width: '38%' }}>Answer</th>
              <th>Topic</th>
              <th>Status</th>
              <th>Next review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((card) => (
              <tr key={card.id}>
                <td style={{ fontWeight: 700 }}>{card.front}</td>
                <td className="muted">{card.back}</td>
                <td className="small muted">{card.tag || '—'}</td>
                <td className="small">
                  {STATE_NAMES[card.state]}
                  {card.lapses > 0 && (
                    <span className="muted"> · {card.lapses} lapse{card.lapses === 1 ? '' : 's'}</span>
                  )}
                </td>
                <td className="small muted">{card.reps === 0 ? 'Not started' : formatDue(card.due)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                  No cards match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
