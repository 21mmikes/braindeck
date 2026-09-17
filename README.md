# BrainDeck

A local web application that turns study documents into spaced repetition flashcards.

Upload a PDF, Word document or PowerPoint file. The text is extracted on your own machine and
sent to Claude, which writes question-and-answer cards from it. Review is then scheduled with an
implementation of the SM-2 algorithm, so cards you find difficult return sooner than cards you
find easy.

Written as a final year project.

## Requirements

- Node.js 18 or newer
- An Anthropic API key from console.anthropic.com

## Running it

```bash
npm install
cp .env.local.example .env.local
```

Open `.env.local`, paste in your API key, then:

```bash
npm run dev
```

The application runs at http://localhost:3000.

## Supported formats

PDF, `.docx`, `.pptx`, `.txt` and `.md`.

Scanned PDFs are rejected with an explanatory message rather than producing an empty deck, since
a scan has no text layer to extract. Optical character recognition is not implemented.

## How it works

1. The uploaded file is parsed locally. Only the extracted text is sent to the Claude API; the
   file itself never leaves the machine.
2. Claude returns JSON containing a deck title, a summary and the cards. The response is parsed
   defensively, so one malformed card costs one card rather than the whole deck.
3. The document, deck and cards are written to a single SQLite file in one transaction.
4. The review screen serves only cards whose due date has passed, with unseen cards last.
5. Grading a card updates its scheduling state and appends a row to a review log, which is only
   ever added to.

## Project structure

```
src/
  app/
    page.tsx          Upload screen
    library/          Deck list and card browser
    study/[id]/       Review screen
    stats/            Progress dashboard
    api/              generate, decks, study, review, stats
  components/
    Nav.tsx
  lib/
    ai.ts             Prompt construction and the Claude API call
    db.ts             Database schema and queries
    extract.ts        PDF, DOCX and PPTX text extraction
    scheduler.ts      The SM-2 scheduling algorithm
scripts/
  test-scheduler.ts   Scheduler test harness
```

## Tests

The scheduler depends on nothing, so its tests run without installing anything:

```bash
node --experimental-strip-types scripts/test-scheduler.ts
```

27 assertions covering every state transition, the ease floor and interval cap, and a thirty-day
study simulation.

## Configuration

Set in `.env.local`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | Your API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Model used for generation |
| `CARDS_PER_DOCUMENT` | `25` | Target number of cards per document |

Scheduling behaviour — learning steps, graduating interval, ease bonus and interval cap — is in
the `CONFIG` object at the top of `src/lib/scheduler.ts`. Interface colours are in the `:root`
block at the top of `src/app/globals.css`.

## Attribution and licence

The scheduler is an independent implementation of the SM-2 algorithm, written from the published
specification and from publicly documented behaviour. No source code from Anki or any other
application is included in this repository. Anki is licensed under AGPL-3.0-or-later; an algorithm
is not itself copyrightable, which is why this project carries its own licence. Where Anki's
documented behaviour informed a decision, the source comments say so.

Released under the MIT Licence — see `LICENSE`.

Built with Next.js, React, TypeScript, better-sqlite3 and the Anthropic API.
