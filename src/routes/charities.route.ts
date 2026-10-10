import { Router, Request, Response } from 'express';
import { validateWorkEmail } from '../utils/emailValidation';
import { sendPartnerVerification } from '../services/partner-email-verification.service';
import { PrismaClient, CharityFocusPillar, CharityApplicationStatus, CharityStatus } from '@prisma/client';
import { generateCharityPartnershipPdf } from '../services/charity-partnership-pdf.service';

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
      // Enforce capacity gate at the backend: never trust frontend alone
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

  /**
   * GET /api/charities/slots
   * Returns current statutory capacity status for the 3 slots.
   */
  router.get('/api/charities/slots', async (_req: Request, res: Response) => {
    try {
      const committedCount = await prisma.charity.count({
        where: {
          status: { in: [CharityStatus.ACTIVE, CharityStatus.APPROVED_AWAITING_STRIPE] },
        },
      });

      const activeCharities = await prisma.charity.findMany({
        where: {
          status: { in: [CharityStatus.ACTIVE, CharityStatus.APPROVED_AWAITING_STRIPE, CharityStatus.EXPIRED] },
        },
        orderBy: { createdAt: 'asc' },
        take: MAX_ACTIVE_CHARITIES,
      });

      const availableSlots = Math.max(0, MAX_ACTIVE_CHARITIES - committedCount);
      const registrationOpen = committedCount < MAX_ACTIVE_CHARITIES;

      return res.status(200).json({
        maxCapacity: MAX_ACTIVE_CHARITIES,
        committedCount,
        availableSlots,
        registrationOpen,
        slots: activeCharities.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          contractStartDate: c.contractStartDate,
          contractEndDate: c.contractEndDate,
        })),
      });
    } catch (err: any) {
      console.error('[CHARITIES SLOTS ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve charity slot status.' });
    }
  });

  /**
   * POST /api/charities/apply
   * Step 1 of Part C Charity Lifecycle:
   * Org submits name, registered charity number (if applicable), contact email, and a short statement.
   * NO Stripe info required at this stage.
   * Status = PENDING_APPLICATION.
   * Gated: Enforces server-side that new applications are only accepted while fewer than 3 charities
   * are in ACTIVE or APPROVED_AWAITING_STRIPE status combined.
   */
  router.post('/api/charities/apply', async (req: Request, res: Response) => {
    try {
      // Enforce server-side slot cap (never trust frontend alone)
      const committedCount = await prisma.charity.count({
        where: {
          status: { in: [CharityStatus.ACTIVE, CharityStatus.APPROVED_AWAITING_STRIPE] },
        },
      });

      if (committedCount >= MAX_ACTIVE_CHARITIES) {
        return res.status(423).json({
          error: 'Registration is currently closed. All 3 statutory charity positions are currently filled or in active onboarding.',
          registrationOpen: false,
          committedCount,
          maxCapacity: MAX_ACTIVE_CHARITIES,
        });
      }

      const { name, registeredCharityNumber, contactEmail, statement } = req.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Charity name is required.' });
      }

      if (!contactEmail || typeof contactEmail !== 'string') {
        return res.status(400).json({ error: 'A valid contact email address is required.' });
      }
      const emailCheck = validateWorkEmail(contactEmail);
      if (!emailCheck.isValid) {
        return res.status(400).json({ error: emailCheck.error || 'Use your organisation email address, not a personal one.' });
      }

      if (!statement || typeof statement !== 'string' || !statement.trim()) {
        return res.status(400).json({ error: 'A short mission/impact statement is required.' });
      }

      // Check for duplicate pending application with same email
      const existing = await prisma.charity.findFirst({
        where: {
          contactEmail: contactEmail.toLowerCase().trim(),
          status: { in: [CharityStatus.PENDING_APPLICATION, CharityStatus.APPROVED_AWAITING_STRIPE, CharityStatus.ACTIVE] },
        },
      });

      if (existing) {
        return res.status(409).json({
          error: 'An active or pending charity partner record already exists with this contact email.',
          charityId: existing.id,
          status: existing.status,
        });
      }

      const charity = await prisma.charity.create({
        data: {
          name: name.trim(),
          registeredCharityNumber: registeredCharityNumber?.trim() || null,
          contactEmail: contactEmail.toLowerCase().trim(),
          statement: statement.trim(),
          status: CharityStatus.PENDING_APPLICATION,
          // No Stripe info at this stage
          stripeConnectedAccountId: null,
        },
      });

      await sendPartnerVerification(prisma, {
        kind: 'CHARITY',
        applicationId: charity.id,
        email: charity.contactEmail ?? contactEmail.toLowerCase().trim(),
        organisationName: charity.name,
        baseUrl: process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`,
      });

      return res.status(201).json({
        success: true,
        message: `We sent a confirmation link to ${charity.contactEmail}. Your application goes to our team once you confirm the email.`,
        charity: {
          id: charity.id,
          name: charity.name,
          status: charity.status,
          contactEmail: charity.contactEmail,
          submittedAt: charity.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[CHARITY APPLY ERROR]', err);
      return res.status(500).json({ error: 'Failed to submit charity application.' });
    }
  });

  /**
   * GET /api/charities/:id/partnership-pdf
   * Step 4: Downloads/streams the official PDF Proof of Partnership.
   */
  router.get('/api/charities/:id/partnership-pdf', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const charity = await prisma.charity.findUnique({
        where: { id },
      });

      if (!charity) {
        return res.status(404).json({ error: 'Charity not found.' });
      }

      const pdfBuffer = await generateCharityPartnershipPdf(charity);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="GHG-Charity-Partnership-${charity.id}.pdf"`
      );
      return res.status(200).send(pdfBuffer);
    } catch (err: any) {
      console.error('[CHARITY PARTNERSHIP PDF ERROR]', err);
      return res.status(500).json({ error: 'Failed to generate charity partnership PDF.' });
    }
  });

  return router;
}
