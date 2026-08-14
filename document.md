# GHG Logo Drop — Comprehensive Platform Documentation

This document merges all milestone specifications, architectural decisions, and verification documentation for the **GHG Logo Drop** platform.

---

# Milestone 1: Core Schema & Database Safety Net

## Overview

Milestone 1 establishes the foundational data model, schema migrations, PostgreSQL triggers, seed pipeline, repository service layer, and test suite for the **GHG Logo Drop** platform.

This platform allows corporate partners to license trademarks. Each licensed usage ("logo drop") triggers a financial split between the licensor/operator and a designated charity.

---

## Technical Stack

- **Runtime**: Node.js (LTS), TypeScript (`strict: true`)
- **Database**: PostgreSQL
- **ORM & Migrations**: Prisma ORM
- **Testing**: Jest (`ts-jest`)
- **Environment Config**: `dotenv`

---

## Database Models & Design Rationale

### Models Implemented

1. **`Licensee`**: Corporate partner licensing the trademark. Linked to a vertical category and an optional connected Stripe Account ID.
2. **`Transaction`**: Represents a single trademark usage payment event (in integer cents/pence). Indexed by `licenseeId` for performance.
3. **`TriggerEvent`**: Mandated 1-to-1 relation with `Transaction`. Stores verification source, weather/event details, and raw audit payload.
4. **`FinancialSplit`**: Mandated 1-to-1 relation with `Transaction`. Stores the split amounts (`licensorRoyaltyCents` and `charityGiftCents`).
5. **`PortalUser`**: Authentication identity (admin or partner) associated with a `Licensee`. Indexed by `licenseeId`. Passwords stored as `bcrypt` hashes.

---

## Key Schema Decisions & Safety Nets

### 1. Integer Cents/Pence for All Financial Amounts
- **Decision**: `grossAmountCents`, `licensorRoyaltyCents`, and `charityGiftCents` are stored as `Int` (integer cents/pence). Floating point types (`Float`, `Decimal`) are strictly forbidden.
- **Why**: Floating point arithmetic causes IEEE 754 rounding artifacts. Storing exact integer cents guarantees penny-perfect financial calculations without rounding drift.

### 2. Mandatory `FinancialSplit` in Service Layer & Database
- **Decision**: `financialSplit` is required in `CreateTransactionInput` (no optional `?`). Every transaction created must specify a valid financial split.
- **Why**: Every licensed usage ("logo drop") must have a clear split allocation between licensor royalty and charity gift.

### 3. PostgreSQL Database Trigger Safety Net
- **Decision**: Implemented PL/pgSQL function `check_financial_split_sum()` and trigger `enforce_financial_split_sum` on `FinancialSplit` table (`BEFORE INSERT OR UPDATE`).
- **Why**: Even if application-layer code or raw queries bypass the service layer, PostgreSQL will reject any `FinancialSplit` where `licensorRoyaltyCents + charityGiftCents != Transaction.grossAmountCents`.

### 4. Mandatory `TriggerEvent.verificationSource`
- **Decision**: `verificationSource` (`THIRD_PARTY_API`, `MANUAL_ATTESTATION`, `CONSUMER_OPT_IN`) is required (non-null) and enforced atomically upon transaction creation via `TransactionService.createTransactionWithTrigger()`.

### 5. Raw Payload Auditing (`TriggerEvent.rawPayload`)
- **Decision**: `rawPayload` stores the full JSON webhook/attestation payload for auditability.

---

## Migration Files

1. `prisma/migrations/20260731040806_init/migration.sql` - Core schema, tables, enums, indexes, foreign keys.
2. `prisma/migrations/20260731100135_add_financial_split_trigger/migration.sql` - PostgreSQL function & trigger enforcing financial split equality.

---

## Out of Scope for Milestone 1

The following features are **explicitly out of scope** for Milestone 1:
- Stripe SDK integration, PaymentIntent creation, and webhook handlers (Milestone 2)
- Express / REST API checkout routes and endpoints
- JWT / Authentication middleware and login endpoints
- PostgreSQL Row-Level Security (RLS) policies

