import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AdminBootstrapError, ensureAdministrator } from '../src/services/admin-bootstrap.service';

const prisma = new PrismaClient();
const s = Date.now().toString(36);
const email = `owner.${s}@nftylogs-test.example`;

afterAll(async () => {
  await prisma.portalUser.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe('Administrator bootstrap', () => {
  it('refuses partial or weak configuration', async () => {
    await expect(ensureAdministrator(prisma, { ADMIN_EMAIL: email })).rejects.toThrow(AdminBootstrapError);
    await expect(ensureAdministrator(prisma, { ADMIN_PASSWORD: 'x'.repeat(20) })).rejects.toThrow(/both/);
    await expect(ensureAdministrator(prisma, { ADMIN_EMAIL: 'not-an-email', ADMIN_PASSWORD: 'x'.repeat(20) })).rejects.toThrow(/valid email/);
    await expect(ensureAdministrator(prisma, { ADMIN_EMAIL: email, ADMIN_PASSWORD: 'short' })).rejects.toThrow(/at least 14/);
  });

  it('creates the administrator from the environment, then leaves it alone until the password changes', async () => {
    const env = { ADMIN_EMAIL: email.toUpperCase(), ADMIN_PASSWORD: 'Correct-Horse-Battery-9' };
    expect(await ensureAdministrator(prisma, env)).toEqual({ action: 'created', email });
    const created = await prisma.portalUser.findUniqueOrThrow({ where: { email } });
    expect(created.role).toBe('ADMIN');
    expect(await bcrypt.compare(env.ADMIN_PASSWORD, created.passwordHash)).toBe(true);

    expect((await ensureAdministrator(prisma, env)).action).toBe('unchanged');
    const after = await prisma.portalUser.findUniqueOrThrow({ where: { email } });
    expect(after.passwordHash).toBe(created.passwordHash);

    expect((await ensureAdministrator(prisma, { ...env, ADMIN_PASSWORD: 'Another-Long-Password-7' })).action).toBe('updated');
  });

  it('changes nothing when no variables are set and an administrator exists, and never invents one', async () => {
    expect(await ensureAdministrator(prisma, {})).toEqual({ action: 'unchanged' });
    const admins = await prisma.portalUser.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    // With no administrator at all, start-up must stop rather than create one with a generated password.
    const tx = prisma.$transaction(async (db) => {
      await db.portalUser.updateMany({ where: { id: { in: admins.map((a) => a.id) } }, data: { role: 'PARTNER' } });
      await expect(ensureAdministrator(db as unknown as PrismaClient, {})).rejects.toThrow(/No administrator exists/);
      throw new Error('rollback');
    });
    await expect(tx).rejects.toThrow('rollback');
    expect(await prisma.portalUser.count({ where: { role: 'ADMIN' } })).toBe(admins.length);
  });
});
