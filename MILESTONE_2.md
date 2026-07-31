# GHG Logo Drop — Milestone 2: Payment Split Pipeline

## Overview

Milestone 2 builds the money-movement and settlement synchronization layer for the **GHG Logo Drop** platform on top of Milestone 1's core database schema.

It handles server-side payment split calculations, PaymentIntent creation with Stripe Connect destination transfers, webhook signature verification and settlement sync, retried checkout idempotency via `checkoutReferenceId`, and a nightly reconciliation job to detect database-Stripe drift.

---

## Key Design Principles & Security Rules

### 1. Server-Side Split Calculation
- **Rule**: Payment splits are calculated strictly server-side based on `Licensee.royaltyBps` (basis points; e.g. `1500` = 15%).
- **Security Requirement**: Request bodies **never** supply or override split amounts or percentages.
- **Rounding Formula**:
  $$\text{charityGiftCents} = \text{Math.round}\left(\frac{\text{grossAmountCents} \times \text{royaltyBps}}{10000}\right)$$
  $$\text{licensorRoyaltyCents} = \text{grossAmountCents} - \text{charityGiftCents}$$
  Subtracting ensures that $\text{licensorRoyaltyCents} + \text{charityGiftCents} \equiv \text{grossAmountCents}$ exactly, preventing off-by-one rounding errors.

### 2. Retried / Re-opened Checkout Idempotency (`checkoutReferenceId`)
- **Problem Solved**: Prevents orphaned `PENDING` transactions when users re-open or retry a checkout modal (e.g. cart or session ID).
- **Mechanism**: `Transaction.checkoutReferenceId` is indexed with `@unique`. Before creating new records, `initiateCheckout()` checks if a `PENDING` transaction exists for the reference. If found, it returns the existing PaymentIntent's `client_secret` rather than creating duplicate database rows.

### 3. Pre-Checkout `TriggerEvent` Requirement
- Transactions, trigger events, and financial splits are created atomically in status `PENDING` *before* the Stripe PaymentIntent API is called.
- Webhooks only update settlement status (`Transaction.status`, `FinancialSplit.settledAt`, `FinancialSplit.stripeTransferId`) — webhooks **never** create or backfill `TriggerEvent` or `FinancialSplit` records.

### 4. Raw Body Signature Verification
- The Stripe webhook route (`POST /webhooks/stripe`) uses `express.raw({ type: 'application/json' })` to preserve the exact raw payload byte buffer required for `stripe.webhooks.constructEvent()`.
- Invalid or missing signatures trigger an immediate `400 Bad Request` prior to any database access.

---

## Out of Scope for Milestone 2

The following items remain explicitly out of scope:
- Checkout UI / frontend components
- Partner onboarding flow and Stripe Connect OAuth onboarding UI
- Admin management dashboard
- User authentication routes / JWT middleware (Milestone 4)
- Automated B2B trigger source webhooks (Milestone 3 / 5)

---

## Local Stripe CLI Verification Guide

### 1. Prerequisites
- Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):
  ```bash
  brew install stripe/stripe-cli/stripe
  stripe login
  ```

### 2. Forward Webhooks to Local Server
Start your local server (`npm run dev`), then run the Stripe CLI forwarding daemon in a separate terminal:
```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```
Copy the webhook signing secret output by the CLI (e.g. `whsec_...`) into your `.env` file:
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Manually Trigger Test Webhook Events
Use the Stripe CLI to fire test events directly to your local endpoint:

- **Payment Intent Succeeded**:
  ```bash
  stripe trigger payment_intent.succeeded
  ```
- **Transfer Reversed**:
  ```bash
  stripe trigger transfer.reversed
  ```
- **Charge Refunded**:
  ```bash
  stripe trigger charge.refunded
  ```

---

## Verification & Automated Test Coverage

Run the full automated test suite (Milestone 1 + Milestone 2):
```bash
npm test
```

### Verified Scenarios in `tests/milestone2.test.ts`:
1. **Split Rounding Rule**: `initiateCheckout()` computes exact-sum integer splits for edge cases (`9999` cents @ `1500` bps $\to$ `1500` charity, `8499` royalty $\to$ sum `9999`).
2. **Onboarding Guard**: `initiateCheckout()` throws if `Licensee` has no `stripeConnectedAccountId`.
3. **Stripe Idempotency Key**: `initiateCheckout()` passes internal `transactionId` as the Stripe `idempotencyKey` option.
4. **Signature Security**: Webhook handler rejects invalid/missing signatures (`400 Bad Request`) with 0 database writes.
5. **Webhook Idempotency**: Repeated `payment_intent.succeeded` events result in exactly 1 settlement.
6. **Transfer Reversals**: Webhook handler sets `REVERSED` status on `transfer.reversed` and alerts compliance.
7. **Drift Reconciliation**: `runReconciliation()` detects transactions whose status diverges from Stripe.
8. **Checkout Reference Idempotency**: Repeated calls to `initiateCheckout()` with the same `checkoutReferenceId` produce exactly **1** database row and reuse the existing PaymentIntent's `client_secret`.
