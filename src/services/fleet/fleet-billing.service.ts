import Stripe from 'stripe';
import {
  DeliveryType,
  EntitlementStatus,
  FleetSubscriptionStatus,
  Prisma,
  PrismaClient,
  ServiceLine,
  TransactionStatus,
  VerificationSource,
} from '@prisma/client';
import { resolveActiveSplitConfig } from '../split-config.service';
import { computeCharityAllocations } from '../charity-allocation.service';
import { TransactionService } from '../transaction.service';
import { PLATFORM_LICENSEE_ID } from '../platform-account.service';
import { payCharityAllocations } from '../settlement.service';

export const FLEET_SERVICE_TAG = 'FLEET';
const ENTITLEMENT_ACTOR = 'STRIPE_SUBSCRIPTION';

export class FleetBillingError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'FleetBillingError';
  }
}

/** Stripe Price for one asset per month. The amount lives in Stripe; its ID comes from env. */
export function getFleetPriceId(): string {
  const priceId = process.env.STRIPE_FLEET_PRICE_ID?.trim();
  if (!priceId || !priceId.startsWith('price_')) {
    throw new Error('STRIPE_FLEET_PRICE_ID must be set to the Stripe Price ID for one asset per month (price_...).');
  }
  return priceId;
}

/** Billed quantity: active assets, with a minimum of one while a subscription exists. */
export async function countBillableAssets(prisma: PrismaClient, licenseeId: string): Promise<number> {
  return prisma.fleetAsset.count({ where: { licenseeId, active: true } });
}

export async function createFleetSubscriptionCheckout(
  prisma: PrismaClient,
  stripe: Stripe,
  params: { licenseeId: string; customerEmail: string; successUrl: string; cancelUrl: string }
): Promise<{ checkoutUrl: string; quantity: number }> {
  const priceId = getFleetPriceId();
  const quantity = await countBillableAssets(prisma, params.licenseeId);
  if (quantity === 0) {
    throw new FleetBillingError('Register at least one active asset before subscribing.', 409);
  }

  const existing = await prisma.fleetSubscription.findUnique({ where: { licenseeId: params.licenseeId } });
  if (existing && (existing.status === FleetSubscriptionStatus.ACTIVE || existing.status === FleetSubscriptionStatus.PAST_DUE)) {
    throw new FleetBillingError('A Fleet subscription is already active. Manage it from the billing portal.', 409);
  }

  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: params.customerEmail,
      metadata: { licenseeId: params.licenseeId },
    });
    customerId = customer.id;
    await prisma.fleetSubscription.create({
      data: { licenseeId: params.licenseeId, stripeCustomerId: customerId, status: FleetSubscriptionStatus.INCOMPLETE },
    });
  }

  const metadata = { licenseeId: params.licenseeId, service: FLEET_SERVICE_TAG };
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity }],
    subscription_data: { metadata },
    metadata,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a subscription checkout URL.');
  }
  return { checkoutUrl: session.url, quantity };
}

/** The per-asset price as configured in Stripe, so the UI never hardcodes it. */
export async function getFleetPricing(stripe: Stripe): Promise<{ unitAmount: number; currency: string; interval: string }> {
  const price = await stripe.prices.retrieve(getFleetPriceId());
  if (price.unit_amount === null || !price.recurring) {
    throw new Error('The Fleet Stripe Price must be a recurring per-unit price.');
  }
  return { unitAmount: price.unit_amount, currency: price.currency.toUpperCase(), interval: price.recurring.interval };
}

export async function createFleetBillingPortal(
  prisma: PrismaClient,
  stripe: Stripe,
  licenseeId: string,
  returnUrl: string
): Promise<string> {
  const subscription = await prisma.fleetSubscription.findUnique({ where: { licenseeId } });
  if (!subscription) {
    throw new FleetBillingError('No Fleet subscription exists for this account.', 404);
  }
  const portal = await stripe.billingPortal.sessions.create({ customer: subscription.stripeCustomerId, return_url: returnUrl });
  return portal.url;
}

/** Updates the Stripe quantity to the current active asset count. Prorations follow Stripe defaults. */
export async function syncFleetQuantity(prisma: PrismaClient, stripe: Stripe, licenseeId: string): Promise<void> {
  const subscription = await prisma.fleetSubscription.findUnique({ where: { licenseeId } });
  if (
    !subscription?.stripeSubscriptionId ||
    (subscription.status !== FleetSubscriptionStatus.ACTIVE && subscription.status !== FleetSubscriptionStatus.PAST_DUE)
  ) {
    return;
  }

  const quantity = Math.max(await countBillableAssets(prisma, licenseeId), 1);
  if (quantity === subscription.quantity) return;

  const remote = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const item = remote.items.data[0];
  if (!item) {
    throw new Error(`Fleet subscription ${subscription.stripeSubscriptionId} has no billable item.`);
  }
  await stripe.subscriptionItems.update(item.id, { quantity });
  await prisma.fleetSubscription.update({ where: { licenseeId }, data: { quantity } });
}

