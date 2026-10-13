import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { resolveStorageKey } from '../file-storage.service';
import { ZipReadError, readZipTextEntries } from './zip-reader';

/**
 * Prepares each answer's evidence file for the audit engine. PDFs and images are sent as they
 * are (every supported model reads them natively); Word (.docx), Excel (.xlsx) and CSV files are
 * turned into text. A file is only read when its fingerprint still matches the one recorded at
 * upload. Anything that cannot be read is listed with the reason, so the engine and the Lead
 * Auditor know it was not checked.
 */

/** Raw bytes of PDFs and images sent in one review, kept under every provider's request limit. */
export const MAX_ATTACHED_BYTES = 12 * 1024 * 1024;
/** Text kept from one spreadsheet, document or CSV, and from all of them together. */
export const MAX_TEXT_CHARS_PER_FILE = 20000;
export const MAX_TEXT_CHARS_TOTAL = 150000;

export type AttachableMime = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp';

export type EvidenceMaterial =
  | { questionId: string; fileName: string; mode: 'attached'; mimeType: AttachableMime; data: Buffer }
  | { questionId: string; fileName: string; mode: 'text'; text: string; truncated: boolean }
  | { questionId: string; fileName: string; mode: 'not-read'; reason: string };

export interface EvidenceToRead {
  questionId: string;
  fileName: string;
  mimeType: string;
  storageKey: string | null;
  sha256Hash: string;
}

const ATTACHABLE: Record<string, AttachableMime> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Paragraph text of a Word document. */
export function docxToText(buf: Buffer): string {
  const entries = readZipTextEntries(buf, (name) => name === 'word/document.xml');
  const xml = entries.get('word/document.xml');
  if (!xml) throw new ZipReadError('No document body found.');
  return decodeXml(
    xml
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Every sheet of an Excel workbook as tab-separated rows. */
export function xlsxToText(buf: Buffer): string {
  const entries = readZipTextEntries(buf, (name) => name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const shared = [...(entries.get('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decodeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
  );
  const sheets = [...entries.keys()]
    .filter((name) => name.startsWith('xl/worksheets/'))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  if (sheets.length === 0) throw new ZipReadError('No worksheets found.');

  return sheets
    .map((name, i) => {
      const rows = [...entries.get(name)!.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) =>
        [...row[1].matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)]
          .map((cell) => {
            const attrs = cell[1];
            const body = cell[2] ?? '';
            const type = attrs.match(/\bt="([^"]+)"/)?.[1];
            if (type === 'inlineStr') return decodeXml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
            const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
            if (type === 's') return shared[Number(value)] ?? '';
            return decodeXml(value);
          })
          .join('\t')
      );
      return `Sheet ${i + 1}\n${rows.join('\n')}`;
    })
    .join('\n\n')
    .trim();
}

function textFor(ext: string, content: Buffer): string | null {
  if (ext === '.csv') return content.toString('utf8');
  if (ext === '.docx') return docxToText(content);
  if (ext === '.xlsx') return xlsxToText(content);
  return null;
}

export async function readEvidenceForReview(items: EvidenceToRead[]): Promise<EvidenceMaterial[]> {
  const materials: EvidenceMaterial[] = [];
  let attachedBytes = 0;
  let textChars = 0;

  for (const item of items) {
    const base = { questionId: item.questionId, fileName: item.fileName };
    if (!item.storageKey) {
      materials.push({ ...base, mode: 'not-read', reason: 'recorded before files were stored, so there is no file to read' });
      continue;
    }

    let content: Buffer;
    try {
      content = await fs.promises.readFile(resolveStorageKey(item.storageKey));
    } catch {
      materials.push({ ...base, mode: 'not-read', reason: 'the stored file is missing' });
      continue;
    }
    if (crypto.createHash('sha256').update(content).digest('hex') !== item.sha256Hash.toLowerCase()) {
      materials.push({ ...base, mode: 'not-read', reason: 'the file no longer matches the fingerprint recorded at upload' });
      continue;
    }

    const ext = path.extname(item.fileName).toLowerCase();
    const attachable = ATTACHABLE[ext];
    if (attachable) {
      if (attachedBytes + content.length > MAX_ATTACHED_BYTES) {
        materials.push({ ...base, mode: 'not-read', reason: 'the files in this submission are too large to read in one review' });
        continue;
      }
      attachedBytes += content.length;
      materials.push({ ...base, mode: 'attached', mimeType: attachable, data: content });
      continue;
    }

    let text: string | null;
    try {
      text = textFor(ext, content);
    } catch (err) {
      const reason = err instanceof ZipReadError ? `the file could not be opened (${err.message})` : 'the file could not be opened';
      materials.push({ ...base, mode: 'not-read', reason });
      continue;
    }
    if (text === null) {
      materials.push({ ...base, mode: 'not-read', reason: `${ext || 'this'} files cannot be read automatically (older Word or Excel format)` });
      continue;
    }
    const room = Math.min(MAX_TEXT_CHARS_PER_FILE, MAX_TEXT_CHARS_TOTAL - textChars);
    if (room <= 0) {
      materials.push({ ...base, mode: 'not-read', reason: 'the files in this submission are too large to read in one review' });
      continue;
    }
    const kept = text.slice(0, room);
    textChars += kept.length;
    materials.push({ ...base, mode: 'text', text: kept, truncated: kept.length < text.length });
  }

  return materials;
}
