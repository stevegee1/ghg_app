import { Router, Request, Response } from 'express';
import { PrismaClient, CharityFocusPillar, CharityApplicationStatus } from '@prisma/client';

const MAX_ACTIVE_CHARITIES = 3;

export function createCharitiesRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * GET /api/charities/active
   * Public: Returns active statutory charities, their 1-year warranty details,
   * allocation metrics, and whether registration is currently open.
   */
  router.get('/api/charities/active', async (_req: Request, res: Response) => {
    try {
      const charities = await prisma.charity.findMany({
        where: { status: 'ACTIVE' },
        take: MAX_ACTIVE_CHARITIES,
        include: {
          allocations: {
            select: { amountCents: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const totalActiveCount = await prisma.charity.count({ where: { status: 'ACTIVE' } });
      const registrationOpen = totalActiveCount < MAX_ACTIVE_CHARITIES;

      // Compute warranty year: 1 year from charity creation date
      const formatted = charities.map((c) => {
        const totalDisbursedCents = c.allocations.reduce((sum, a) => sum + a.amountCents, 0);
        const warrantyStart = c.createdAt;
        const warrantyEnd = new Date(warrantyStart);
        warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          warrantyStart: warrantyStart.toISOString(),
          warrantyEnd: warrantyEnd.toISOString(),
          warrantyActive: new Date() < warrantyEnd,
          totalDisbursedCents,
          totalDisbursedGbp: (totalDisbursedCents / 100).toFixed(2),
        };
      });

      // Next intake: approximately 1 year from the most recently added active charity
      let nextIntakeDate: string | null = null;
      if (!registrationOpen && charities.length > 0) {
        const newest = charities[charities.length - 1];
        const nextIntake = new Date(newest.createdAt);
        nextIntake.setFullYear(nextIntake.getFullYear() + 1);
        nextIntakeDate = nextIntake.toISOString();
      }

      return res.status(200).json({
        activeCount: totalActiveCount,
        maxCapacity: MAX_ACTIVE_CHARITIES,
        registrationOpen,
        nextIntakeDate,
        charities: formatted,
      });
    } catch (err: any) {
      console.error('[CHARITIES ACTIVE ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve active charities.' });
    }
  });

  /**
   * POST /api/charities/register
   * Submit a legal charity intake application.
   * Returns HTTP 423 Locked if max 3 active charities are already registered.
   */
  router.post('/api/charities/register', async (req: Request, res: Response) => {
    try {
      // Enforce capacity gate at the backend — never trust frontend alone
      const activeCount = await prisma.charity.count({ where: { status: 'ACTIVE' } });

      if (activeCount >= MAX_ACTIVE_CHARITIES) {
        // Compute next intake date
        const newest = await prisma.charity.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        });
        const nextIntake = newest ? new Date(newest.createdAt) : new Date();
        nextIntake.setFullYear(nextIntake.getFullYear() + 1);

        return res.status(423).json({
          error: 'Registration is currently closed. The maximum of 3 statutory charity positions are filled.',
          registrationOpen: false,
          nextIntakeDate: nextIntake.toISOString(),
          message: `Applications will re-open after the next annual audit review on ${nextIntake.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}.`,
        });
      }

      const {
        legalEntityName,
        registrationNumber,
        registrationJurisdiction,
        headquartersAddress,
        focusPillar,
        primaryContactName,
        primaryContactEmail,
        stripeConnectedAccountId,
        annualFinancialStatementUrl,
        impactMetricDescription,
        authorizedSignatoryName,
        authorizedSignatoryTitle,
        agreedToTerms,
      } = req.body || {};

      // Validate required fields
      const requiredFields = [
        'legalEntityName', 'registrationNumber', 'registrationJurisdiction',
        'headquartersAddress', 'focusPillar', 'primaryContactName',
        'primaryContactEmail', 'impactMetricDescription',
        'authorizedSignatoryName', 'authorizedSignatoryTitle',
      ];

      for (const field of requiredFields) {
        if (!req.body[field] || typeof req.body[field] !== 'string' || !req.body[field].trim()) {
          return res.status(400).json({ error: `Missing required field: ${field}` });
        }
      }

      if (!agreedToTerms) {
        return res.status(400).json({ error: 'Authorized signatory must agree to the statutory terms.' });
      }

      const validPillars = Object.values(CharityFocusPillar);
      if (!validPillars.includes(focusPillar)) {
        return res.status(400).json({
          error: `Invalid focus pillar. Must be one of: ${validPillars.join(', ')}`,
        });
      }

      // Check for duplicate application by email
      const existing = await prisma.charityApplication.findFirst({
        where: { primaryContactEmail: primaryContactEmail.toLowerCase().trim() },
      });

      if (existing) {
        return res.status(409).json({
          error: 'An application from this email address has already been submitted.',
          applicationStatus: existing.applicationStatus,
        });
      }

      const application = await prisma.charityApplication.create({
        data: {
          legalEntityName: legalEntityName.trim(),
          registrationNumber: registrationNumber.trim(),
          registrationJurisdiction: registrationJurisdiction.trim(),
          headquartersAddress: headquartersAddress.trim(),
          focusPillar: focusPillar as CharityFocusPillar,
          primaryContactName: primaryContactName.trim(),
          primaryContactEmail: primaryContactEmail.toLowerCase().trim(),
          stripeConnectedAccountId: stripeConnectedAccountId?.trim() || null,
          annualFinancialStatementUrl: annualFinancialStatementUrl?.trim() || null,
          impactMetricDescription: impactMetricDescription.trim(),
          authorizedSignatoryName: authorizedSignatoryName.trim(),
          authorizedSignatoryTitle: authorizedSignatoryTitle.trim(),
          agreedToTerms: true,
          applicationStatus: CharityApplicationStatus.PENDING_REVIEW,
        },
      });

      return res.status(201).json({
        message: 'Your charity application has been received and is pending statutory audit review.',
        applicationId: application.id,
        applicationStatus: application.applicationStatus,
        legalEntityName: application.legalEntityName,
        submittedAt: application.createdAt,
      });
    } catch (err: any) {
      console.error('[CHARITY REGISTER ERROR]', err);
      return res.status(500).json({ error: 'Failed to submit charity registration.' });
    }
  });

  return router;
}
