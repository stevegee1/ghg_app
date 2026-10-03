/**
 * The platform's own licensee record. It is the payee for platform sales (official store
 * merchandise and assurance fees) and receives settlements through the platform's Stripe account.
 */
export const PLATFORM_LICENSEE_ID = 'lic_ghg_official';

export function getPlatformStripeAccountId(): string {
  const accountId = process.env.STRIPE_PLATFORM_ACCOUNT_ID;
  if (!accountId || !accountId.startsWith('acct_')) {
    throw new Error('STRIPE_PLATFORM_ACCOUNT_ID must be set to the platform Stripe account ID (acct_...).');
  }
  return accountId;
}
