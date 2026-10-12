import crypto from 'crypto';
import { NewsletterStatus, PrismaClient } from '@prisma/client';
import { emailService } from './email.service';

/** Shown next to the form and stored with each subscription as the consent given. */
export const NEWSLETTER_CONSENT_TEXT =
  'I agree to receive the NFTYLOGS newsletter by email. I can unsubscribe at any time.';

const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class NewsletterError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'NewsletterError';
  }
}

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

/**
 * Starts a double opt-in subscription. The reply is the same whether or not the address is already
 * on the list, so the form cannot be used to find out who subscribes.
 */
export async function requestSubscription(prisma: PrismaClient, rawEmail: unknown, consent: unknown, baseUrl: string, source = 'FOOTER') {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new NewsletterError('Enter a valid email address.');
  if (consent !== true) throw new NewsletterError('Tick the box to agree to receive the newsletter.');

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.status === NewsletterStatus.CONFIRMED) return;

  const confirmToken = newToken();
  const unsubscribeToken = newToken();
  const data = {
    status: NewsletterStatus.PENDING,
    consentText: NEWSLETTER_CONSENT_TEXT,
    consentAt: new Date(),
    confirmTokenHash: hash(confirmToken),
    confirmTokenExpires: new Date(Date.now() + CONFIRM_TTL_MS),
    unsubscribeTokenHash: hash(unsubscribeToken),
    unsubscribedAt: null,
    source,
  };
  if (existing) await prisma.newsletterSubscriber.update({ where: { email }, data });
  else await prisma.newsletterSubscriber.create({ data: { email, ...data } });

  const sent = await emailService.sendNewsletterConfirmationEmail({
    toEmail: email,
    confirmUrl: `${baseUrl}/api/newsletter/confirm?token=${confirmToken}`,
    unsubscribeUrl: `${baseUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`,
  });
  if (!sent.success) throw new NewsletterError('We could not send the confirmation email. Please try again later.', 503);
}

/** Confirms a subscription from the emailed link. Returns false for unknown or expired links. */
export async function confirmSubscription(prisma: PrismaClient, token: unknown): Promise<boolean> {
  if (typeof token !== 'string' || token.length < 20) return false;
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { confirmTokenHash: hash(token) } });
  if (!subscriber || !subscriber.confirmTokenExpires || subscriber.confirmTokenExpires < new Date()) return false;
  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { status: NewsletterStatus.CONFIRMED, confirmedAt: new Date(), confirmTokenHash: null, confirmTokenExpires: null },
  });
  return true;
}

/** One-click unsubscribe from any newsletter email. */
export async function unsubscribe(prisma: PrismaClient, token: unknown): Promise<boolean> {
  if (typeof token !== 'string' || token.length < 20) return false;
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeTokenHash: hash(token) } });
  if (!subscriber) return false;
  if (subscriber.status !== NewsletterStatus.UNSUBSCRIBED) {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: NewsletterStatus.UNSUBSCRIBED, unsubscribedAt: new Date(), confirmTokenHash: null, confirmTokenExpires: null },
    });
  }
  return true;
}

export interface SubscriberListing {
  counts: Record<NewsletterStatus, number>;
  subscribers: { email: string; status: NewsletterStatus; confirmedAt: Date | null; consentAt: Date; source: string }[];
}

/** For administrators: everyone on the list with their status, newest first, and a count per status. */
export async function listSubscribers(prisma: PrismaClient, status?: NewsletterStatus): Promise<SubscriberListing> {
  const [grouped, subscribers] = await Promise.all([
    prisma.newsletterSubscriber.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.newsletterSubscriber.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      select: { email: true, status: true, confirmedAt: true, consentAt: true, source: true },
    }),
  ]);
  const counts = { PENDING: 0, CONFIRMED: 0, UNSUBSCRIBED: 0 } as Record<NewsletterStatus, number>;
  for (const g of grouped) counts[g.status] = g._count._all;
  return { counts, subscribers };
}

/** CSV of confirmed subscribers only, with the consent they gave, for import into an email tool. */
export function confirmedSubscribersCsv(subscribers: SubscriberListing['subscribers']): string {
  const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = subscribers
    .filter((s) => s.status === NewsletterStatus.CONFIRMED)
    .map((s) => [s.email, s.confirmedAt?.toISOString() ?? '', s.consentAt.toISOString(), s.source].map(quote).join(','));
  return ['email,confirmed_at,consent_at,source', ...rows].join('\r\n') + '\r\n';
}
