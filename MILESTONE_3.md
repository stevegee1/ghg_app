# GHG Logo Drop — Milestone 3: Consumer Opt-In Checkout

## Overview

Milestone 3 exposes the Milestone 1 core schema and Milestone 2 Stripe payment split pipeline through a consumer-facing vertical: a shopper opting in to add the "Logo Drop" accountability mark to their purchase.

This milestone includes:
1. An Express API route (`POST /api/checkout`) enforcing input validation, server-side hardcoding of `verificationSource: 'CONSUMER_OPT_IN'`, and clean HTTP status mapping (`400`, `409`, `500`).
2. A plain, unstyled static HTML/JS demo harness (`public/checkout.html`) using Stripe.js Elements.
3. Automated route-level integration tests (`tests/milestone3.test.ts`).

---

## Architectural Principles & Security Rules

### 1. Server-Side Hardcoded `verificationSource`
- **Rule**: `verificationSource` is set to `'CONSUMER_OPT_IN'` on the server when calling `checkoutService.initiateCheckout()`.
- **Security Requirement**: Request bodies for `POST /api/checkout` cannot specify or override `verificationSource`. Any client-supplied `verificationSource` field is ignored.

### 2. Client-Side In-Memory `checkoutReferenceId`
- **Rule**: `public/checkout.html` generates a session-unique UUID via `crypto.randomUUID()` on page load and holds it in a JavaScript variable.
- **Why**: Re-sending `checkoutReferenceId` on retries connects the browser to Milestone 2's backend idempotency logic, preventing duplicate database records if the payment modal is re-opened or retried.

### 3. Error Mapping Policy
- `400 Bad Request`: Returned when `licenseeId`, `checkoutReferenceId`, or `grossAmountCents` fail validation. Does not reach service layer.
- `409 Conflict`: Returned when the service layer throws `'Checkout already completed for this reference'`, allowing the frontend to display a clear "already completed" message.
- `500 Internal Server Error`: Returned for unexpected errors. Masks internal stack traces, Prisma queries, and Stripe SDK details with `{ error: 'An unexpected error occurred during checkout' }`.

### 4. Zero Styling / Pure Functional Harness Scope
- **Rule**: `public/checkout.html` contains no CSS framework, no design tokens, and no custom typography. Styling and visual polish are deferred to Milestone 7.

---

## Out of Scope & Product Catalog Boundaries

The following items are **explicitly out of scope**:
- **Real Product Catalog / Storefront**: `checkout.html` is a single-item demo harness with a hardcoded product (£25.00 for `lic_arsenal_fc`). Real multi-item cart and catalog features are not currently scoped.
- **Non-Opt-In Purchase Path**: Purchasing without opting in does not trigger backend API calls.
- **CSS / UI Design System**: Styling is strictly out of scope for this milestone.
- **User Authentication / JWT Middleware**: Covered in Milestone 4.
- **Automated B2B Trigger Webhooks**: Covered in Milestone 5.

---

## Local Setup & Manual Testing Guide

> [!NOTE]
> The Stripe publishable key in `public/checkout.html` (`pk_test_...`) is hardcoded for local demo harness testing and must be moved to server/environment configuration before moving beyond local/demo usage.

### 1. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

### 2. Open Demo Checkout Harness
Open `public/checkout.html` directly or navigate to:
`http://localhost:3000/checkout.html`

---

## Manual Test Checklist

| Scenario | Steps | Expected Result |
| :--- | :--- | :--- |
| **1. Opt-In Checked $\to$ Pay $\to$ Success** | 1. Check "Add the GHG Accountability Logo Drop".<br>2. Click **Pay £25.00**.<br>3. Enter Stripe test card `4242 4242 4242 4242` (Exp: 12/34, CVC: 123, Zip: 90210).<br>4. Submit payment. | Form is replaced by success message with `transactionId`. In DB, `Transaction` has status `SETTLED` (after webhook delivery). |
| **2. Opt-In Unchecked $\to$ Pay** | 1. Uncheck "Add the GHG Accountability Logo Drop".<br>2. Click **Pay £25.00**. | Alert shows opt-in is unchecked. **No network request is sent to `/api/checkout`**. |
| **3. Double-Click "Pay" Protection** | 1. Check opt-in.<br>2. Double-click **Pay £25.00** rapidly. | Pay button disables immediately on first click. Database query `SELECT COUNT(*) FROM "Transaction" WHERE "checkoutReferenceId" = '...'` returns **1**. |
| **4. Retried / Re-opened Checkout** | 1. Check opt-in $\to$ Click Pay.<br>2. Do not complete card payment.<br>3. Click Pay again without reloading page. | Second call reuses existing transaction and PaymentIntent `clientSecret`. Count of DB rows for `checkoutReferenceId` remains **1**. |
| **5. Already Paid Reference (409 Conflict)** | 1. Complete payment for a reference.<br>2. Call `POST /api/checkout` with same `checkoutReferenceId`. | API returns `409 Conflict`. UI displays "This checkout has already been completed" and disables the form. |

---

## Verification Suite

Run automated Jest tests across all milestones:
```bash
npm test
```
Compile TypeScript:
```bash
npm run build
```
