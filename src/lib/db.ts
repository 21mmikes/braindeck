/**
 * db.ts - the whole storage layer.
 *
 * Everything lives in a single SQLite file at ./data/flashcards.db.
 * SQLite needs no server, no password and no cloud account: it is one file on
 * your laptop, which is exactly what Anki itself uses (collection.anki2).
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Next.js reloads modules in dev, so cache the connection on globalThis to
// avoid opening the database dozens of times while you are coding.
const globalForDb = globalThis as unknown as { __flashcardDb?: Database.Database };

function createConnection(): Database.Database {
  const db = new Database(path.join(DATA_DIR, 'flashcards.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id            TEXT PRIMARY KEY,
      filename      TEXT NOT NULL,
      filetype      TEXT NOT NULL,
      size_bytes    INTEGER NOT NULL,
      char_count    INTEGER NOT NULL,
      uploaded_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decks (
      id            TEXT PRIMARY KEY,
      document_id   TEXT REFERENCES documents(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      summary       TEXT NOT NULL DEFAULT '',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id            TEXT PRIMARY KEY,
      deck_id       TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      front         TEXT NOT NULL,
      back          TEXT NOT NULL,
      hint          TEXT NOT NULL DEFAULT '',
      tag           TEXT NOT NULL DEFAULT '',
      -- Scheduling state, mirroring Anki's card table
      state         INTEGER NOT NULL DEFAULT 0,   -- 0 new, 1 learning, 2 review, 3 relearning
      due           INTEGER NOT NULL,             -- unix ms when the card is next due
      interval_days REAL    NOT NULL DEFAULT 0,
      ease          REAL    NOT NULL DEFAULT 2.5, -- Anki's "ease factor"
      reps          INTEGER NOT NULL DEFAULT 0,
      lapses        INTEGER NOT NULL DEFAULT 0,
      step          INTEGER NOT NULL DEFAULT 0,   -- position in the learning steps
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      rating        INTEGER NOT NULL,             -- 1 again, 2 hard, 3 good, 4 easy
      reviewed_at   INTEGER NOT NULL,
      prev_interval REAL NOT NULL,
      new_interval  REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_cards_due  ON cards(due);
    CREATE INDEX IF NOT EXISTS idx_reviews_at ON reviews(reviewed_at);
  `);

  return db;
}

export const db = globalForDb.__flashcardDb ?? createConnection();
if (process.env.NODE_ENV !== 'production') globalForDb.__flashcardDb = db;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CardRow = {
  id: string;
  deck_id: string;
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
  step: number;
  created_at: number;
};

export type DeckRow = {
  id: string;
  document_id: string | null;
  title: string;
  summary: string;
  created_at: number;
};

export type DeckSummary = DeckRow & {
  filename: string | null;
  filetype: string | null;
  total_cards: number;
  due_cards: number;
  new_cards: number;
  mastered_cards: number;
};

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* Queries used by the API routes                                      */
/* ------------------------------------------------------------------ */

export function listDecks(): DeckSummary[] {
  const now = Date.now();
  return db
    .prepare(
      `SELECT d.*,
              doc.filename,
              doc.filetype,
              (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS total_cards,
              (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.due <= ?) AS due_cards,
              (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.state = 0) AS new_cards,
              (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id AND c.interval_days >= 21) AS mastered_cards
         FROM decks d
    LEFT JOIN documents doc ON doc.id = d.document_id
     ORDER BY d.created_at DESC`
    )
    .all(now) as DeckSummary[];
}

export function getDeck(deckId: string): DeckSummary | undefined {
  return listDecks().find((d) => d.id === deckId);
}

export function getCards(deckId: string): CardRow[] {
  return db
    .prepare(`SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC`)
    .all(deckId) as CardRow[];
}

/** Cards that are due right now, new cards last, oldest-due first. */
export function getDueCards(deckId: string, limit = 200): CardRow[] {
  return db
    .prepare(
      `SELECT * FROM cards
        WHERE deck_id = ? AND due <= ?
     ORDER BY CASE WHEN state = 0 THEN 1 ELSE 0 END, due ASC
        LIMIT ?`
    )
    .all(deckId, Date.now(), limit) as CardRow[];
}

export function getCard(cardId: string): CardRow | undefined {
  return db.prepare(`SELECT * FROM cards WHERE id = ?`).get(cardId) as CardRow | undefined;
}

export function deleteDeck(deckId: string): void {
  db.prepare(`DELETE FROM decks WHERE id = ?`).run(deckId);
}

/** Put every card in a deck back to "new" so you can start the deck again. */
export function resetDeck(deckId: string): void {
  db.prepare(
    `UPDATE cards
        SET state = 0, due = ?, interval_days = 0, ease = 2.5,
            reps = 0, lapses = 0, step = 0
      WHERE deck_id = ?`
  ).run(Date.now(), deckId);
}

export function overallStats() {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const one = <T>(sql: string, ...params: any[]) => db.prepare(sql).get(...params) as T;

  const totals = one<{ decks: number; cards: number; documents: number }>(
    `SELECT (SELECT COUNT(*) FROM decks) AS decks,
            (SELECT COUNT(*) FROM cards) AS cards,
            (SELECT COUNT(*) FROM documents) AS documents`
  );
  const due = one<{ n: number }>(`SELECT COUNT(*) AS n FROM cards WHERE due <= ?`, now).n;
  const mastered = one<{ n: number }>(`SELECT COUNT(*) AS n FROM cards WHERE interval_days >= 21`).n;
  const reviewsToday = one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM reviews WHERE reviewed_at >= ?`,
    dayAgo
  ).n;
  const reviewsWeek = one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM reviews WHERE reviewed_at >= ?`,
    weekAgo
  ).n;
  const accuracy = one<{ good: number; total: number }>(
    `SELECT SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) AS good, COUNT(*) AS total
       FROM reviews WHERE reviewed_at >= ?`,
    weekAgo
  );

  return {
    ...totals,
    dueNow: due,
    mastered,
    reviewsToday,
    reviewsWeek,
    retentionPct: accuracy.total ? Math.round((accuracy.good / accuracy.total) * 100) : null,
  };
}
