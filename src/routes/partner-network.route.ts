import { Router, Request, Response } from 'express';
import { PrismaClient, FulfillmentPartnerStatus, CharityPartnerStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateWorkEmail } from '../utils/emailValidation';
import { confirmPartnerEmail, sendPartnerVerification } from '../services/partner-email-verification.service';

/** Services a delivery or production partner can offer. Delivery first: local delivery cuts merch emissions. */
export const PARTNER_CAPABILITIES = [
  'DELIVERY_CARGO_BIKE',
  'DELIVERY_EV_VAN',
  'DELIVERY_VAN',
  'DELIVERY_SAME_DAY',
  'LOCAL_DISPATCH',
  'DTG',
  'WATER_BASED_SCREEN',
  'EMBROIDERY',
  'CUT_SEW',
  'ECO_WAREHOUSING',
];
export const PARTNER_CERTIFICATIONS = ['GOTS', 'OEKO_TEX', 'B_CORP', 'ISO_14001', 'FAIR_WEAR', 'SUSTAINABLE_IN_PROGRESS'];
export const PARTNER_CAPACITY_BANDS = ['UNDER_500', '500_2000', '2000_10000', 'OVER_10000'];

export function createPartnerNetworkRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/partners/fulfillment/apply
   * Public - submit an application to join the global sustainable fulfillment partner network.
   */
  router.post('/api/partners/fulfillment/apply', async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        workEmail,
        countryCode,
        regionOfOperation,
        capabilities,
        monthlyCapacityUnits,
        certifications,
        message,
      } = req.body;

      if (!companyName || !workEmail || !countryCode || !regionOfOperation || !monthlyCapacityUnits) {
        return res.status(400).json({
          error: 'Company name, work email, country code, region of operation, and monthly capacity are required.',
        });
      }

      const emailCheck = validateWorkEmail(workEmail);
      if (!emailCheck.isValid) {
        return res.status(400).json({
          error: emailCheck.error || 'A valid corporate work email is required.',
        });
      }

      const validCapabilities = Array.isArray(capabilities) ? [...new Set(capabilities.map((c: unknown) => String(c).trim()))] : [];
      if (validCapabilities.length === 0 || validCapabilities.some((c) => !PARTNER_CAPABILITIES.includes(c))) {
        return res.status(400).json({ error: `Choose at least one service from: ${PARTNER_CAPABILITIES.join(', ')}.` });
      }
      const validCertifications = Array.isArray(certifications) ? [...new Set(certifications.map((c: unknown) => String(c).trim()))] : [];
      if (validCertifications.some((c) => !PARTNER_CERTIFICATIONS.includes(c))) {
        return res.status(400).json({ error: `certifications must be from: ${PARTNER_CERTIFICATIONS.join(', ')}.` });
      }
      if (!PARTNER_CAPACITY_BANDS.includes(String(monthlyCapacityUnits))) {
        return res.status(400).json({ error: `monthlyCapacityUnits must be one of: ${PARTNER_CAPACITY_BANDS.join(', ')}.` });
      }

      const application = await prisma.fulfillmentPartnerApplication.create({
        data: {
          companyName: String(companyName).trim(),
          workEmail: String(workEmail).trim().toLowerCase(),
          countryCode: String(countryCode).trim().toUpperCase(),
          regionOfOperation: String(regionOfOperation).trim(),
          capabilities: validCapabilities,
          monthlyCapacityUnits: String(monthlyCapacityUnits).trim(),
          certifications: validCertifications,
          message: message ? String(message).trim() : null,
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
        },
      });

      await sendPartnerVerification(prisma, {
        kind: 'DELIVERY',
        applicationId: application.id,
        email: application.workEmail,
        organisationName: application.companyName,
        baseUrl: process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`,
      });

      return res.status(201).json({
        success: true,
        applicationId: application.id,
        message: `We sent a confirmation link to ${application.workEmail}. Your application goes to our team once you confirm the email.`,
      });
    } catch (err: any) {
      console.error('[FULFILLMENT PARTNER APPLY POST]', err);
      return res.status(500).json({ error: 'Failed to process partner application. Please try again.' });
    }
  });

  /**
   * POST /api/partners/verify-email
   * Public - confirms the email behind a charity or delivery partner application link.
   */
  router.post('/api/partners/verify-email', async (req: Request, res: Response) => {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token : '';
      const result = await confirmPartnerEmail(prisma, token);
      if (!result) {
        return res.status(400).json({ error: 'This link is invalid or has expired. Please apply again.' });
      }
      return res.status(200).json({ success: true, kind: result.kind });
    } catch (err) {
      console.error('[PARTNER VERIFY EMAIL]', err);
      return res.status(500).json({ error: 'Could not confirm the email. Please try again.' });
    }
  });

  /**
   * POST /api/partners/charity/apply
   * Public - submit an application for an environmental or community NGO/charity to receive verified split donations.
   */
  router.post('/api/partners/charity/apply', async (req: Request, res: Response) => {
    try {
      const {
        orgName,
        workEmail,
        countryCode,
        registrationNumber,
        orgType,
        focusAreas,
        annualReportUrl,
        website,
        message,
      } = req.body;

      if (!orgName || !workEmail || !countryCode || !orgType) {
        return res.status(400).json({
          error: 'Organization name, work email, country code, and organization type are required.',
        });
      }

      const emailCheck = validateWorkEmail(workEmail);
      if (!emailCheck.isValid) {
        return res.status(400).json({
          error: emailCheck.error || 'A valid official organization email is required.',
        });
      }

      const validFocusAreas = Array.isArray(focusAreas)
        ? focusAreas.map((f: any) => String(f).trim()).filter(Boolean)
        : [];

      const application = await prisma.charityPartnerApplication.create({
        data: {
          orgName: String(orgName).trim(),
          workEmail: String(workEmail).trim().toLowerCase(),
          countryCode: String(countryCode).trim().toUpperCase(),
          registrationNumber: registrationNumber ? String(registrationNumber).trim() : null,
          orgType: String(orgType).trim(),
          focusAreas: validFocusAreas,
          annualReportUrl: annualReportUrl ? String(annualReportUrl).trim() : null,
          website: website ? String(website).trim() : null,
          message: message ? String(message).trim() : null,
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
        },
      });

      return res.status(201).json({
        success: true,
        applicationId: application.id,
        message: 'Your organization application has been submitted successfully. Our compliance and governance board will review your credentials and be in touch within 3 business days.',
      });
    } catch (err: any) {
      console.error('[CHARITY PARTNER APPLY POST]', err);
      return res.status(500).json({ error: 'Failed to submit organization application. Please try again.' });
    }
  });

  /**
   * GET /api/admin/partners/fulfillment
   * Admin only - view list of fulfillment partner applications.
   */
  router.get('/api/admin/partners/fulfillment', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const { status } = req.query;
      // Only applications whose work email has been confirmed reach the review list.
      const where: any = { emailVerifiedAt: { not: null } };
      if (status && status !== 'ALL') {
        where.status = status as FulfillmentPartnerStatus;
      }

      const applications = await prisma.fulfillmentPartnerApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, applications });
    } catch (err: any) {
      console.error('[ADMIN FULFILLMENT PARTNERS GET]', err);
      return res.status(500).json({ error: 'Failed to retrieve fulfillment partner applications.' });
    }
  });

  /**
   * GET /api/admin/partners/charity
   * Admin only - view list of charity partner applications.
   */
  router.get('/api/admin/partners/charity', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const { status } = req.query;
      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = status as CharityPartnerStatus;
      }

      const applications = await prisma.charityPartnerApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, applications });
    } catch (err: any) {
      console.error('[ADMIN CHARITY PARTNERS GET]', err);
      return res.status(500).json({ error: 'Failed to retrieve charity partner applications.' });
    }
  });

  /**
   * PATCH /api/admin/partners/fulfillment/:id
   * Admin only - update application review status and notes.
   */
  router.patch('/api/admin/partners/fulfillment/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      const validStatuses = Object.values(FulfillmentPartnerStatus);
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const existing = await prisma.fulfillmentPartnerApplication.findUnique({ where: { id }, select: { emailVerifiedAt: true } });
      if (!existing) {
        return res.status(404).json({ error: 'Application not found.' });
      }
      if (!existing.emailVerifiedAt) {
        return res.status(409).json({ error: 'The applicant has not confirmed their work email yet.' });
      }

      const updated = await prisma.fulfillmentPartnerApplication.update({
        where: { id },
        data: {
          ...(status ? { status, reviewedAt: new Date() } : {}),
          ...(reviewNotes !== undefined ? { reviewNotes: String(reviewNotes).trim() } : {}),
        },
      });

      return res.json({ success: true, application: updated });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Application not found.' });
      }
      console.error('[ADMIN FULFILLMENT PARTNER PATCH]', err);
      return res.status(500).json({ error: 'Failed to update partner application.' });
    }
  });

  /**
   * PATCH /api/admin/partners/charity/:id
   * Admin only - update charity application review status and notes.
   */
  router.patch('/api/admin/partners/charity/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      const validStatuses = Object.values(CharityPartnerStatus);
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const updated = await prisma.charityPartnerApplication.update({
        where: { id },
        data: {
          ...(status ? { status, reviewedAt: new Date() } : {}),
          ...(reviewNotes !== undefined ? { reviewNotes: String(reviewNotes).trim() } : {}),
        },
      });

      return res.json({ success: true, application: updated });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Application not found.' });
      }
      console.error('[ADMIN CHARITY PARTNER PATCH]', err);
      return res.status(500).json({ error: 'Failed to update charity application.' });
    }
  });

  return router;
}
