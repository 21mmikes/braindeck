'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Preview = { again: string; hard: string; good: string; easy: string };

type StudyCard = {
  id: string;
  front: string;
  back: string;
  hint: string;
  tag: string;
  state: number;
  reps: number;
  lapses: number;
  preview: Preview;
};

type Deck = { id: string; title: string; total_cards: number };

const GRADES = [
  { rating: 1, key: 'again' as const, label: 'Again', emoji: '🔁', className: 'grade-again' },
  { rating: 2, key: 'hard' as const, label: 'Hard', emoji: '😓', className: 'grade-hard' },
  { rating: 3, key: 'good' as const, label: 'Good', emoji: '🙂', className: 'grade-good' },
  { rating: 4, key: 'easy' as const, label: 'Easy', emoji: '😎', className: 'grade-easy' },
];

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    fetch(`/api/study/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setDeck(data.deck);
        setQueue(data.cards ?? []);
        setLoading(false);
      });
  }, [id]);

  const current = queue[0];

  const grade = useCallback(
    async (rating: number) => {
      if (!current || saving) return;
      setSaving(true);
      try {
        const response = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: current.id, rating }),
        });
        const data = await response.json();

        setQueue((q) => {
          const rest = q.slice(1);
          // A card still in its learning steps comes back later in this session,
          // exactly as Anki does.
          if (data.dueAgainSoon && data.card) {
            const insertAt = Math.min(rest.length, 3);
            return [...rest.slice(0, insertAt), data.card, ...rest.slice(insertAt)];
          }
          return rest;
        });
        setDone((d) => d + 1);
        setFlipped(false);
      } finally {
        setSaving(false);
      }
    },
    [current, saving]
  );

  // Keyboard shortcuts: space to flip, 1-4 to grade - same as Anki.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!current) return;
      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (flipped && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        void grade(Number(event.key));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, flipped, grade]);

  if (loading) return <p className="muted">Shuffling your cards…</p>;

  if (!current) {
    return (
      <main className="empty">
        <div className="empty-icon">🎉</div>
        <h1 style={{ fontWeight: 900 }}>All caught up!</h1>
        <p>
          {done > 0
            ? `You reviewed ${done} card${done === 1 ? '' : 's'}. `
            : 'Nothing is due in this deck right now. '}
          The spaced repetition schedule will bring these back exactly when you are about to forget
          them.
        </p>
        <div className="deck-actions" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" href="/library">
            Back to library
          </Link>
          <Link className="btn btn-ghost" href="/">
            Upload another document
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="study-head">
        <h1>{deck?.title}</h1>
        <span className="counter">
          {queue.length} left · {done} done
        </span>
        <Link className="btn btn-ghost btn-sm" href="/library">
          Exit
        </Link>
      </div>

      <div className="flip-scene">
        <div
          className={`flip-card${flipped ? ' flipped' : ''}`}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          aria-label="Flashcard - click to flip"
        >
          <div className="face face-front">
            {current.tag && <span className="face-tag">{current.tag}</span>}
            <span className="face-label">Question</span>
            <p className="face-text">{current.front}</p>
            {current.hint && <p className="face-hint">💡 {current.hint}</p>}
            <span className="tap-hint">Click the card or press Space to reveal</span>
          </div>
          <div className="face face-back">
            {current.tag && <span className="face-tag">{current.tag}</span>}
            <span className="face-label">Answer</span>
            <p className="face-text">{current.back}</p>
          </div>
        </div>
      </div>

      {flipped ? (
        <>
          <div className="grade-row">
            {GRADES.map((g) => (
              <button
                key={g.rating}
                className={`grade ${g.className}`}
                disabled={saving}
                onClick={() => void grade(g.rating)}
              >
                <span className="grade-emoji">{g.emoji}</span>
                <span className="grade-name">{g.label}</span>
                <span className="grade-when">{current.preview[g.key]}</span>
              </button>
            ))}
          </div>
          <p className="keyhint">
            Press <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> to grade · the time under each
            button is when you will see this card again
          </p>
        </>
      ) : (
        <>
          <button className="reveal-btn" onClick={() => setFlipped(true)}>
            Show answer
          </button>
          <p className="keyhint">
            Try to answer out loud first — the effort is what builds the memory. Press{' '}
            <kbd>Space</kbd>.
          </p>
        </>
      )}
    </main>
  );
}
