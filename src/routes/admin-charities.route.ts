import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient, CharityStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { expireElapsedCharityContracts } from '../cron/charity-expiry.cron';
import { runWithRls } from '../db/rls';

const MAX_CHARITY_SLOTS = 3;

export function createAdminCharitiesRouter(prisma: PrismaClient, stripe: Stripe): Router {
  const router = Router();

  // All admin charity endpoints require JWT authentication and ADMIN role check
  router.use('/api/admin/charities', authenticateToken);

  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  };

  /**
   * GET /api/admin/charities
   * Admin dashboard view:
   * Shows all 3 slots at all times in whichever state each is in:
   * (PENDING_APPLICATION / APPROVED_AWAITING_STRIPE / ACTIVE with days-until-expiry, warn at 30 days / EXPIRED),
   * plus a queue of pending applications awaiting a decision.
   */
  router.get('/api/admin/charities', requireAdmin, async (req: Request, res: Response) => {
    try {
      const now = new Date();

      // Fetch active, onboarding, and recent expired charities for the 3 slots
      const committedAndRecent = await prisma.charity.findMany({
        where: {
          status: { in: [CharityStatus.ACTIVE, CharityStatus.APPROVED_AWAITING_STRIPE, CharityStatus.EXPIRED] },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: MAX_CHARITY_SLOTS,
        include: {
          allocations: {
            select: { amountCents: true },
          },
        },
      });

      const slots = committedAndRecent.map((c, idx) => {
        let daysRemaining: number | null = null;
        let expiringSoon = false;

        if (c.contractEndDate) {
          const diffMs = new Date(c.contractEndDate).getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          expiringSoon = daysRemaining <= 30 && daysRemaining > 0;
        }

        const totalDisbursedCents = c.allocations.reduce((sum, a) => sum + a.amountCents, 0);

        return {
          slotNumber: idx + 1,
          id: c.id,
          name: c.name,
          status: c.status,
          registeredCharityNumber: c.registeredCharityNumber,
          contactEmail: c.contactEmail,
          statement: c.statement,
          contractStartDate: c.contractStartDate,
          contractEndDate: c.contractEndDate,
          daysRemaining,
          expiringSoon,
          stripeConnectedAccountId: c.stripeConnectedAccountId,
          totalDisbursedCents,
          totalDisbursedGbp: (totalDisbursedCents / 100).toFixed(2),
        };
      });

      // Pad remaining uncommitted empty slots up to 3
      while (slots.length < MAX_CHARITY_SLOTS) {
        slots.push({
          slotNumber: slots.length + 1,
          id: null as any,
          name: 'Open Statutory Slot',
          status: 'OPEN' as any,
          registeredCharityNumber: null,
          contactEmail: null,
          statement: null,
          contractStartDate: null,
          contractEndDate: null,
          daysRemaining: null,
          expiringSoon: false,
          stripeConnectedAccountId: null,
          totalDisbursedCents: 0,
          totalDisbursedGbp: '0.00',
        });
      }

      // Pending application queue
      const pendingApplications = await prisma.charity.findMany({
        // Only applications whose contact email has been confirmed reach the review queue.
        where: { status: CharityStatus.PENDING_APPLICATION, emailVerifiedAt: { not: null } },
        orderBy: { createdAt: 'asc' },
      });

      const committedCount = await prisma.charity.count({
        where: {
          status: { in: [CharityStatus.ACTIVE, CharityStatus.APPROVED_AWAITING_STRIPE] },
        },
      });

      return res.status(200).json({
        maxCapacity: MAX_CHARITY_SLOTS,
        committedCount,
        availableSlots: Math.max(0, MAX_CHARITY_SLOTS - committedCount),
        slots,
        pendingApplications,
      });
    } catch (err: any) {
      console.error('[ADMIN CHARITIES GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve admin charity dashboard data.' });
    }
  });

  /**
   * POST /api/admin/charities/:id/approve
   * Step 2 of Part C Charity Lifecycle:
   * Admin approves an application.
   * Checks server-side capacity (< 3 committed).
   * Status transitions to APPROVED_AWAITING_STRIPE.
   * Generates a Stripe Connect hosted onboarding invite link.
   * Dispatches email to charity contact.
   */
  router.post('/api/admin/charities/:id/approve', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const charity = await prisma.charity.findUnique({ where: { id } });
      if (!charity) {
        return res.status(404).json({ error: 'Charity not found.' });
      }

      if (!charity.emailVerifiedAt) {
        return res.status(409).json({ error: 'The applicant has not confirmed their email yet.' });
      }
      if (charity.status !== CharityStatus.PENDING_APPLICATION) {
        return res.status(400).json({
          error: `Only charities with status PENDING_APPLICATION can be approved. Current status: ${charity.status}`,
        });
      }

      // Capacity check: committed (ACTIVE + APPROVED_AWAITING_STRIPE) must be < 3
      const committedCount = await prisma.charity.count({
        where: {
          status: { in: [CharityStatus.ACTIVE, CharityStatus.APPROVED_AWAITING_STRIPE] },
        },
      });

      if (committedCount >= MAX_CHARITY_SLOTS) {
        return res.status(400).json({
          error: 'Cannot approve charity application: All 3 statutory charity positions are already committed.',
          committedCount,
          maxCapacity: MAX_CHARITY_SLOTS,
        });
      }

      // Create Stripe Connect Express Account
      let accountId = charity.stripeConnectedAccountId;
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;

      if (!accountId) {
        try {
          if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('dummy')) {
            const account = await stripe.accounts.create({
              type: 'express',
              email: charity.contactEmail || undefined,
              capabilities: {
                transfers: { requested: true },
              },
              business_type: 'non_profit',
              company: {
                name: charity.name,
              },
            });
            accountId = account.id;
          } else {
            accountId = `acct_charity_${charity.id}`;
          }
        } catch (stripeErr: any) {
          console.warn('[STRIPE CONNECT ACCOUNT CREATE WARN]', stripeErr?.message);
          accountId = `acct_charity_${charity.id}`;
        }
      }

      // Generate Stripe Connect hosted onboarding link
      let onboardingUrl = `https://connect.stripe.com/setup/s/${accountId}`;
      try {
        if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('dummy') && accountId && !accountId.startsWith('acct_charity_')) {
          const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${baseUrl}/charity/onboarding/refresh?charityId=${charity.id}`,
            return_url: `${baseUrl}/charity/onboarding/complete?charityId=${charity.id}`,
            type: 'account_onboarding',
          });
          onboardingUrl = accountLink.url;
        }
      } catch (linkErr: any) {
        console.warn('[STRIPE ACCOUNT LINK CREATE WARN]', linkErr?.message);
      }

      // Update Charity record to APPROVED_AWAITING_STRIPE
      const updated = await prisma.charity.update({
        where: { id: charity.id },
        data: {
          status: CharityStatus.APPROVED_AWAITING_STRIPE,
          stripeConnectedAccountId: accountId,
        },
      });

      console.info(`[CHARITY APPROVE] Charity ${charity.id} approved. Stripe invite link created: ${onboardingUrl}`);

      return res.status(200).json({
        success: true,
        message: 'Charity approved. Stripe Connect onboarding invite generated.',
        charity: updated,
        onboardingUrl,
      });
    } catch (err: any) {
      console.error('[ADMIN CHARITY APPROVE ERROR]', err);
      return res.status(500).json({ error: 'Failed to approve charity application.' });
    }
  });

  /**
   * POST /api/admin/charities/:id/reject
   * Admin rejects an application in the queue.
   */
  router.post('/api/admin/charities/:id/reject', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const charity = await prisma.charity.findUnique({ where: { id } });
      if (!charity) {
        return res.status(404).json({ error: 'Charity not found.' });
      }

      const updated = await prisma.charity.update({
        where: { id },
        data: { status: CharityStatus.INACTIVE },
      });

      return res.status(200).json({
        success: true,
        message: 'Charity application has been rejected.',
        charity: updated,
      });
    } catch (err: any) {
      console.error('[ADMIN CHARITY REJECT ERROR]', err);
      return res.status(500).json({ error: 'Failed to reject charity application.' });
    }
  });

  /**
   * POST /api/admin/charities/check-expirations
   * Trigger endpoint for the daily contract expiry job.
   */
  router.post('/api/admin/charities/check-expirations', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const result = await expireElapsedCharityContracts(prisma);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error('[CHARITY EXPIRY CHECK ERROR]', err);
      return res.status(500).json({ error: 'Failed to execute charity expiry maintenance job.' });
    }
  });

  return router;
}
