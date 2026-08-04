import express, { Express } from 'express';
import Stripe from 'stripe';
import { prisma } from './db';
import { createStripeWebhookRouter } from './routes/webhooks.stripe';
import { createCheckoutRouter } from './routes/checkout.route';
import { CheckoutService } from './services/checkout.service';

export function createApp(stripeInstance?: Stripe): Express {
  const app = express();

  const stripe =
    stripeInstance ||
    new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2024-04-10' as any,
    });

  const checkoutService = new CheckoutService(prisma, stripe);

  // Serve static files from 'public' directory
  app.use(express.static('public'));

  // Use raw body parsing strictly for the webhook route
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Use JSON body parsing for all standard API routes
  app.use(express.json());

  // Mount webhook router
  app.use(createStripeWebhookRouter(prisma, stripe));

  // Mount checkout API router
  app.use(createCheckoutRouter(checkoutService));

  return app;
}