---

## Local Setup & Execution Guide

### Prerequisites
- Node.js LTS (v20+)
- PostgreSQL instance running locally on port 5432

### 1. Environment Configuration
Copy `.env.example` to `.env` and set your local PostgreSQL connection string:
```bash
cp .env.example .env
```
Example `.env`:
```env
DATABASE_URL="postgresql://mac@localhost:5432/ghg_logodrop?schema=public"
```

### 2. Run Database Migrations
Generate and apply migrations to your PostgreSQL instance:
```bash
npm run migrate
```

### 3. Seed Fake Development Data
Run the idempotent seed script to populate sample licensees, users, transactions, trigger events, and splits:
```bash
npm run seed
```

### 4. Run Test Suite
Run Jest automated tests:
```bash
npm test
```

### 5. Build Project
Compile TypeScript code to `./dist`:
```bash
npm run build
```

---

## Verification & Test Coverage

The test suite in `tests/milestone1.test.ts` validates:
1. **Mandatory Trigger Event & Financial Split**: Creating a `Transaction` without a linked `TriggerEvent`, with a `null` `verificationSource`, or without a `financialSplit` throws a validation error.
2. **App-Layer Financial Split Validation**: Service layer rejects any split sum mismatch with a clean application error message.
3. **Database-Level Trigger Enforcement**: Raw SQL inserts bypassing the application layer are rejected by the PostgreSQL trigger (`enforce_financial_split_sum`).
4. **Seed Idempotency**: Executing `npm run seed` multiple times succeeds without duplicating or failing.
5. **Licensee Data Isolation**: Querying transactions by `licenseeId` strictly filters and returns only that licensee's records.

---
---

# Milestone 2: Payment Split Pipeline

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

---
---

# Milestone 3: Consumer Opt-In Checkout

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

---
---

# Milestone 4: Partner Portal, Auth & Transparency Layer

## Overview

Milestone 4 implements the trust, access control, and reporting layer for the **GHG Logo Drop** platform.

It includes:
1. **Authentication**: JWT-based session authentication with bcrypt password verification and generic 401 response handling to prevent user enumeration.
2. **Database Row-Level Security (RLS)**: PostgreSQL RLS policies on `Transaction`, `FinancialSplit`, and `TriggerEvent` enforced via `SET LOCAL app.current_licensee_id` and `SET LOCAL app.is_admin` per request.
3. **Partner Portal API**: Scoped endpoints (`/api/portal/transactions`, `/api/portal/summary`) ensuring `PARTNER` users can never access another licensee's records.
4. **Public Transparency Ledger**: Unauthenticated `/api/v1/transparency-ledger` endpoint surfacing anonymized platform aggregates and per-partner metrics strictly for opted-in licensees (`isPubliclyVisible = true`).
5. **PDF Compliance Certificate**: PDF generation via `pdfkit` displaying real database aggregate metrics and an accurate SHA-256 **document integrity check**.

---

## Architectural Principles & Security Design

### 1. Authentication & Session Strategy
- **Strategy**: JSON Web Tokens (JWT) signed with a server-side secret (`JWT_SECRET`) and a 15-minute expiration period.
- **Payload**: `{ userId, role, licenseeId }`.
- **Security Rule**: Login attempts (`POST /api/auth/login`) return a generic `401 Unauthorized` (`{ error: 'Invalid email or password' }`) for both incorrect passwords and non-existent emails to prevent user enumeration attacks.

### 2. Database-Enforced Row-Level Security (RLS)
- **Policy Structure**:
  ```sql
  ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;

  CREATE POLICY licensee_isolation ON "Transaction"
    USING (
      current_setting('app.is_admin', true) = 'true'
      OR "licenseeId" = current_setting('app.current_licensee_id', true)
    );
  ```
