import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';

export function createMerchEnquiryRouter(prisma: PrismaClient): Router {
  const router = Router();

  /**
   * POST /api/merch/enquiry
   * Public - submit a "Contact for Order" enquiry for an unpriced merch item.
   */
  router.post('/api/merch/enquiry', async (req: Request, res: Response) => {
    try {
      const { itemId, itemTitle, contactName, contactEmail, message } = req.body;

      if (!itemId || !itemTitle || !contactName || !contactEmail) {
        return res.status(400).json({
          error: 'itemId, itemTitle, contactName, and contactEmail are required.',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      const enquiry = await prisma.merchEnquiry.create({
        data: {
          itemId: String(itemId).trim(),
          itemTitle: String(itemTitle).trim(),
          contactName: String(contactName).trim(),
          contactEmail: String(contactEmail).trim().toLowerCase(),
          message: message ? String(message).trim() : null,
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
        },
      });

      // Notify the team and acknowledge the customer. The enquiry is saved either way.
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const notifications: Promise<unknown>[] = [
        emailService.sendMerchEnquiryAcknowledgement({ toEmail: enquiry.contactEmail, contactName: enquiry.contactName, itemTitle: enquiry.itemTitle }),
      ];
      if (process.env.ADMIN_EMAIL) {
        notifications.push(
          emailService.sendMerchEnquiryNotification({
            toEmail: process.env.ADMIN_EMAIL,
            itemTitle: enquiry.itemTitle,
            contactName: enquiry.contactName,
            contactEmail: enquiry.contactEmail,
            message: enquiry.message,
            adminUrl: `${baseUrl}/admin?tab=MERCH_ENQUIRIES`,
          })
        );
      }
      await Promise.allSettled(notifications);

      return res.status(201).json({
        success: true,
        enquiryId: enquiry.id,
        message: 'Your enquiry has been received. Our team will be in touch within 1 to 2 business days.',
      });
    } catch (err: any) {
      console.error('[MERCH ENQUIRY POST]', err);
      return res.status(500).json({ error: 'Failed to submit enquiry. Please try again.' });
    }
  });

  /**
   * GET /api/admin/merch-enquiries
   * Admin only - list all merch enquiries with optional status filter.
   */
  router.get('/api/admin/merch-enquiries', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const { status } = req.query;

      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = String(status);
      }

      const enquiries = await prisma.merchEnquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, enquiries });
    } catch (err: any) {
      console.error('[MERCH ENQUIRIES GET]', err);
      return res.status(500).json({ error: 'Failed to fetch enquiries.' });
    }
  });

  /**
   * PATCH /api/admin/merch-enquiries/:id
   * Admin only - update enquiry status or add admin notes.
   */
  router.patch('/api/admin/merch-enquiries/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const validStatuses = ['PENDING', 'RESPONDED', 'CLOSED'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      const updated = await prisma.merchEnquiry.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(adminNotes !== undefined ? { adminNotes: String(adminNotes).trim() } : {}),
        },
      });

      return res.json({ success: true, enquiry: updated });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Enquiry not found.' });
      }
      console.error('[MERCH ENQUIRY PATCH]', err);
      return res.status(500).json({ error: 'Failed to update enquiry.' });
    }
  });

  return router;
}
