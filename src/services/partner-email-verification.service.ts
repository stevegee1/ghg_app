import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { emailService } from './email.service';

/** Partner applications that confirm their email before an administrator sees them. */
export type PartnerApplicationKind = 'CHARITY' | 'DELIVERY';

const LINK_LIFETIME_MS = 48 * 60 * 60 * 1000;

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

/**
 * Stores a fresh single-use verification token on the application and emails the link.
 * Only the token's hash is stored. Follows the newsletter double opt-in (newsletter.service.ts).
 */
export async function sendPartnerVerification(
  prisma: PrismaClient,
  params: { kind: PartnerApplicationKind; applicationId: string; email: string; organisationName: string; baseUrl: string }
): Promise<void> {
  const token = newToken();
  const data = { emailVerificationHash: hash(token), emailVerificationExpires: new Date(Date.now() + LINK_LIFETIME_MS) };
  if (params.kind === 'CHARITY') {
    await prisma.charity.update({ where: { id: params.applicationId }, data });
  } else {
    await prisma.fulfillmentPartnerApplication.update({ where: { id: params.applicationId }, data });
  }

  const verifyUrl = `${params.baseUrl}/partners/verify-email?token=${encodeURIComponent(token)}`;
  const result = await emailService.sendPartnerVerificationEmail({
    toEmail: params.email,
    verifyUrl,
    organisationName: params.organisationName,
    programme: params.kind === 'CHARITY' ? 'charity partner' : 'delivery partner',
  });
  if (!result.success) {
    console.error(`[PARTNER VERIFICATION] Email not sent for ${params.kind} application ${params.applicationId}`);
  }
}

/**
 * Confirms the email behind a verification link. Returns which application was confirmed,
 * or null when the link is unknown, already used or expired.
 */
export async function confirmPartnerEmail(
  prisma: PrismaClient,
  token: string
): Promise<{ kind: PartnerApplicationKind } | null> {
  if (!token || token.length > 200) return null;
  const tokenHash = hash(token);
  const now = new Date();
  const confirmed = { emailVerifiedAt: now, emailVerificationHash: null, emailVerificationExpires: null };

  const charity = await prisma.charity.updateMany({
    where: { emailVerificationHash: tokenHash, emailVerificationExpires: { gt: now } },
    data: confirmed,
  });
  if (charity.count > 0) return { kind: 'CHARITY' };

  const delivery = await prisma.fulfillmentPartnerApplication.updateMany({
    where: { emailVerificationHash: tokenHash, emailVerificationExpires: { gt: now } },
    data: confirmed,
  });
  if (delivery.count > 0) return { kind: 'DELIVERY' };

  return null;
}
