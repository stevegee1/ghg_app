import express, { Express } from 'express';
import path from 'path';
import Stripe from 'stripe';
import { prisma } from './db';
import { createStripeWebhookRouter } from './routes/webhooks.stripe';
import { createCheckoutRouter } from './routes/checkout.route';
import { createAuthRouter } from './routes/auth.route';
import { createPortalRouter } from './routes/portal.route';
import { createTransparencyRouter } from './routes/transparency.route';
import { createB2bTriggerRouter } from './routes/b2b-trigger.route';
import { createAdminSplitConfigRouter } from './routes/admin-split-config.route';
import { createIsoTelemetryRouter } from './routes/iso-telemetry.route';
import { createIsoAuditRouter } from './routes/iso-audit.route';
import { createCustomKeepsakeRouter } from './routes/custom-keepsake.route';
import { createIsoEvidenceRouter } from './routes/iso-evidence.route';
import { createIsoLegalRouter } from './routes/iso-legal.route';
import { createJobReportingRouter } from './routes/job-reporting.route';
import { createOrdersRouter } from './routes/orders.route';
import { createCharitiesRouter } from './routes/charities.route';
import { CheckoutService } from './services/checkout.service';

export function createApp(stripeInstance?: Stripe): Express {
  const app = express();

  const stripe =
    stripeInstance ||
    new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2024-04-10' as any,
    });

  const checkoutService = new CheckoutService(prisma, stripe);

  // Resolve the Vite dist directory relative to the project root (process.cwd())
  // This works both in dev (ts-node from project root) and in production
  // (compiled to dist/server/index.js, still launched from project root by Railway)
  const distDir = path.join(process.cwd(), 'dist');

  // Serve static files from Vite's 'dist' output and 'public'
  app.use(express.static(distDir));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Use raw body parsing strictly for the webhook route
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Use JSON body parsing for all standard API routes
  app.use(express.json());

  // Mount webhook router
  app.use(createStripeWebhookRouter(prisma, stripe));

  // Mount checkout API router and B2B trigger router
  app.use(createCheckoutRouter(checkoutService));
  app.use(createB2bTriggerRouter(checkoutService, prisma));

  // Mount auth, portal, transparency, and admin split-config routers
  app.use(createAuthRouter(prisma));
  app.use(createPortalRouter(prisma));
  app.use(createTransparencyRouter(prisma));
  app.use(createAdminSplitConfigRouter(prisma));
  app.use(createIsoTelemetryRouter(prisma));
  app.use(createIsoAuditRouter(prisma));
  app.use(createCustomKeepsakeRouter(prisma, checkoutService));
  app.use(createIsoEvidenceRouter(prisma));
  app.use(createIsoLegalRouter(prisma));
  app.use(createJobReportingRouter(prisma));
  app.use(createOrdersRouter(prisma));
  app.use(createCharitiesRouter(prisma));

  // SPA Wildcard fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) {
        res.status(404).send(
          'Frontend build not found. Run `npm run build` or use the Vite dev server at http://localhost:5173'
        );
      }
    });
  });

  return app;
}
