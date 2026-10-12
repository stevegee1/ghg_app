import { Router, Request, Response } from 'express';
import { NewsletterStatus, PortalRole, PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { confirmedSubscribersCsv, listSubscribers } from '../services/newsletter.service';

/** Newsletter subscribers for administrators. Pattern: admin-charity-reserve.route.ts. */
export function createAdminNewsletterRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.use('/api/admin/newsletter', authenticateToken);

  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    if (!req.user || req.user.role !== PortalRole.ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  };

  /** GET /api/admin/newsletter/subscribers?status=CONFIRMED */
  router.get('/api/admin/newsletter/subscribers', requireAdmin, async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status && !(Object.values(NewsletterStatus) as string[]).includes(status)) {
      return res.status(400).json({ error: 'status must be PENDING, CONFIRMED or UNSUBSCRIBED.' });
    }
    try {
      return res.status(200).json(await listSubscribers(prisma, status as NewsletterStatus | undefined));
    } catch (err) {
      console.error('[NEWSLETTER LIST ERROR]', err);
      return res.status(500).json({ error: 'Subscribers could not be loaded.' });
    }
  });

  /** GET /api/admin/newsletter/subscribers.csv: confirmed subscribers with their consent. */
  router.get('/api/admin/newsletter/subscribers.csv', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const { subscribers } = await listSubscribers(prisma, NewsletterStatus.CONFIRMED);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="newsletter-confirmed-subscribers.csv"');
      return res.status(200).send(confirmedSubscribersCsv(subscribers));
    } catch (err) {
      console.error('[NEWSLETTER CSV ERROR]', err);
      return res.status(500).json({ error: 'Subscribers could not be exported.' });
    }
  });

  return router;
}
