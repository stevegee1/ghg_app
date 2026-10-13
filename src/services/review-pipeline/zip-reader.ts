import zlib from 'zlib';

/**
 * Minimal reader for the ZIP containers behind .docx and .xlsx files, using only Node's zlib.
 * It lists entries from the central directory and inflates the ones asked for, with size caps
 * so a crafted archive (a "zip bomb") cannot exhaust memory.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

/** Largest single entry we will inflate, and the most in total for one archive. */
export const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 60 * 1024 * 1024;

export class ZipReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipReadError';
  }
}

interface Entry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

function findEndOfCentralDirectory(buf: Buffer): number {
  // The record is 22 bytes plus a comment of up to 65535 bytes, at the end of the file.
  const earliest = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= earliest; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i;
  }
  throw new ZipReadError('Not a ZIP archive.');
}

function listEntries(buf: Buffer): Entry[] {
  const eocd = findEndOfCentralDirectory(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  const entries: Entry[] = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CENTRAL_SIGNATURE) throw new ZipReadError('Damaged ZIP directory.');
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    entries.push({
      method: buf.readUInt16LE(offset + 10),
      compressedSize: buf.readUInt32LE(offset + 20),
      uncompressedSize: buf.readUInt32LE(offset + 24),
      localHeaderOffset: buf.readUInt32LE(offset + 42),
      name: buf.toString('utf8', offset + 46, offset + 46 + nameLength),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Reads the named entries (those that exist) as UTF-8 text. */
export function readZipTextEntries(buf: Buffer, wanted: (name: string) => boolean): Map<string, string> {
  const result = new Map<string, string>();
  let total = 0;
  for (const entry of listEntries(buf)) {
    if (!wanted(entry.name)) continue;
    if (entry.uncompressedSize > MAX_ENTRY_BYTES) throw new ZipReadError(`${entry.name} is too large to read.`);
    const local = entry.localHeaderOffset;
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== LOCAL_SIGNATURE) throw new ZipReadError('Damaged ZIP entry.');
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const compressed = buf.subarray(dataStart, dataStart + entry.compressedSize);
    let data: Buffer;
    if (entry.method === 0) data = compressed;
    else if (entry.method === 8) data = zlib.inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES });
    else throw new ZipReadError(`Unsupported ZIP compression in ${entry.name}.`);
    total += data.length;
    if (total > MAX_ARCHIVE_BYTES) throw new ZipReadError('The archive is too large to read.');
    result.set(entry.name, data.toString('utf8'));
  }
  return result;
}
