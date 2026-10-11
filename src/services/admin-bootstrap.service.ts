import * as bcrypt from 'bcrypt';
import { PortalRole, PrismaClient } from '@prisma/client';

export class AdminBootstrapError extends Error {}

export const MIN_ADMIN_PASSWORD_LENGTH = 14;

/**
 * Makes sure the platform has an administrator, without ever inventing credentials.
 * - ADMIN_EMAIL and ADMIN_PASSWORD both set: that account exists as an administrator with that password
 *   (the password is managed in the server environment).
 * - Neither set and an administrator already exists: nothing changes.
 * - No administrator and the variables are missing or invalid: throws, so the server does not run without one.
 * Passwords are never generated or logged.
 */
export async function ensureAdministrator(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env): Promise<{ action: 'created' | 'updated' | 'unchanged'; email?: string }> {
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
    if (same) return { action: 'unchanged', email };
    await prisma.portalUser.update({ where: { id: existing.id }, data: { role: PortalRole.ADMIN, passwordHash: await bcrypt.hash(password, 12) } });
    return { action: 'updated', email };
  }
  await prisma.portalUser.create({ data: { email, role: PortalRole.ADMIN, passwordHash: await bcrypt.hash(password, 12), emailVerified: true } });
  return { action: 'created', email };
}
