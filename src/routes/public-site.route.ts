import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { NEWSLETTER_CONSENT_TEXT, NewsletterError, confirmSubscription, requestSubscription, unsubscribe } from '../services/newsletter.service';

/** Public endpoints behind the marketing site: newsletter double opt-in and the live charity share. */
export function createPublicSiteRouter(prisma: PrismaClient): Router {
  const router = Router();
  const baseUrl = (req: Request) => process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;

  router.get('/api/newsletter/consent', (_req: Request, res: Response) => {
    res.status(200).json({ consentText: NEWSLETTER_CONSENT_TEXT });
  });

  /** POST /api/newsletter/subscribe { email, consent: true }: sends a confirmation email. */
  router.post('/api/newsletter/subscribe', async (req: Request, res: Response) => {
    try {
      await requestSubscription(prisma, req.body?.email, req.body?.consent, baseUrl(req), 'FOOTER');
      return res.status(202).json({ message: 'Check your inbox to confirm your subscription.' });
    } catch (err) {
      if (err instanceof NewsletterError) return res.status(err.status).json({ error: err.message });
      console.error('[NEWSLETTER SUBSCRIBE ERROR]', err);
      return res.status(500).json({ error: 'The subscription could not be started. Please try again later.' });
    }
  });

  router.get('/api/newsletter/confirm', async (req: Request, res: Response) => {
    try {
      const ok = await confirmSubscription(prisma, req.query.token);
      return res.redirect(303, `/newsletter?status=${ok ? 'confirmed' : 'invalid'}`);
    } catch (err) {
      console.error('[NEWSLETTER CONFIRM ERROR]', err);
      return res.redirect(303, '/newsletter?status=error');
    }
  });

  router.get('/api/newsletter/unsubscribe', async (req: Request, res: Response) => {
    try {
      const ok = await unsubscribe(prisma, req.query.token);
      return res.redirect(303, `/newsletter?status=${ok ? 'unsubscribed' : 'invalid'}`);
    } catch (err) {
      console.error('[NEWSLETTER UNSUBSCRIBE ERROR]', err);
      return res.redirect(303, '/newsletter?status=error');
    }
  });

  /**
   * GET /api/public/charity-share: the share of each payment that goes to partner charities, from the
   * platform's active split configuration. Null when no split is configured, so the site shows no figure.
   */
  router.get('/api/public/charity-share', async (_req: Request, res: Response) => {
    try {
      const config = await prisma.splitConfigHistory.findFirst({
        where: { licenseeId: null, isActive: true },
        orderBy: { changedAt: 'desc' },
        select: { royaltyBps: true },
      });
      res.setHeader('Cache-Control', 'public, max-age=300');
      if (!config) return res.status(200).json({ percent: null });
      const percent = ((10000 - config.royaltyBps) / 100).toFixed(2).replace(/\.?0+$/, '');
      return res.status(200).json({ percent });
    } catch (err) {
      console.error('[PUBLIC CHARITY SHARE ERROR]', err);
      return res.status(500).json({ error: 'Unavailable.' });
    }
  });

  return router;
}