- **Transaction Wrapper (`runWithRls`)**: Executes `SET LOCAL app.current_licensee_id = '<id>'` and `SET LOCAL app.is_admin = '<bool>'` at the beginning of each database transaction block.
- **Defense in Depth**: Even if application-level routing contains a bug or a `PARTNER` user passes `?licenseeId=other_id` in query parameters, the database engine strictly rejects returning rows from another licensee.

### 3. PDF Compliance Certificate Integrity Hash
- **Purpose**: The SHA-256 hash embedded in the PDF footer is explicitly labeled as a **document integrity check**.
- **Important Distinction**: The hash verifies that the generated PDF document has not been altered or tampered with post-generation; it does **not** serve as a cryptographic proof verifying the truth or validity of the underlying raw source data.

---

## Out of Scope for Milestone 4

The following features remain explicitly out of scope:
- Partner self-service onboarding UI / registration routes (Milestone 8)
- Automated B2B trigger integrations (Milestone 5)
- Production deployment, observability, and APM tracing (Milestone 6)
- Consumer frontend styling and polish (Milestone 7)
- Automated public sharing/posting of certificates

---

## Local Setup & Testing

### 1. Run Database Migrations
Apply the RLS and transparency schema migrations:
```bash
npx prisma migrate dev
```

### 2. Run Seed Script
Populate sample portal users (`ADMIN`, `PARTNER`) and set public visibility opt-ins:
```bash
npm run seed
```

### 3. Run Test Suite
Run Jest tests for Milestone 4 (alongside Milestones 1-3):
```bash
npm test tests/milestone4.test.ts
```

---

## Verification & Automated Test Coverage

The test suite in `tests/milestone4.test.ts` validates:
1. **Credentials & Enumeration Prevention**: Correct login returns valid JWT; incorrect passwords and non-existent emails return identical generic `401` responses.
2. **Token Enforcement**: Protected routes reject missing, malformed, or expired JWTs with `401 Unauthorized`.
3. **Partner Data Isolation**: `PARTNER` users hitting `/api/portal/transactions` strictly receive only their own licensee's rows.
4. **Direct DB RLS Bypass Test**: Raw SQL queries executed in a transaction with session variables set to Licensee A return zero rows for Licensee B, proving RLS enforcement at the PostgreSQL engine level.
5. **Parameter Tampering Immunity**: Passing `?licenseeId=other` in query params is ignored for `PARTNER` users.
6. **Public Transparency & Opt-In Guard**: `/api/v1/transparency-ledger` exposes platform-wide totals, includes opted-in partners (`isPubliclyVisible = true`), and excludes non-opted-in partners.
7. **Certificate Data Accuracy**: PDF compliance certificate embedded totals match a direct DB aggregate query for the same licensee/date range, and contain the SHA-256 document integrity check label.

---
---

# Milestone 5a: B2B Trigger Integration & Quantity Pricing

## Architecture & Design Decisions

### 1. B2B Partner Authentication Scheme
- **Choice**: Per-licensee `bcrypt`-hashed API Keys (`b2bApiKeyHash` on `Licensee`).
- **Header**: B2B partner backend systems pass their raw API key via `X-API-Key` or `Authorization: Bearer <key>`.
- **Verification**: The server verifies incoming keys against stored hashes using `await bcrypt.compare(rawApiKey, licensee.b2bApiKeyHash)`.
- **Rationale**: Keeps B2B server-to-server API key management consistent with `PortalUser.passwordHash` (which uses `bcrypt`). Raw keys are never stored in plain text in the database.
- **Key Generation & Rotation**: Keys are generated as cryptographically secure random tokens (e.g., `b2b_key_<random_hex>`), hashed with `bcrypt.hash(key, 10)`, and stored in `b2bApiKeyHash`. Keys are currently seeded via `prisma/seed.ts` for testing; administrative key generation and rotation capabilities will be managed via admin onboarding APIs in future milestones.

### 2. Physical vs. Digital Delivery & Fulfillment Status Rules
- **Enum Types**:
  - `DeliveryType`: `DIGITAL` | `PHYSICAL`
  - `FulfillmentStatus`: `PENDING` | `CONFIRMED` | `FAILED`
