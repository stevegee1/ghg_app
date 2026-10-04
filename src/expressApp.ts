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
import { createEvidenceFileRouter } from './routes/evidence-file.route';
import { createFleetApiRouter } from './routes/fleet-api.route';
import { createFleetConnectionRouter } from './routes/fleet-connection.route';
import { createFleetProviderRouter } from './routes/fleet-provider.route';
import { createIsoLegalRouter } from './routes/iso-legal.route';
import { createJobReportingRouter } from './routes/job-reporting.route';
import { createOrdersRouter } from './routes/orders.route';
import { createCharitiesRouter } from './routes/charities.route';
import { createAdminCharitiesRouter } from './routes/admin-charities.route';
import { createCredentialsRouter } from './routes/credentials.route';
import { createBadgeEmbedRouter } from './routes/badge-embed.route';
import { createDemoBookingRouter } from './routes/demo-booking.route';
import { createWorkflowRouter } from './routes/workflow.route';
import { createFleetRouter } from './routes/fleet.route';
import { createMerchEnquiryRouter } from './routes/merch-enquiry.route';
import { createPartnerNetworkRouter } from './routes/partner-network.route';
import { createAssessmentRouter } from './routes/assessment.route';
import { createPreparationChecklistRouter } from './routes/preparation-checklist.route';
import { CheckoutService } from './services/checkout.service';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export function createApp(stripeInstance?: Stripe): Express {
  const app = express();

  // Trust Railway reverse proxy for accurate IP resolution and express-rate-limit compatibility
  app.set('trust proxy', 1);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeInstance && !stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY must be set to create the application.');
  }
  const stripe =
    stripeInstance ||
    new Stripe(stripeSecretKey as string, {
      apiVersion: '2024-04-10' as any,
    });

  const checkoutService = new CheckoutService(prisma, stripe);

  // Resolve the Vite dist directory relative to the project root (process.cwd())
  // This works both in dev (ts-node from project root) and in production
  // (compiled to dist/server/index.js, still launched from project root by Railway)
  const distDir = path.join(process.cwd(), 'dist');

  // Serve static files from Vite's 'dist' output and 'public'. Uploaded files live in private
  // storage and are only streamed through authenticated endpoints.
  app.use(express.static(distDir));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Security headers via Helmet (configured to allow Vite scripts and cross-origin badge embeds)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Rate Limiting: Granular limiters per endpoint class
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
  });

  const webhookLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many webhook events from this source.' },
  });

  const telemetryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Telemetry stream rate limit exceeded.' },
  });

  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'File upload rate limit exceeded. Please wait before uploading more files.' },
  });

  // Public, unauthenticated calculator: tighter limit to deter scraping and abuse.
  const calculatorLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many calculations, please try again later.' },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/webhooks/stripe', webhookLimiter);
  app.use('/api/iso/telemetry', telemetryLimiter);
  app.use('/api/fleet/v1', telemetryLimiter);
  app.use('/api/fleet/ingest', telemetryLimiter);
  app.use('/api/portal/iso/evidence/upload-file', uploadLimiter);
  app.use('/api/credentials/issue', uploadLimiter);
  app.use('/api/fleet/assets/import', uploadLimiter);
  app.use('/api/fleet/readings/import', uploadLimiter);
  app.use('/api/fleet/calculator', calculatorLimiter);

  // Use raw body parsing strictly for the webhook route
  app.use('/webhooks/stripe', express.raw({ type: '*/*' }));

  // Device messages keep their raw body so signatures can be checked over the exact bytes.
  app.use('/api/fleet/ingest/devices', express.raw({ type: '*/*', limit: '2mb' }));

  // Telemetry batches (up to 500 snapshots) need a larger body than other API calls.
  app.use('/api/fleet/v1/telemetry', express.json({ limit: '2mb' }));

  // Use JSON body parsing for all standard API routes
  app.use(express.json());

  // Mount webhook router
  app.use(createStripeWebhookRouter(prisma, stripe));

  // Mount checkout API router and B2B trigger router
  app.use(createCheckoutRouter(checkoutService, prisma, stripe));
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
  app.use(createEvidenceFileRouter(prisma));
  app.use(createIsoLegalRouter(prisma));
  app.use(createJobReportingRouter(prisma));
  app.use(createOrdersRouter(prisma));
  app.use(createCharitiesRouter(prisma));
  app.use(createAdminCharitiesRouter(prisma, stripe));
  app.use(createCredentialsRouter(prisma));
  app.use(createBadgeEmbedRouter(prisma));
  app.use(createDemoBookingRouter(prisma));
  app.use(createWorkflowRouter(prisma, checkoutService));
  app.use(createFleetRouter(prisma, stripe));
  app.use(createFleetApiRouter(prisma));
  app.use(createFleetConnectionRouter(prisma));
  app.use(createFleetProviderRouter(prisma));
  app.use(createMerchEnquiryRouter(prisma));
  app.use(createPartnerNetworkRouter(prisma));
  app.use(createAssessmentRouter(prisma));
  app.use(createPreparationChecklistRouter(prisma));

  // SPA Wildcard fallback: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhooks') || req.path.startsWith('/embed')) {
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
