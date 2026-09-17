import { NextResponse } from 'next/server';
import { db, overallStats } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const days = 14;
  const start = Date.now() - days * 24 * 60 * 60 * 1000;

  const rows = db
    .prepare(
      `SELECT date(reviewed_at / 1000, 'unixepoch') AS day,
              COUNT(*) AS reviews,
              SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) AS correct
         FROM reviews
        WHERE reviewed_at >= ?
     GROUP BY day
     ORDER BY day ASC`
    )
    .all(start) as { day: string; reviews: number; correct: number }[];

  // Fill every day in the window so the axis always spans the full period,
  // rather than only the days that happen to carry reviews.
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const history: { day: string; reviews: number; correct: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    history.push(byDay.get(key) ?? { day: key, reviews: 0, correct: 0 });
  }

  return NextResponse.json({ stats: overallStats(), history });
}