- **Rule Enforcement**:
  - `PHYSICAL` delivery requires a non-null `fulfillmentStatus` (defaults to `PENDING` on creation).
  - `DIGITAL` delivery strictly requires a `null` `fulfillmentStatus`.
- **Database Level Constraint**:
```sql
ALTER TABLE "TriggerEvent" ADD CONSTRAINT "check_delivery_fulfillment_status" CHECK (
  ("deliveryType" = 'PHYSICAL' AND "fulfillmentStatus" IS NOT NULL) OR
  ("deliveryType" = 'DIGITAL' AND "fulfillmentStatus" IS NULL)
);
```

### 3. Idempotency & Retry Safety
- B2B requests require a non-empty `externalReferenceId`.
- The server constructs `checkoutReferenceId = b2b_${licenseeId}_${externalReferenceId}` and delegates to `initiateCheckout()`, preserving all Milestone 2 payment split, Stripe idempotency key, and retry safety guarantees.

### 4. Verification & Test Suite Results
All test suites (M1, M2, M3, M4, and M5a) pass cleanly.

---
---

# Milestone 5b: Multi-Charity Allocation & Settlement

## Settlement Architecture Changes

### 1. PaymentIntent vs. Webhook Per-Charity Transfers
- **Previous Model**: Single `transfer_data.destination` attached to Stripe PaymentIntent at creation time.
- **New Multi-Charity Model**:
  - `initiateCheckout()` creates the PaymentIntent **without** `transfer_data`, routing total funds to the platform balance.
  - Upon receiving `payment_intent.succeeded` in the Stripe webhook handler, the server marks the transaction `SETTLED` and loops through `CharityAllocation` records.
  - For each allocation, the server executes `stripe.transfers.create()` with `idempotencyKey: CharityAllocation.id`.
  - On success, `CharityAllocation.stripeTransferId` is populated and `transferFailed` is set to `false`.

### 2. Charity Allocation Calculation Discipline
- `computeCharityAllocations()` computes exact integer `amountCents` values from charity basis points (bps).
- Employs remainder assignment discipline: the rounding remainder is assigned to the final charity in the list to guarantee `SUM(amountCents) === charityGiftCents`.
- `getOrComputeDefaultCharityAllocations()` strictly filters `Charity` records with `status: ACTIVE`. Inactive charities are excluded from receiving new allocations while preserving historical allocation records.

### 3. Database Check Triggers
- **`check_charity_allocation_sum_bound_trigger`**: `BEFORE INSERT OR UPDATE ON "CharityAllocation"` prevents running allocation sums from exceeding `FinancialSplit.charityGiftCents`.
- **`check_financial_split_allocations_finalized_trigger`**: `BEFORE UPDATE ON "FinancialSplit"` enforces `SUM(amountCents) == charityGiftCents` strictly when `allocationsFinalized` transitions to `true`.

### 4. Partial Transfer Failure Resilience & Self-Healing Reconciliation
- If an individual charity transfer fails (e.g. temporary settlement/balance delay), `CharityAllocation.transferFailed` is set to `true`, while the parent `Transaction` remains `SETTLED`.
- The extended `runReconciliation()` job queries unsettled `CharityAllocation` records (`stripeTransferId: null`) for `SETTLED` transactions and retries `stripe.transfers.create()` using `idempotencyKey: allocation.id`.
- Successful retries self-heal DB records (`stripeTransferId` set, `transferFailed: false`). If retries fail after `maxRetries` (default 3), `runReconciliation()` flags persistent allocation drift and alerts compliance officers.

### 5. Verification & Test Suite Results
All test suites (M1, M2, M3, M4, M5a, and M5b) pass cleanly.

---
---

# Milestone 5c: Versioned Split Configuration & Audit Trail

## Architecture & Design Decisions

