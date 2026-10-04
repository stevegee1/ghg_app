import crypto from 'crypto';

/**
 * Encrypts secrets at rest (device keys, client provider credentials) with AES-256-GCM. The key
 * is FLEET_CREDENTIALS_KEY: 32 bytes, given as 64 hex characters or base64. It lives only in the
 * environment; the server refuses to start without a valid one.
 */
const VERSION = 'v1';

export class SecretBoxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretBoxConfigError';
  }
}

function loadKey(): Buffer {
  const raw = process.env.FLEET_CREDENTIALS_KEY?.trim();
  if (!raw) throw new SecretBoxConfigError('FLEET_CREDENTIALS_KEY must be set to a 32-byte key (64 hex characters or base64).');
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new SecretBoxConfigError('FLEET_CREDENTIALS_KEY must decode to exactly 32 bytes.');
  return key;
}

/** Boot check, so a missing or malformed key fails loudly before any secret is stored. */
export function validateSecretBoxKey(): void {
  loadKey();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', loadKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(sealed: string): string {
  const [version, iv, tag, ciphertext] = sealed.split(':');
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error('Unrecognised secret format.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', loadKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
