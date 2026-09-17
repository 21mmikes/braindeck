'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  decks: number;
  cards: number;
  documents: number;
  dueNow: number;
  mastered: number;
  reviewsToday: number;
  reviewsWeek: number;
  retentionPct: number | null;
};

type Day = { day: string; reviews: number; correct: number };

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<Day[]>([]);

  useEffect(() => {
    fetch('/api/stats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setHistory(data.history ?? []);
      });
  }, []);

  if (!stats) return <p className="muted">Crunching your numbers…</p>;

  const peak = Math.max(1, ...history.map((d) => d.reviews));

  return (
    <main>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 6px' }}>Your progress</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Retention is the share of cards you graded Good or Easy over the last 7 days. Anki users
        typically aim for 80–90%.
      </p>

      <div className="stat-grid" style={{ marginTop: 20 }}>
        <div className="stat">
          <div className="stat-value gradient-text">{stats.reviewsToday}</div>
          <div className="stat-label">Reviews today</div>
        </div>
        <div className="stat">
          <div className="stat-value gradient-text">{stats.reviewsWeek}</div>
          <div className="stat-label">Reviews this week</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--mint)' }}>
            {stats.retentionPct === null ? '—' : `${stats.retentionPct}%`}
          </div>
          <div className="stat-label">7-day retention</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: 'var(--tangerine)' }}>
            {stats.dueNow}
          </div>
          <div className="stat-label">Cards due now</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.documents}</div>
          <div className="stat-label">Documents processed</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.mastered}</div>
          <div className="stat-label">Cards mastered</div>
        </div>
      </div>

      <h2 className="section-title">Last 14 days</h2>
      <div className="card">
        {history.length === 0 ? (
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
            No reviews logged yet. <Link href="/library">Pick a deck</Link> and start studying.
          </p>
        ) : (
          <div className="chart">
            {history.map((day) => (
              <div className="chart-col" key={day.day} title={`${day.reviews} reviews`}>
                <div
                  className="chart-bar"
                  style={{ height: `${(day.reviews / peak) * 100}%` }}
                />
                <span className="chart-label">{day.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
