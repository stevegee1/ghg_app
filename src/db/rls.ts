import { PrismaClient, Prisma } from '@prisma/client';

export interface UserAuthScope {
  role: string;
  licenseeId?: string | null;
}

/**
 * Executes a database operation inside a transaction block where PostgreSQL RLS session variables
 * (`app.current_licensee_id` and `app.is_admin`) are set via `SET LOCAL`.
 *
 * This ensures Row-Level Security policies on Transaction, FinancialSplit, and TriggerEvent
 * are enforced at the database level according to the authenticated user's scope.
 */
export async function runWithRls<T>(
  prisma: PrismaClient,
  user: UserAuthScope,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const isAdmin = user.role === 'ADMIN';
  const licenseeId = user.licenseeId || '';

  // Defense-in-depth: Validate licenseeId format before interpolating into SQL
  if (licenseeId !== '' && !/^[a-zA-Z0-9_-]{1,128}$/.test(licenseeId)) {
    throw new Error(`Invalid licenseeId format: ${licenseeId}`);
  }

  return prisma.$transaction(async (tx) => {
    const safeLicenseeId = licenseeId.replace(/'/g, "''");
    const safeIsAdmin = isAdmin ? 'true' : 'false';

    await tx.$executeRawUnsafe('SET LOCAL ROLE ghg_app_user;');
    await tx.$executeRawUnsafe('SET LOCAL search_path TO public;');
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_licensee_id = '${safeLicenseeId}';`
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL app.is_admin = '${safeIsAdmin}';`
    );

    return fn(tx);
  });
}
