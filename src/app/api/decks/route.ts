import { NextResponse } from 'next/server';
import { listDecks, overallStats } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ decks: listDecks(), stats: overallStats() });
}
