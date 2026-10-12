import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { emailService } from '../src/services/email.service';
import { NEWSLETTER_CONSENT_TEXT } from '../src/services/newsletter.service';

const prisma = new PrismaClient();
const app = createApp();
const EMAIL = `newsletter.${Date.now().toString(36)}@example.com`;

/** Captures the links in the confirmation email instead of sending it. */
function captureEmails() {
  const sent: { toEmail: string; confirmUrl: string; unsubscribeUrl: string }[] = [];
  jest.spyOn(emailService, 'sendNewsletterConfirmationEmail').mockImplementation(async (params) => {
    sent.push(params);
    return { success: true, provider: 'TEST' };
  });
  return sent;
}

const pathOf = (url: string) => {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
};

afterAll(async () => {
  await prisma.newsletterSubscriber.deleteMany({ where: { email: { in: [EMAIL, 'second.' + EMAIL] } } });
  await prisma.$disconnect();
});

describe('Newsletter double opt-in', () => {
  it('requires a valid email and explicit consent', async () => {
    captureEmails();
    await request(app).post('/api/newsletter/subscribe').send({ email: 'not-an-email', consent: true }).expect(400);
    const noConsent = await request(app).post('/api/newsletter/subscribe').send({ email: EMAIL }).expect(400);
    expect(noConsent.body.error).toMatch(/agree/);
    expect(await prisma.newsletterSubscriber.count({ where: { email: EMAIL } })).toBe(0);
  });

  it('stays pending until the emailed link is followed, and records the consent given', async () => {
    const sent = captureEmails();
    await request(app).post('/api/newsletter/subscribe').send({ email: ` ${EMAIL.toUpperCase()} `, consent: true }).expect(202);
    expect(sent).toHaveLength(1);
    expect(sent[0].toEmail).toBe(EMAIL);

    const pending = await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL } });
    expect(pending).toMatchObject({ status: 'PENDING', consentText: NEWSLETTER_CONSENT_TEXT });
    const token = new URL(sent[0].confirmUrl).searchParams.get('token')!;
    expect(pending!.confirmTokenHash).not.toBe(token);

    const confirmed = await request(app).get(pathOf(sent[0].confirmUrl)).expect(303);
    expect(confirmed.headers.location).toBe('/newsletter?status=confirmed');
    expect((await prisma.newsletterSubscriber.findUnique({ where: { email: EMAIL } }))!.status).toBe('CONFIRMED');

    // The confirmation link only works once.
    const again = await request(app).get(pathOf(sent[0].confirmUrl)).expect(303);
    expect(again.headers.location).toBe('/newsletter?status=invalid');
  });

  it('gives the same reply for an address already subscribed, without sending again', async () => {
    const sent = captureEmails();
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: EMAIL, consent: true }).expect(202);
    expect(res.body.message).toMatch(/Check your inbox/);
    expect(sent).toHaveLength(0);
  });

  it('unsubscribes in one click and rejects unknown links', async () => {
    const sent = captureEmails();
    await request(app).post('/api/newsletter/subscribe').send({ email: 'second.' + EMAIL, consent: true }).expect(202);
    const res = await request(app).get(pathOf(sent[0].unsubscribeUrl)).expect(303);
    expect(res.headers.location).toBe('/newsletter?status=unsubscribed');
    expect((await prisma.newsletterSubscriber.findUnique({ where: { email: 'second.' + EMAIL } }))!.status).toBe('UNSUBSCRIBED');

    const bogus = await request(app).get('/api/newsletter/unsubscribe?token=this-token-does-not-exist-anywhere').expect(303);
    expect(bogus.headers.location).toBe('/newsletter?status=invalid');
  });

  it('reports a failure to send instead of pretending to subscribe', async () => {
    jest.spyOn(emailService, 'sendNewsletterConfirmationEmail').mockResolvedValue({ success: false, provider: 'NONE' });
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'third.' + EMAIL, consent: true }).expect(503);
    expect(res.body.error).toMatch(/could not send/);
    await prisma.newsletterSubscriber.deleteMany({ where: { email: 'third.' + EMAIL } });
  });
});

describe('Newsletter subscribers for administrators', () => {
  const adminToken = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
  const clientToken = jwt.sign({ userId: 'client', role: 'PARTNER', licenseeId: 'lic_x' }, JWT_SECRET, { expiresIn: '1h' });
  const pendingEmail = `pending.${Date.now().toString(36)}@example.com`;

  beforeAll(async () => {
    await prisma.newsletterSubscriber.create({
      data: { email: pendingEmail, status: 'PENDING', consentText: NEWSLETTER_CONSENT_TEXT, consentAt: new Date(), unsubscribeTokenHash: `h_${pendingEmail}` },
    });
  });

  afterAll(async () => {
    await prisma.newsletterSubscriber.deleteMany({ where: { email: pendingEmail } });
  });

  it('lists subscribers by status for administrators only', async () => {
    await request(app).get('/api/admin/newsletter/subscribers').set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app).get('/api/admin/newsletter/subscribers?status=BOGUS').set('Authorization', `Bearer ${adminToken}`).expect(400);
    const res = await request(app).get('/api/admin/newsletter/subscribers?status=PENDING').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.subscribers.map((s: { email: string }) => s.email)).toContain(pendingEmail);
    expect(res.body.counts.PENDING).toBeGreaterThanOrEqual(1);
  });

  it('exports confirmed subscribers only, never pending ones', async () => {
    const res = await request(app).get('/api/admin/newsletter/subscribers.csv').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.split('\r\n')[0]).toBe('email,confirmed_at,consent_at,source');
    expect(res.text).not.toContain(pendingEmail);
  });
});

describe('Public site data', () => {
  it('reports the live charity share from the platform split, or none', async () => {
    const config = await prisma.splitConfigHistory.findFirst({ where: { licenseeId: null, isActive: true }, orderBy: { changedAt: 'desc' } });
    const res = await request(app).get('/api/public/charity-share').expect(200);
    if (config) {
      expect(Number(res.body.percent)).toBeCloseTo((10000 - config.royaltyBps) / 100, 2);
    } else {
      expect(res.body.percent).toBeNull();
    }
  });

  it('does not expose charity payment account ids on the public slots endpoint', async () => {
    const res = await request(app).get('/api/charities/slots').expect(200);
    expect(res.body.maxCapacity).toBe(3);
    expect(JSON.stringify(res.body)).not.toMatch(/stripeConnectedAccountId|acct_/);
  });
});

describe('Health check', () => {
  it('reports ok when the database and file storage are available', async () => {
    const res = await request(app).get('/healthz').expect(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: true, fileStorage: true } });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('reports unavailable when file storage is missing, without exposing paths', async () => {
    const saved = process.env.FILE_STORAGE_DIR;
    process.env.FILE_STORAGE_DIR = `${saved}-missing-${Date.now()}`;
    try {
      const res = await request(app).get('/healthz').expect(503);
      expect(res.body).toEqual({ status: 'unavailable', checks: { database: true, fileStorage: false } });
      expect(JSON.stringify(res.body)).not.toContain('missing');
    } finally {
      process.env.FILE_STORAGE_DIR = saved;
    }
  });
});
