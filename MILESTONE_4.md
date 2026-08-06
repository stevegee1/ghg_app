# GHG Logo Drop — Milestone 4: Partner Portal, Auth & Transparency Layer

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
