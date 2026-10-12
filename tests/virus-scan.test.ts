import fs from 'fs';
import net from 'net';
import path from 'path';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { scanBuffer, validateVirusScanConfig } from '../src/services/virus-scan.service';
import { scrubEvent } from '../src/utils/sentryScrub';

/**
 * A stand-in for clamd speaking the INSTREAM protocol: it reassembles the length-prefixed chunks
 * and reports the standard EICAR test string as infected.
 */
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
let fakeClamd: net.Server;
let clamdPort: number;
const received: Buffer[] = [];

function startFakeClamd(): Promise<void> {
  return new Promise((resolve) => {
    fakeClamd = net.createServer((socket) => {
      let buffer = Buffer.alloc(0);
      let command = '';
      socket.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        if (!command) {
          const end = buffer.indexOf(0);
          if (end === -1) return;
          command = buffer.subarray(0, end).toString();
          buffer = buffer.subarray(end + 1);
          if (command === 'zPING') {
            socket.end('PONG\0');
            return;
          }
        }
        const chunks: Buffer[] = [];
        let offset = 0;
        while (buffer.length - offset >= 4) {
          const size = buffer.readUInt32BE(offset);
          if (size === 0) {
            const content = Buffer.concat(chunks);
            received.push(content);
            socket.end(content.includes(EICAR) ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0');
            return;
          }
          if (buffer.length - offset - 4 < size) return;
          chunks.push(buffer.subarray(offset + 4, offset + 4 + size));
          offset += 4 + size;
        }
      });
    });
    fakeClamd.listen(0, '127.0.0.1', () => {
      clamdPort = (fakeClamd.address() as net.AddressInfo).port;
      resolve();
    });
  });
}

const prisma = new PrismaClient();
const app = createApp();
const suffix = Date.now().toString(36);
let token: string;
let licenseeId: string;
let userId: string;
const saved = { host: process.env.CLAMAV_HOST, port: process.env.CLAMAV_PORT };

beforeAll(async () => {
  await startFakeClamd();
  const licensee = await prisma.licensee.create({ data: { name: `Scan ${suffix}`, vertical: Vertical.B2B_CLEAN_TECH } });
  const user = await prisma.portalUser.create({ data: { email: `scan.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licensee.id } });
  licenseeId = licensee.id;
  userId = user.id;
  token = jwt.sign({ userId, role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
});

beforeEach(() => {
  process.env.CLAMAV_HOST = '127.0.0.1';
  process.env.CLAMAV_PORT = String(clamdPort);
});

afterEach(() => {
  process.env.CLAMAV_HOST = saved.host;
  process.env.CLAMAV_PORT = saved.port;
  if (saved.host === undefined) delete process.env.CLAMAV_HOST;
  if (saved.port === undefined) delete process.env.CLAMAV_PORT;
});

afterAll(async () => {
  fakeClamd.close();
  await prisma.auditEvidenceDocument.deleteMany({ where: { licenseeId } });
  await prisma.portalUser.deleteMany({ where: { id: userId } });
  await prisma.licensee.deleteMany({ where: { id: licenseeId } });
  await prisma.$disconnect();
});

const evidenceDir = () => path.join(process.env.FILE_STORAGE_DIR as string, 'evidence', licenseeId);
const evidenceFiles = () => (fs.existsSync(evidenceDir()) ? fs.readdirSync(evidenceDir()).length : 0);

describe('Virus scanning of uploads', () => {
  it('sends the whole file to clamd and accepts clean content', async () => {
    const content = Buffer.alloc(200 * 1024, 'a');
    expect(await scanBuffer(content)).toEqual({ clean: true });
    expect(received[received.length - 1].equals(content)).toBe(true);
  });

  it('refuses an infected evidence file and stores nothing', async () => {
    const before = evidenceFiles();
    const res = await request(app)
      .post('/api/workflow/evidence/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(EICAR), { filename: 'invoice.pdf', contentType: 'application/pdf' })
      .expect(422);
    expect(res.body.error).toMatch(/malware/);
    expect(evidenceFiles()).toBe(before);
  });

  it('stores a clean evidence file after scanning', async () => {
    await request(app)
      .post('/api/workflow/evidence/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('%PDF-1.4 clean'), { filename: 'invoice.pdf', contentType: 'application/pdf' })
      .expect(201);
  });

  it('refuses uploads while the scanner is unreachable, instead of storing them unscanned', async () => {
    process.env.CLAMAV_PORT = '1';
    const before = evidenceFiles();
    const res = await request(app)
      .post('/api/workflow/evidence/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('%PDF-1.4 clean'), { filename: 'invoice.pdf', contentType: 'application/pdf' })
      .expect(503);
    expect(res.body.error).toMatch(/virus scanner is unavailable/);
    expect(evidenceFiles()).toBe(before);
  });

  it('deletes an infected logo that was written to disk', async () => {
    const logoDir = path.join(process.env.FILE_STORAGE_DIR as string, 'logos', licenseeId);
    const before = fs.existsSync(logoDir) ? fs.readdirSync(logoDir).length : 0;
    await request(app)
      .put('/api/portal/profile/logo')
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', Buffer.from(EICAR), { filename: 'logo.png', contentType: 'image/png' })
      .expect(422);
    await new Promise((r) => setTimeout(r, 100));
    expect(fs.existsSync(logoDir) ? fs.readdirSync(logoDir).length : 0).toBe(before);
  });

  it('reports the scanner in the health check without failing it', async () => {
    const res = await request(app).get('/healthz').expect(200);
    expect(res.body.checks.virusScanner).toBe(true);
  });

  it('requires both scanner settings or neither', () => {
    delete process.env.CLAMAV_PORT;
    expect(() => validateVirusScanConfig()).toThrow(/CLAMAV_HOST and CLAMAV_PORT/);
  });
});

describe('Error report scrubbing', () => {
  it('removes credentials, cookies, bodies, tokens in URLs and personal details', () => {
    const event = scrubEvent({
      request: {
        url: 'https://x.example/api/newsletter/confirm?token=secret123&page=2',
        headers: { Authorization: 'Bearer abc', Cookie: 'sid=1', 'X-Api-Key': 'k', 'User-Agent': 'UA' },
        cookies: { sid: '1' },
        data: { password: 'p' },
        query_string: 'token=secret123',
      },
      user: { id: 'usr_1', email: 'a@b.com', ip_address: '1.2.3.4' },
    });
    expect(event.request!.headers).toEqual({ 'User-Agent': 'UA' });
    expect(event.request!.cookies).toBeUndefined();
    expect(event.request!.data).toBeUndefined();
    expect(event.request!.query_string).toBeUndefined();
    expect(event.request!.url).toBe('https://x.example/api/newsletter/confirm?token=[removed]&page=2');
    expect(event.user).toEqual({ id: 'usr_1' });
  });
});
