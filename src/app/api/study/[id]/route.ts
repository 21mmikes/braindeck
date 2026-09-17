import { NextResponse } from 'next/server';
import { getDeck, getDueCards } from '@/lib/db';
import { previewIntervals } from '@/lib/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** Returns the cards that are due right now, plus the button previews. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const deck = getDeck(id);
  if (!deck) return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });

  const now = Date.now();
  const cards = getDueCards(id).map((card) => ({
    id: card.id,
    front: card.front,
    back: card.back,
    hint: card.hint,
    tag: card.tag,
    state: card.state,
    reps: card.reps,
    lapses: card.lapses,
    preview: previewIntervals(card, now),
  }));

  return NextResponse.json({ deck, cards });
}
