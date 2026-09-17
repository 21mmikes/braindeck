import { NextResponse } from 'next/server';
import { db, getCard } from '@/lib/db';
import { previewIntervals, schedule, type Rating } from '@/lib/scheduler';

export const runtime = 'nodejs';

/**
 * The student pressed Again / Hard / Good / Easy.
 * Run the scheduler, save the new state, and log the review for the stats page.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { cardId?: string; rating?: number };
  const { cardId, rating } = body;

  if (!cardId || !rating || rating < 1 || rating > 4) {
    return NextResponse.json({ error: 'cardId and a rating of 1-4 are required.' }, { status: 400 });
  }

  const card = getCard(cardId);
  if (!card) return NextResponse.json({ error: 'Card not found.' }, { status: 404 });

  const now = Date.now();
  const next = schedule(card, rating as Rating, now);

  db.transaction(() => {
    db.prepare(
      `UPDATE cards
          SET state = ?, due = ?, interval_days = ?, ease = ?, reps = ?, lapses = ?, step = ?
        WHERE id = ?`
    ).run(
      next.state,
      Math.round(next.due),
      next.interval_days,
      next.ease,
      next.reps,
      next.lapses,
      next.step,
      cardId
    );
    db.prepare(
      `INSERT INTO reviews (card_id, rating, reviewed_at, prev_interval, new_interval)
       VALUES (?, ?, ?, ?, ?)`
    ).run(cardId, rating, now, card.interval_days, next.interval_days);
  })();

  // If the card is due again within this session (a learning step), hand it back.
  const dueAgainSoon = next.due - now < 20 * 60 * 1000;

  return NextResponse.json({
    ok: true,
    dueAgainSoon,
    card: dueAgainSoon
      ? {
          id: card.id,
          front: card.front,
          back: card.back,
          hint: card.hint,
          tag: card.tag,
          state: next.state,
          reps: next.reps,
          lapses: next.lapses,
          preview: previewIntervals(next, now),
        }
      : null,
    nextDue: Math.round(next.due),
    intervalDays: next.interval_days,
  });
}
