import { NextResponse } from 'next/server';
import { db, newId } from '@/lib/db';
import { extractText, UnsupportedFileError } from '@/lib/extract';
import { generateFlashcards, MissingApiKeyError } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'That file is larger than 25 MB. Try splitting it into chapters.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractText(file.name, buffer);

    if (extracted.text.length < 200) {
      return NextResponse.json(
        {
          error:
            'Almost no text could be read from that file. If it is a scanned PDF (a photo of a page), it needs OCR first.',
        },
        { status: 400 }
      );
    }

    const deck = await generateFlashcards(extracted.text, file.name);

    const now = Date.now();
    const documentId = newId('doc');
    const deckId = newId('deck');

    const insertDoc = db.prepare(
      `INSERT INTO documents (id, filename, filetype, size_bytes, char_count, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertDeck = db.prepare(
      `INSERT INTO decks (id, document_id, title, summary, created_at) VALUES (?, ?, ?, ?, ?)`
    );
    const insertCard = db.prepare(
      `INSERT INTO cards (id, deck_id, front, back, hint, tag, state, due, interval_days, ease, reps, lapses, step, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, 2.5, 0, 0, 0, ?)`
    );

    db.transaction(() => {
      insertDoc.run(documentId, file.name, extracted.kind, file.size, extracted.text.length, now);
      insertDeck.run(deckId, documentId, deck.title, deck.summary ?? '', now);
      deck.cards.forEach((card, index) => {
        insertCard.run(
          newId('card'),
          deckId,
          card.front,
          card.back,
          card.hint ?? '',
          card.tag ?? '',
          now,
          now + index // keep the AI's ordering stable
        );
      });
    })();

    return NextResponse.json({
      deckId,
      title: deck.title,
      summary: deck.summary,
      cardCount: deck.cards.length,
      pages: extracted.pages,
    });
  } catch (error) {
    if (error instanceof UnsupportedFileError || error instanceof MissingApiKeyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[generate] failed:', error);
    const message = error instanceof Error ? error.message : 'Something went wrong.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
