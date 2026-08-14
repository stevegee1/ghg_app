import { Router, Request, Response } from 'express';
import { PrismaClient, TransactionStatus } from '@prisma/client';

export function createTransparencyRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * GET /api/v1/transparency-ledger
   * Public transparency endpoint (unauthenticated).
   * Exposes platform-wide aggregate totals (settled transactions & charity funds routed).
   * Exposes per-partner breakdown ONLY for licensees who have explicitly opted in (isPubliclyVisible = true).
   */
  router.get('/api/v1/transparency-ledger', async (_req: Request, res: Response) => {
    try {
      // Aggregate platform-wide settled transactions
      const settledTransactions = await prisma.transaction.findMany({
        where: { status: TransactionStatus.SETTLED },
        select: {
          licenseeId: true,
          financialSplit: {
            select: { charityGiftCents: true },
          },
        },
      });

      const totalSettledTransactions = settledTransactions.length;
      const totalCharityGiftCents = settledTransactions.reduce(
        (sum, tx) => sum + (tx.financialSplit?.charityGiftCents || 0),
        0
      );

      // Fetch opted-in public licensees
      const publicLicensees = await prisma.licensee.findMany({
        where: { isPubliclyVisible: true },
        select: {
          id: true,
          name: true,
          vertical: true,
        },
      });

      const publicPartners = publicLicensees.map((lic) => {
        const partnerTxs = settledTransactions.filter((tx) => tx.licenseeId === lic.id);
        const partnerSettledCount = partnerTxs.length;
        const partnerCharityCents = partnerTxs.reduce(
          (sum, tx) => sum + (tx.financialSplit?.charityGiftCents || 0),
          0
        );

        return {
          licenseeId: lic.id,
          name: lic.name,
          vertical: lic.vertical,
          totalSettledTransactions: partnerSettledCount,
          totalCharityGiftCents: partnerCharityCents,
        };
      });

      return res.status(200).json({
        dataDisclaimer: 'Figures reflect settled licensing transactions and charitable routing only. Partner environmental claims are not independently verified by this platform.',
        totalSettledTransactions,
        totalCharityGiftCents,
        charityPercentage: 15,
        publicPartners,
      });
    } catch (err) {
      console.error('[TRANSPARENCY LEDGER ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve public transparency ledger' });
    }
  });

  return router;
}
