/**
 * ai.ts - ask Claude to turn document text into flashcards.
 *
 * The prompt is deliberately opinionated: it enforces the rules that decades of
 * spaced repetition research (and Piotr Wozniak's "20 rules of formulating
 * knowledge") say make a good card - one fact per card, short answers, no
 * ambiguity, no "list all of the..." questions.
 */
import Anthropic from '@anthropic-ai/sdk';

export type GeneratedCard = {
  front: string;
  back: string;
  hint?: string;
  tag?: string;
};

export type GeneratedDeck = {
  title: string;
  summary: string;
  cards: GeneratedCard[];
};

export class MissingApiKeyError extends Error {}

/** Claude has a big context window, but we still trim runaway textbooks. */
const MAX_CHARS = 180_000;

const SYSTEM_PROMPT = `You are an expert learning scientist who writes flashcards for students.

You will be given the raw text of a study document. Produce a deck of high quality
question-and-answer flashcards that would let a student master this material.

Rules for every card:
1. ONE fact, definition, mechanism or relationship per card. Never bundle.
2. The question must make sense on its own, with no reference to "the document",
   "the slide", "the above" or "the author".
3. Answers should be short: ideally under 25 words. Long answers do not stick.
4. Prefer questions that force active recall ("Why does X cause Y?",
   "What is the definition of Z?") over trivia or yes/no questions.
5. Avoid "list all of the..." questions - split them into separate cards, or ask
   for one specific item with a cue.
6. Use the document's own terminology and notation exactly.
7. Skip page numbers, headers, footers, table-of-contents entries, module codes,
   references and anything that is not actual subject knowledge.
8. "hint" is optional: a 3-6 word nudge, never the answer itself.
9. "tag" is a short topic label (1-3 words) grouping related cards.

Return ONLY valid JSON, no markdown fences and no commentary, in this shape:
{
  "title": "short deck name based on the document's subject",
  "summary": "one sentence describing what this deck covers",
  "cards": [
    { "front": "...", "back": "...", "hint": "...", "tag": "..." }
  ]
}`;

function parseJson(raw: string): GeneratedDeck {
  // Claude is asked for bare JSON, but strip fences defensively.
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('The AI did not return any JSON.');

  const parsed = JSON.parse(text.slice(start, end + 1)) as GeneratedDeck;
  if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error('The AI returned a deck with no cards. Try a document with more text in it.');
  }

  parsed.cards = parsed.cards
    .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string')
    .map((c) => ({
      front: c.front.trim(),
      back: c.back.trim(),
      hint: (c.hint ?? '').trim(),
      tag: (c.tag ?? '').trim(),
    }))
    .filter((c) => c.front.length > 3 && c.back.length > 0);

  return parsed;
}

export async function generateFlashcards(
  documentText: string,
  filename: string,
  targetCards = Number(process.env.CARDS_PER_DOCUMENT ?? 25)
): Promise<GeneratedDeck> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('paste-your-key')) {
    throw new MissingApiKeyError(
      'No Anthropic API key found. Copy .env.local.example to .env.local and paste your key, then restart the server.'
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  const trimmed = documentText.slice(0, MAX_CHARS);
  const truncated = documentText.length > MAX_CHARS;

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Document filename: ${filename}
Aim for roughly ${targetCards} cards (fewer if the document is short, more if it is dense).${
          truncated ? '\nNote: the document was long and has been truncated.' : ''
        }

--- BEGIN DOCUMENT ---
${trimmed}
--- END DOCUMENT ---`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('The AI returned an empty response.');

  const deck = parseJson(textBlock.text);
  if (!deck.title) deck.title = filename.replace(/\.[^.]+$/, '');
  return deck;
}
