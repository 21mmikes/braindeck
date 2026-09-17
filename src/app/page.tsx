'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Result = { deckId: string; title: string; cardCount: number; pages: number };

const STAGES = [
  'Reading your document…',
  'Pulling out the key concepts…',
  'Asking Claude to write your flashcards…',
  'Building your deck…',
];

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setResult(null);
    setFilename(file.name);
    setBusy(true);
    setStage(0);

    // Purely cosmetic: step the status text while we wait for the API.
    const ticker = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4000);

    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/generate', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Generation failed.');
      setResult(data as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      clearInterval(ticker);
      setBusy(false);
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <main>
      <section className="hero">
        <h1>
          Turn any document into
          <br />
          <span className="gradient-text">flashcards that stick</span>
        </h1>
        <p>
          Drop in a lecture PDF, an essay or a slide deck. Claude reads it, writes the questions, and
          Anki&apos;s spaced repetition schedule decides exactly when to show each card again.
        </p>
      </section>

      <div
        className={`dropzone${dragging ? ' dragging' : ''}${busy ? ' busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !busy) inputRef.current?.click();
        }}
      >
        <div className="dropzone-icon">{busy ? '⏳' : dragging ? '📥' : '📄'}</div>
        <h2>{busy ? 'Working on it…' : 'Drop your document here'}</h2>
        <p>{busy ? filename : 'or click to browse your files'}</p>
        <div className="chips">
          <span className="chip">PDF</span>
          <span className="chip">Word .docx</span>
          <span className="chip">PowerPoint .pptx</span>
          <span className="chip">.txt / .md</span>
          <span className="chip">up to 25 MB</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt,.md"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </div>

      {busy && (
        <div className="progress-strip">
          <strong>{STAGES[stage]}</strong>
          <div className="small muted">
            A 20-page document usually takes 20–40 seconds. Keep this tab open.
          </div>
          <div className="bar">
            <span />
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span aria-hidden>⚠️ </span>
          {error}
        </div>
      )}

      {result && (
        <div className="progress-strip">
          <div className="alert alert-success" style={{ marginTop: 0 }}>
            🎉 Made <strong>{result.cardCount} flashcards</strong> from {result.pages} page
            {result.pages === 1 ? '' : 's'} of &ldquo;{result.title}&rdquo;.
          </div>
          <div className="deck-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => router.push(`/study/${result.deckId}`)}>
              Start studying →
            </button>
            <button className="btn btn-ghost" onClick={() => router.push('/library')}>
              View in library
            </button>
          </div>
        </div>
      )}

      <h2 className="section-title">How it works</h2>
      <div className="stat-grid">
        {[
          ['1️⃣', 'Upload', 'Your file is read locally and the text is pulled out - nothing is stored on anyone else’s server.'],
          ['2️⃣', 'Generate', 'Claude turns the key ideas into one-fact-per-card questions and answers.'],
          ['3️⃣', 'Study', 'Flip each card, grade yourself, and the Anki algorithm sets the next review date.'],
          ['4️⃣', 'Return', 'Your library keeps every deck, so you can revise weeks later at exactly the right moment.'],
        ].map(([emoji, title, body]) => (
          <div className="stat" key={title}>
            <div className="stat-value" style={{ fontSize: 26 }}>
              {emoji}
            </div>
            <div className="stat-label" style={{ fontSize: 15, color: 'var(--ink)' }}>
              {title}
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
