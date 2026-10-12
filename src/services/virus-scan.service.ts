import fs from 'fs';
import net from 'net';

/**
 * Virus scanning of uploads with a ClamAV daemon (clamd), using its INSTREAM protocol over TCP.
 * On when CLAMAV_HOST and CLAMAV_PORT are set (on Railway, the ClamAV service's private address);
 * off when neither is set. When on, a file is stored only after clamd reports it clean: an infected
 * file is refused, and so is every upload while the scanner cannot be reached.
 */

export const VIRUS_SCAN_ENV = { host: 'CLAMAV_HOST', port: 'CLAMAV_PORT' } as const;

/** Network timeout for one scan. Technical limit, not a business value. */
const SCAN_TIMEOUT_MS = 60_000;
const CHUNK_BYTES = 64 * 1024;

export class ScannerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScannerUnavailableError';
  }
}

export type ScanResult = { clean: true } | { clean: false; signature: string };

export function readVirusScanConfig(): { host: string; port: number } | null {
  const host = process.env[VIRUS_SCAN_ENV.host]?.trim() ?? '';
  const portRaw = process.env[VIRUS_SCAN_ENV.port]?.trim() ?? '';
  if (!host && !portRaw) return null;
  if (!host || !portRaw) throw new Error(`Set both ${VIRUS_SCAN_ENV.host} and ${VIRUS_SCAN_ENV.port}, or neither.`);
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${VIRUS_SCAN_ENV.port} must be a port number.`);
  return { host, port };
}

export function validateVirusScanConfig(): void {
  readVirusScanConfig();
}

export function isVirusScanEnabled(): boolean {
  return readVirusScanConfig() !== null;
}

/** Talks to clamd: sends the content in length-prefixed chunks and reads the verdict. */
function instream(config: { host: string; port: number }, writeContent: (send: (chunk: Buffer) => void) => Promise<void>): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.host, port: config.port });
    let reply = '';
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };
    socket.setTimeout(SCAN_TIMEOUT_MS, () => finish(() => reject(new ScannerUnavailableError('The virus scanner did not answer in time.'))));
    socket.on('error', (err) => finish(() => reject(new ScannerUnavailableError(`The virus scanner could not be reached: ${err.message}`))));
    socket.on('data', (data) => {
      reply += data.toString('utf8');
    });
    socket.on('end', () =>
      finish(() => {
        const verdict = reply.replace(/\0/g, '').trim();
        const found = /^stream: (.+) FOUND$/.exec(verdict);
        if (verdict === 'stream: OK') resolve({ clean: true });
        else if (found) resolve({ clean: false, signature: found[1] });
        else reject(new ScannerUnavailableError(`The virus scanner returned an error: ${verdict || 'no reply'}`));
      })
    );
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const send = (chunk: Buffer) => {
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      };
      writeContent(send)
        .then(() => socket.write(Buffer.alloc(4)))
        .catch((err: Error) => finish(() => reject(err)));
    });
  });
}

export async function scanBuffer(content: Buffer): Promise<ScanResult> {
  const config = readVirusScanConfig();
  if (!config) return { clean: true };
  return instream(config, async (send) => {
    for (let i = 0; i < content.length; i += CHUNK_BYTES) send(content.subarray(i, i + CHUNK_BYTES));
  });
}

export async function scanFile(absolutePath: string): Promise<ScanResult> {
  const config = readVirusScanConfig();
  if (!config) return { clean: true };
  return instream(config, async (send) => {
    for await (const chunk of fs.createReadStream(absolutePath, { highWaterMark: CHUNK_BYTES })) send(chunk as Buffer);
  });
}

/** For the health check: whether clamd answers PING. Null when scanning is off. */
export function pingScanner(): Promise<boolean | null> {
  const config = readVirusScanConfig();
  if (!config) return Promise.resolve(null);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: config.host, port: config.port });
    let reply = '';
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(5000, () => done(false));
    socket.on('error', () => done(false));
    socket.on('connect', () => socket.write('zPING\0'));
    socket.on('data', (d) => {
      reply += d.toString('utf8');
      if (reply.includes('PONG')) done(true);
    });
    socket.on('end', () => done(reply.includes('PONG')));
  });
}
