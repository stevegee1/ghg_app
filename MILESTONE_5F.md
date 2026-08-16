# Milestone 5f: Job Creation Reporting & Licensing (Node.js)

## Overview & Business Context

Milestone 5f adds a parallel, informational licensing category where partners report the number of jobs they have created over a specific period (`QUARTERLY` or `ANNUAL`). That figure itself — independent of any minimum threshold — becomes a publicly displayable, licensed claim on the platform and optional public transparency ledger.

Job creation reports arrive via two distinct submission paths:
1. **Self-submitted Portal Form** (`POST /api/portal/job-reports`) — Submitted by authorized partner users via the partner portal.
2. **Server-to-Server B2B API Ingestion** (`POST /api/b2b/job-report`) — Pushed from a partner's own internal system using bcrypt-authenticated API keys.

---

## Submission Paths & Honesty Labeling

To prevent greenwashing or false claims of external audit, both submission paths automatically enforce honesty labeling for `attestationNote`:

- **Portal Submissions (`MANUAL_ATTESTATION`)**:
  Default Note: `"Self-reported by partner via portal. Not independently verified."`
- **B2B API Ingestion (`THIRD_PARTY_API`)**:
  Default Note: `"Submitted via partner's own system/API. Not independently verified."`

### Custom Attestation Note Validation
If a caller supplies a custom `attestationNote`, it is validated through M5d's `validateAttestationNote()` function. Any custom note containing disallowed positive claims (e.g., `"independently verified"`, `"certified"`, `"audited"`) is rejected with HTTP `400 Bad Request`.

---

## Technical Constraints & Boundaries

### 1. No Payment / Fee Logic
`JobCreationReport` is a data-and-display feature only. Submitting a job creation report **never** triggers a Stripe transaction, `initiateCheckout()` call, or fee calculation. It is completely decoupled from `Transaction` and `FinancialSplit`.

### 2. No Minimum Threshold Gating
Any submitted `jobsCreated` value, including zero (`jobsCreated: 0`), is valid and displayable once submitted. There is no minimum required to "qualify" for job creation licensing.

### 3. Duplicate Period Limitations & Database Unique Constraint
A unique constraint `(licenseeId, periodType, periodStart, periodEnd)` is enforced at the database level on the `JobCreationReport` table.
- **Exact-Duplicate Rejection**: Rejects new submissions if `periodType`, `periodStart`, and `periodEnd` exactly match an existing row for that `licenseeId`.
- **Documented Future Gap**: General date-range overlap detection across different period types (e.g., an `ANNUAL` report overlapping a `QUARTERLY` report) is out of scope for this milestone and explicitly deferred to a future refinement.

### 4. Public Transparency Ledger Opt-In Discipline
Job creation figures are exposed on `GET /api/v1/transparency-ledger` **only** for licensees with `isPubliclyVisible: true`. Non-public partners' job creation reports are kept private.

---

## API Summary

| Endpoint | Method | Role / Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/portal/job-reports` | `POST` | `PARTNER` / `ADMIN` (JWT) | Submit a self-reported job creation report for caller's licensee |
| `/api/portal/job-reports` | `GET` | `PARTNER` / `ADMIN` (JWT) | Retrieve submitted job creation reports for caller's licensee |
| `/api/b2b/job-report` | `POST` | B2B API Key Header | Server-to-server job report ingestion endpoint |
| `/api/v1/transparency-ledger` | `GET` | Public (Unauthenticated) | Platform transparency ledger including latest job figures for `isPubliclyVisible: true` partners |