### 1. Split Config Resolution Order
`resolveActiveSplitConfig(prisma, licenseeId)` resolves split percentages using strict precedence:
1. **Per-Licensee Override**: Queries `SplitConfigHistory` where `licenseeId = targetLicenseeId` and `isActive = true` (ordered by `changedAt desc`).
2. **Platform Default Fallback**: If no per-licensee override exists, queries `SplitConfigHistory` where `licenseeId IS NULL` and `isActive = true`.
3. **Hard Error**: If neither active configuration exists, throws a hard error (`"No active split configuration found for licensee..."`), failing loudly rather than falling back to unversioned hardcoded numbers.

### 2. Insert-Only Audit Trail Chaining
- `SplitConfigHistory` records are strictly **insert-only**. No application endpoints exist to edit or delete historical rows.
- When an `ADMIN` submits a new split configuration via `POST /api/admin/split-config`, the server executes a single PostgreSQL `$transaction`:
  1. Finds the currently active record for the given scope (`licenseeId` or `null`).
  2. Updates `isActive = false` on the prior record.
  3. Inserts the new record with `isActive = true`, setting `previousConfigId` to the ID of the deactivated record and `changedByUserId` to the authenticated admin's ID.

### 3. Core Immutability Guarantee (Proving Test 4)
- When a transaction is created via `initiateCheckout()` or B2B trigger ingestion, the active split configuration is resolved and snapshot directly onto the transaction's `FinancialSplit` and `CharityAllocation` records.
- **Proving Test**: Test 4 in `tests/milestone5c.test.ts` creates transaction `T1` under Config A (85% royalty / 15% charity), updates the active configuration to Config B (70% royalty / 30% charity), and re-fetches `T1` from the database. `T1`'s `FinancialSplit` and `CharityAllocation` records remain strictly reflecting Config A (85% royalty / 15% charity), proving historical transactions are completely unaffected by subsequent configuration updates.

### 4. Verification & Test Suite Results
All test suites (M1, M2, M3, M4, M5a, M5b, and M5c) pass cleanly.

---
---

# Milestone 5d: Verification Honesty

## Platform Verification Scope & Statement

This platform acts as an automated transaction-routing, royalty-splitting, and transparency ledger engine for branded logo drop drops. **The platform does not independently audit, measure, or verify any partner's carbon, environmental, or emissions claims.** All claim data recorded by the system represents self-reported telemetry, partner API assertions, or consumer opt-in choices at checkout. While the platform guarantees strict cryptographic document integrity (SHA-256) and database split enforcement for financial allocations, these guarantees prove document authenticity and financial routing accuracy—they do not validate the real-world environmental truth of underlying partner assertions.

---

## Technical Design & Architecture

### 1. `TriggerEvent.attestationNote` & Standard Defaults
Every `TriggerEvent` row records an `attestationNote` describing the exact provenance and verification scope of the trigger:
- **`THIRD_PARTY_API`**: `"Data submitted via partner's own API/telemetry system. Not independently audited."`
- **`MANUAL_ATTESTATION`**: `"Manually attested by an authorized user. Not independently audited."`
- **`CONSUMER_OPT_IN`**: `"Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type."`

### 2. Guardrails Against Misleading Custom Notes
Callers can supply custom `attestationNote` strings, but custom notes are validated via `validateAttestationNote()`. Any custom note containing misleading claims of independent audit or certification (`"independently verified"`, `"certified"`, `"audited"`, `"carbon offset verified"`) is rejected with a `400 Bad Request` error (`"Custom attestationNote cannot claim independent verification or certification."`).

### 3. Public Disclaimers & Certificate Rendering
- **Generated PDF Certificates**: Render a prominent standing disclaimer near summary aggregate figures:
  `"Verification Disclaimer: This certificate reflects licensing transaction and charitable-routing data only. It does not independently verify any partner's environmental or carbon claims."`
- **Public Transparency Ledger**: `/api/v1/transparency-ledger` includes an unconditional top-level `dataDisclaimer` field on every response:
  `"Figures reflect settled licensing transactions and charitable routing only. Partner environmental claims are not independently verified by this platform."`
