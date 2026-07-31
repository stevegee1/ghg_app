# GHG Logo Drop — Milestone 1: Core Schema & Database Safety Net

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