function mapStatus(status: Stripe.Subscription.Status): FleetSubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return FleetSubscriptionStatus.ACTIVE;
    case 'past_due':
      return FleetSubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return FleetSubscriptionStatus.UNPAID;
    case 'canceled':
    case 'incomplete_expired':
      return FleetSubscriptionStatus.CANCELED;
    default:
      return FleetSubscriptionStatus.INCOMPLETE;
  }
}

function isFleetSubscription(subscription: Stripe.Subscription): boolean {
  return subscription.metadata?.service === FLEET_SERVICE_TAG && Boolean(subscription.metadata?.licenseeId);
}

/**
 * Applies a customer.subscription.* event. ACTIVE and PAST_DUE (Stripe still retrying payment)
 * keep the FLEET entitlement active; UNPAID and CANCELED suspend it. Fleet data is always kept.
 */
export async function applyFleetSubscriptionEvent(prisma: PrismaClient, subscription: Stripe.Subscription): Promise<boolean> {
  if (!isFleetSubscription(subscription)) return false;
  const licenseeId = subscription.metadata.licenseeId;
  const status = mapStatus(subscription.status);
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  await prisma.fleetSubscription.upsert({
    where: { licenseeId },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status,
      quantity: subscription.items.data[0]?.quantity ?? 0,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
    create: {
      licenseeId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status,
      quantity: subscription.items.data[0]?.quantity ?? 0,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  const now = new Date();
  if (status === FleetSubscriptionStatus.ACTIVE || status === FleetSubscriptionStatus.PAST_DUE) {
    await prisma.serviceEntitlement.upsert({
      where: { licenseeId_serviceLine: { licenseeId, serviceLine: ServiceLine.FLEET } },
      update: { status: EntitlementStatus.ACTIVE, grantedAt: now, grantedBy: ENTITLEMENT_ACTOR, revokedAt: null, revokedBy: null, revokeReason: null },
      create: { licenseeId, serviceLine: ServiceLine.FLEET, status: EntitlementStatus.ACTIVE, grantedAt: now, grantedBy: ENTITLEMENT_ACTOR },
    });
  } else if (status === FleetSubscriptionStatus.UNPAID || status === FleetSubscriptionStatus.CANCELED) {
    await prisma.serviceEntitlement.updateMany({
      where: { licenseeId, serviceLine: ServiceLine.FLEET, status: EntitlementStatus.ACTIVE },
      data: {
        status: EntitlementStatus.SUSPENDED,
        revokedAt: now,
        revokedBy: ENTITLEMENT_ACTOR,
        revokeReason: `Fleet subscription ${status.toLowerCase()}`,
      },
    });
  }
  return true;
}

/**
 * Records a paid Fleet invoice as a settled platform transaction with the active charity split,
 * then pays the charity allocations. Idempotent per invoice.
 */
export async function recordPaidFleetInvoice(prisma: PrismaClient, stripe: Stripe, invoice: Stripe.Invoice): Promise<boolean> {
  const metadata = invoice.subscription_details?.metadata;
  if (metadata?.service !== FLEET_SERVICE_TAG || !metadata.licenseeId) return false;
  if (invoice.amount_paid <= 0) return true;

  const checkoutReferenceId = `fleet_invoice_${invoice.id}`;
  const already = await prisma.transaction.findUnique({ where: { checkoutReferenceId } });
  if (already) return true;

  const split = await resolveActiveSplitConfig(prisma, PLATFORM_LICENSEE_ID);
  const grossAmountCents = invoice.amount_paid;
  const licensorRoyaltyCents = Math.round((grossAmountCents * split.royaltyBps) / 10000);
  const charityGiftCents = grossAmountCents - licensorRoyaltyCents;
  const paymentIntentId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id;

  let transaction: { id: string };
  try {
    transaction = await new TransactionService(prisma).createTransactionWithTrigger({
    licenseeId: PLATFORM_LICENSEE_ID,
    checkoutReferenceId,
    grossAmountCents,
    currency: invoice.currency.toUpperCase(),
    status: TransactionStatus.SETTLED,
    stripePaymentIntentId: paymentIntentId,
    triggerEvent: {
      verificationSource: VerificationSource.THIRD_PARTY_API,
      deliveryType: DeliveryType.DIGITAL,
      rawPayload: { service: FLEET_SERVICE_TAG, invoiceId: invoice.id, payerLicenseeId: metadata.licenseeId },
    },
    financialSplit: {
      licensorRoyaltyCents,
      charityGiftCents,
      settledAt: new Date(),
      charityAllocations: computeCharityAllocations(charityGiftCents, split.charityAllocationBps),
    },
    });
  } catch (err) {
    // A concurrent delivery of the same invoice already recorded it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return true;
    throw err;
  }

  await payCharityAllocations(prisma, stripe, transaction.id);
  return true;
}
