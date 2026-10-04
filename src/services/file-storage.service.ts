import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Private file storage on the persistent volume at FILE_STORAGE_DIR. Files are never served
 * statically; callers stream them through authenticated, ownership-checked endpoints.
 */
export type StorageArea = 'evidence' | 'logos';

const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;
const SAFE_EXTENSION = /^\.[a-z0-9]{1,8}$/;

export class FileStorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileStorageConfigError';
  }
}

export function getStorageRoot(): string {
  const configured = process.env.FILE_STORAGE_DIR?.trim();
  if (!configured) {
    throw new FileStorageConfigError('FILE_STORAGE_DIR must be set to the persistent storage directory.');
  }
  return path.resolve(configured);
}

/** Boot check: the directory must exist and be writable, so a missing volume fails loudly. */
export function validateFileStorage(): void {
  const root = getStorageRoot();
  let stat: fs.Stats;
  try {
    stat = fs.statSync(root);
  } catch {
    throw new FileStorageConfigError(`FILE_STORAGE_DIR (${root}) does not exist. Mount the storage volume or create the directory.`);
  }
  if (!stat.isDirectory()) {
    throw new FileStorageConfigError(`FILE_STORAGE_DIR (${root}) is not a directory.`);
  }
  try {
    fs.accessSync(root, fs.constants.W_OK);
  } catch {
    throw new FileStorageConfigError(`FILE_STORAGE_DIR (${root}) is not writable.`);
  }
}

/** Directory for multer disk uploads in an area, created on demand. */
export function areaDirectory(area: StorageArea, ownerId: string): string {
  if (!SAFE_SEGMENT.test(ownerId)) {
    throw new Error('Invalid storage owner.');
  }
  const dir = path.join(getStorageRoot(), area, ownerId);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function storageKeyFor(absolutePath: string): string {
  const relative = path.relative(getStorageRoot(), absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path is outside file storage.');
  }
  return relative.split(path.sep).join('/');
}

/** Writes a file under area/owner with a server-generated name. Returns its key and SHA-256. */
export function storeFile(
  area: StorageArea,
  ownerId: string,
  content: Buffer,
  originalName: string
): { storageKey: string; sha256: string; sizeBytes: number } {
  const ext = path.extname(originalName).toLowerCase();
  const safeExt = SAFE_EXTENSION.test(ext) ? ext : '';
  const absolute = path.join(areaDirectory(area, ownerId), `${crypto.randomUUID()}${safeExt}`);
  fs.writeFileSync(absolute, content, { mode: 0o600, flag: 'wx' });
  return {
    storageKey: storageKeyFor(absolute),
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    sizeBytes: content.length,
  };
}

/** Absolute path for a stored key, refusing anything that resolves outside storage. */
export function resolveStorageKey(storageKey: string): string {
  const root = getStorageRoot();
  const absolute = path.resolve(root, storageKey);
  if (!absolute.startsWith(root + path.sep)) {
    throw new Error('Invalid storage key.');
  }
  return absolute;
}
