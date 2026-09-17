import { NextResponse } from 'next/server';
import { deleteDeck, getCards, getDeck, resetDeck } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const deck = getDeck(id);
  if (!deck) return NextResponse.json({ error: 'Deck not found.' }, { status: 404 });
  return NextResponse.json({ deck, cards: getCards(id) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  deleteDeck(id);
  return NextResponse.json({ ok: true });
}

/** POST with {"action":"reset"} puts every card back to new. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === 'reset') {
    resetDeck(id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
