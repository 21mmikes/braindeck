/**
 * extract.ts - turn an uploaded file into plain text.
 *
 * PDF  -> unpdf (a maintained wrapper around Mozilla's pdf.js)
 * DOCX -> mammoth
 * PPTX -> unzip the file and read the text runs out of each slide's XML
 * TXT / MD -> read as-is
 */
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export type Extracted = {
  text: string;
  kind: 'pdf' | 'docx' | 'pptx' | 'text';
  pages: number;
};

export class UnsupportedFileError extends Error {}

function tidy(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fromPdf(buffer: Buffer): Promise<Extracted> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: tidy(String(text)), kind: 'pdf', pages: totalPages };
}

async function fromDocx(buffer: Buffer): Promise<Extracted> {
  const result = await mammoth.extractRawText({ buffer });
  const text = tidy(result.value);
  // Word has no real page concept in the XML, so estimate ~500 words a page.
  return { text, kind: 'docx', pages: Math.max(1, Math.round(text.split(/\s+/).length / 500)) };
}

async function fromPptx(buffer: Buffer): Promise<Extracted> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const n = (s: string) => parseInt(s.match(/slide(\d+)\.xml$/)![1], 10);
      return n(a) - n(b);
    });

  const parser = new XMLParser({ ignoreAttributes: true, textNodeName: '#text' });
  const chunks: string[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const tree = parser.parse(xml);
    const runs: string[] = [];

    // Walk the parsed XML and collect every <a:t> text run.
    const walk = (node: unknown): void => {
      if (node === null || node === undefined) return;
      if (typeof node === 'string' || typeof node === 'number') return;
      if (Array.isArray(node)) return node.forEach(walk);
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === 'a:t') {
          if (Array.isArray(value)) value.forEach((v) => runs.push(String(v)));
          else runs.push(String(value));
        } else {
          walk(value);
        }
      }
    };
    walk(tree);

    if (runs.length) chunks.push(`--- Slide ${i + 1} ---\n${runs.join('\n')}`);
  }

  return { text: tidy(chunks.join('\n\n')), kind: 'pptx', pages: slideFiles.length };
}

export async function extractText(filename: string, buffer: Buffer): Promise<Extracted> {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'pdf':
      return fromPdf(buffer);
    case 'docx':
      return fromDocx(buffer);
    case 'pptx':
      return fromPptx(buffer);
    case 'txt':
    case 'md': {
      const text = tidy(buffer.toString('utf8'));
      return { text, kind: 'text', pages: Math.max(1, Math.round(text.length / 3000)) };
    }
    default:
      throw new UnsupportedFileError(
        `".${ext}" files are not supported yet. Please upload a PDF, Word (.docx), PowerPoint (.pptx), .txt or .md file.`
      );
  }
}
