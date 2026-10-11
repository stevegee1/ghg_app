import * as bcrypt from 'bcrypt';
import { PortalRole, PrismaClient } from '@prisma/client';

export class AdminBootstrapError extends Error {}

export const MIN_ADMIN_PASSWORD_LENGTH = 14;

/** The administrator the old development seed created, on a domain the company does not own. */
export const LEGACY_SEED_ADMIN_ID = 'usr_admin_001';

/**
 * Once the configured administrator exists, the seed's administrator can no longer sign in or be
 * recovered: its password is disabled and its address replaced with one that cannot receive mail.
 * It is kept (not deleted) because platform records such as the split history name it as author.
 */
async function retireLegacySeedAdmin(prisma: PrismaClient, keepEmail: string): Promise<boolean> {
  const legacy = await prisma.portalUser.findUnique({ where: { id: LEGACY_SEED_ADMIN_ID } });
  if (!legacy || legacy.email === keepEmail || legacy.passwordHash === '!retired') return false;
  await prisma.portalUser.update({
    where: { id: LEGACY_SEED_ADMIN_ID },
    data: { email: `retired-${LEGACY_SEED_ADMIN_ID}@retired.invalid`, passwordHash: '!retired', role: PortalRole.PARTNER, licenseeId: null },
  });
  return true;
}

/**
 * Makes sure the platform has an administrator, without ever inventing credentials.
 * - ADMIN_EMAIL and ADMIN_PASSWORD both set: that account exists as an administrator with that password
 *   (the password is managed in the server environment).
 * - Neither set and an administrator already exists: nothing changes.
 * - No administrator and the variables are missing or invalid: throws, so the server does not run without one.
 * Passwords are never generated or logged.
 */
export async function ensureAdministrator(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env
): Promise<{ action: 'created' | 'updated' | 'unchanged'; email?: string; retiredSeedAdmin?: boolean }> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase() || '';
  const password = env.ADMIN_PASSWORD || '';

  if (!email && !password) {
    const admins = await prisma.portalUser.count({ where: { role: PortalRole.ADMIN } });
    if (admins > 0) return { action: 'unchanged' };
    throw new AdminBootstrapError('No administrator exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first one.');
  }
  if (!email || !password) throw new AdminBootstrapError('Set both ADMIN_EMAIL and ADMIN_PASSWORD, or neither.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminBootstrapError('ADMIN_EMAIL is not a valid email address.');
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new AdminBootstrapError(`ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = await prisma.portalUser.findUnique({ where: { email } });
  if (existing) {
    const same = existing.role === PortalRole.ADMIN && (await bcrypt.compare(password, existing.passwordHash));
    if (!same) {
      await prisma.portalUser.update({ where: { id: existing.id }, data: { role: PortalRole.ADMIN, passwordHash: await bcrypt.hash(password, 12) } });
    }
    const retiredSeedAdmin = await retireLegacySeedAdmin(prisma, email);
    return { action: same ? 'unchanged' : 'updated', email, retiredSeedAdmin };
  }
  await prisma.portalUser.create({ data: { email, role: PortalRole.ADMIN, passwordHash: await bcrypt.hash(password, 12), emailVerified: true } });
  const retiredSeedAdmin = await retireLegacySeedAdmin(prisma, email);
  return { action: 'created', email, retiredSeedAdmin };
}
