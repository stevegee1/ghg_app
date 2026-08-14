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
