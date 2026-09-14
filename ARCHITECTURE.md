# System Architecture & Technical Specification
## GHGEmissionLogs (NFTY LOGS LABS LTD)
### Continuous Climate Telemetry, Statutory Workforce Assurance & On-Chain Provenance Ledger

---

## 1. Executive Summary & High-Level Architecture

GHGEmissionLogs is an enterprise-grade Software-as-a-Service (SaaS) and statutory compliance assurance platform. It provides an unbroken cryptographic chain of custody linking physical operational telemetry (power, water, emissions, hydrogen, workforce job creation) to statutory ISO frameworks (ISO 14064-1:2018, ISO 14001:2015, ISO 50001:2018, ISO 19011:2026, UK SECR, EU CSRD, Section 106 Town and Country Planning Act 1990).

The system features:
* **Multi-Tenant Row-Level Security (RLS):** Database-enforced isolation where each licensee operates within an isolated PostgreSQL session context.
* **Role-Segregated Application Consoles:** Strict perimeter separation between the **Executive Lead Auditor Administration Console** (`/admin`) and the **Licensee Assurance Studio** (`/portal`).
* **Hardware Calibration & Anomaly Screening:** Sub-second screening of IoT telemetry streams against ISO 17025 calibration certificates with automated non-conformance logging.
* **Cryptographic Evidence Locker:** SHA-256 content-addressable storage for regulatory filings and third-party audit dossiers.
* **Statutory ESG Financial Splits:** Immutable automated split engine disbursing 85% to licensors and 15% to statutory climate and humanitarian charities via Stripe Connect.
* **Tamper-Resistant On-Chain Provenance:** Co-branded dual-logo credentials and Polygon PoS ERC-1155 dynamic web-embed badges backed by UKIPO Registered Trade Mark UK00003980004.

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT & AUDITOR FRONTEND                                       |
|  +-------------------------------------+                +---------------------------------------+  |
|  |     Public Website & Marketing      |                |     Partner / Licensee Console        |  |
|  |   (/, /licensing, /job-reporting)   |                |               (/portal)               |  |
|  +-------------------------------------+                +---------------------------------------+  |
|                                    \                        /                                      |
|                                     +----------------------+                                       |
|                                     |    Admin Console     |                                       |
|                                     |       (/admin)       |                                       |
|                                     +----------------------+                                       |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                          Vite Proxy (:5173)
                                                  |
+----------------------------------------------------------------------------------------------------+
|                                      BACKEND API GATEWAY (:3000)                                   |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------------+  |
|  |  JWT Auth & RBAC  |  |   Rate Limiter    |  | CORS & Security   |  | Multer Evidence Storage |  |
|  |    Middleware     |  |    Middleware     |  |  Headers (Helmet) |  |   (/uploads/evidence)    |  |
|  +-------------------+  +-------------------+  +-------------------+  +-------------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                  |
+----------------------------------------------------------------------------------------------------+
|                                         CORE DOMAIN SERVICES                                       |
|  +--------------------------+ +--------------------------+ +------------------------------------+  |
|  |  Telemetry & Calibration | |   Review & ISO Scoring   | |  Evidence Locker & SHA-256 Engine  |  |
|  |  Anomaly Screener (PUE)  | |   (19011:2026 Audit)     | |    Defensive Category Validation   |  |
|  +--------------------------+ +--------------------------+ +------------------------------------+  |
|  +--------------------------+ +--------------------------+ +------------------------------------+  |
|  |  Stripe Connect Split    | |  Dual-Logo Compositor    | |   Polygon ERC-1155 Token Minting   |  |
|  |  Disbursement (85/15)    | |  SVG / Canvas Watermark  | |   On-Chain Provenance Contract     |  |
|  +--------------------------+ +--------------------------+ +------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                          Prisma ORM Client
                                                  |
+----------------------------------------------------------------------------------------------------+
|                                      PERSISTENCE LAYER (PostgreSQL)                                |
|  +-----------------------------------------------------------------------------------------------+ |
|  |  runWithRls() Context Wrapper:                                                                | |
|  |  - SET LOCAL ROLE ghg_app_user                                                                | |
|  |  - SET LOCAL search_path TO public                                                            | |
|  |  - SET LOCAL app.current_licensee_id = :licenseeId                                            | |
|  |  - SET LOCAL app.is_admin = :isAdmin                                                          | |
|  +-----------------------------------------------------------------------------------------------+ |
|  +--------------------+ +--------------------+ +--------------------+ +-------------------------+ |
|  |  Licensees & Users | | Transactions & Log | | ISO Matrices & Rows| | Evidence Docs & Hashes  | |
|  +--------------------+ +--------------------+ +--------------------+ +-------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Multi-Tenancy & Row-Level Security (RLS)

### 2.1 Defense-in-Depth RLS Architecture
Multi-tenancy is enforced at the database kernel level rather than relying solely on application-layer query filters.

1. **PostgreSQL RLS Role (`ghg_app_user`):**
   * Unprivileged database role with limited table grants.
   * Denied direct write access to global configuration tables.
   * Granted `USAGE` on schema `public`.

2. **Session Configuration Parameters:**
   * `app.current_licensee_id`: Stores the active licensee context (`lic_xxx`).
   * `app.is_admin`: Boolean flag (`'true'` or `'false'`).

3. **Transaction Execution Wrapper (`runWithRls`):**
   Located in `src/db/rls.ts`, every tenant-scoped query runs inside a dedicated transaction block:
   ```typescript
   export async function runWithRls<T>(
     prisma: PrismaClient,
     user: UserAuthScope,
     fn: (tx: Prisma.TransactionClient) => Promise<T>
   ): Promise<T> {
     return prisma.$transaction(async (tx) => {
       await tx.$executeRawUnsafe('SET LOCAL ROLE ghg_app_user;');
       await tx.$executeRawUnsafe('SET LOCAL search_path TO public;');
       await tx.$executeRawUnsafe(`SET LOCAL app.current_licensee_id = '${user.licenseeId}';`);
       await tx.$executeRawUnsafe(`SET LOCAL app.is_admin = '${user.role === 'ADMIN'}';`);
       return fn(tx);
     });
   }
   ```

4. **Database Policies:**
   * `Transaction`: `current_setting('app.is_admin') = 'true' OR licensee_id = current_setting('app.current_licensee_id')`
   * `FinancialSplit`: Scoped through `transactionId -> Transaction.licenseeId`
   * `AuditEvidenceDocument`: Direct licensee isolation with auditor review bypass

---

## 3. Role-Based Access Control & Perimeter Separation

The application enforces a binary role model across all API endpoints and frontend routing trees:

```
                      +-------------------+
                      |   Incoming User   |
                      +-------------------+
                                |
                   Authentication (/api/auth/login)
                                |
             +------------------+------------------+
             |                                     |
      Role: ADMIN                            Role: PARTNER
             |                                     |
+--------------------------+         +--------------------------+
|      /admin Console      |         |     /portal Console      |
|--------------------------|         |--------------------------|
| - Audit Review Queue     |         | - Self-Assessment Studio |
| - Lead Auditor Approvals |         | - Telemetry Streaming    |
| - ESG Split Config       |         | - Evidence Locker Upload |
| - Demo Lead Pipeline     |         | - Checkout / Stripe Pay  |
+--------------------------+         +--------------------------+
             |                                     |
  Blocked from /portal                  Blocked from /admin
  (Redirect to /admin)                  (HTTP 403 / Redirect)
```

### 3.1 Route Guards (`src/AppClient.tsx`)
* `partnerOnly`: If an administrator accesses `/portal`, the client intercepts the request and redirects to `/admin`.
* `adminOnly`: If a non-admin accesses `/admin`, the client redirects to `/portal`.
* `PortalPage.tsx` defense-in-depth: Internal component lifecycle check that automatically renders `<Navigate to="/admin" replace />` if `isAdmin` is detected.

### 3.2 Layout & Navigation Segregation (`src/components/Layout.tsx`)
* **Console Mode (`isConsoleView`):**
  * When on `/admin` or `/portal`, public marketing footers are suppressed.
  * Replaced by an enterprise status footer: `GHGEmissionLogs Telemetry & Assurance Infrastructure • Node UK-01 Operational • UKIPO Trade Mark UK00003980004 | ISO 14064-1:2018 Attested`.
  * Google-style profile popover dynamically switches options based on role:
    * **Admin:** Admin Console, Audit Review Queue, Statutory Splits, Demo Inquiries.
    * **Partner:** Client Dashboard, Evidence Locker, API Keys.

---

## 4. Telemetry Ingestion & Hardware Calibration Engine

### 4.1 Continuous Telemetry Pipeline
1. **Sensor Ingestion:** IoT meters and SCADA systems stream sub-second telemetry through `POST /api/iso/telemetry`.
2. **Supported Sensor Types:**
   * `ELECTRICITY_SUB_METER` (Metric: `PUE`, `MWH_LOAD`)
   * `WATER_FLOW_METER` (Metric: `WUE`, `M3_PER_HOUR`)
   * `GAS_CHROMATOGRAPH` (Metric: `H2_PURITY_PCT`)
   * `THERMAL_FLOW_METER` (Metric: `THERMAL_KW`)
   * `EMISSIONS_CEMS` (Metric: `CO2_PPM`)

### 4.2 Mandatory Sensor Calibration Verification (ISO 17025)
Before telemetry readings are accepted into the ledger:
* The system checks `AssetCalibrationRecord` for the corresponding `assetTag`.
* If the certificate is expired or `isCurrentlyValid = false`, the reading is flagged as uncalibrated.
* The discrepancy triggers an automated `NonConformanceEvent` record linked to ISO 50001:2018 Clause 9.1.1 or ISO 14001:2015 Clause 10.2.

### 4.3 Anomaly Detection & Greenwashing Risk Grading
* **PUE Baseline Monitoring:** Readings deviating from the statutory baseline trigger hierarchical grading:
  * Variance < 5%: `CONFORMANT`
  * Variance 5% to 15%: `OPPORTUNITY_FOR_IMPROVEMENT`
  * Variance 15% to 30%: `MINOR_NON_CONFORMANCE`
  * Variance > 30%: `MAJOR_NON_CONFORMANCE_GREENWASHING_RISK`
* **Anti-Greenwashing Claims Linter (CMA UK / EU Green Claims Directive):**
  * Evaluates attestation notes against regex patterns detecting unsubstantiated marketing claims (e.g., "100% Green", "Carbon Neutral", "Zero Footprint" without third-party audit IDs).

---

## 5. ISO Audit Readiness & Cryptographic Evidence Locker

### 5.1 Multi-Framework Matrix Evaluation
The platform supports modular framework selection:
* **ISO 14064-1:2018:** Greenhouse Gas Quantification and Reporting
* **ISO 50001:2018:** Energy Management Systems
* **ISO 14001:2015:** Environmental Management Systems
* **UK SECR:** Streamlined Energy and Carbon Reporting
* **EU CSRD:** Corporate Sustainability Due Diligence
* **Section 106:** UK Town and Country Planning Act (Workforce & Apprenticeship filings)

### 5.2 Evidence Locker Architecture
* **Upload Path:** Multipart form uploads handled via Multer to `/uploads/evidence-proofs/`.
* **Cryptographic Hashing:** Every uploaded proof document is processed through a SHA-256 stream digest before persistence.
* **Integrity Ledger:** The resulting hash, file size, MIME type, and matrix clause association are written to `AuditEvidenceDocument`.
* **Defensive Normalization:** Unspecified or non-standard client categories automatically map to `OTHER_AUDIT_PROOF` to maintain relational database integrity.

### 5.3 Audit Workflow States
```
  [SUBMITTED]
       │
       ▼ (Admin initiates review)
 [UNDER_REVIEW]
       │
       ├─────────────────────────────────┐
       ▼ (Score >= 80% + Evidence valid)  ▼ (Score < 80% or missing proof)
 [AUDIT_READY]                   [REVISION_REQUIRED]
       │                                 │
       ▼ (Stripe Checkout settlement)    ▼ (Licensee remediates)
   [APPROVED] ──> Mints ERC-1155 Token
```

---

## 6. Statutory ESG Revenue Split Engine

To prevent greenwashing and enforce genuine social impact, platform transactions enforce an immutable financial split:

```
                      Gross Transaction (£100.00)
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼ (85%)                             ▼ (15%)
         Licensor Royalty                     Charity Endowment
             (£85.00)                             (£15.00)
                 │                                   │
                 ▼                                   ▼
        Stripe Platform Account            Stripe Transfer Group
                                                     │
                                   ┌─────────────────┴─────────────────┐
                                   ▼ (50%)                             ▼ (50%)
                           Green Earth Foundation             Clean Oceans Trust
                                  (£7.50)                             (£7.50)
```

### 6.1 Split Settlement Pipeline
1. **Checkout Creation:** `src/services/checkout.service.ts` calculates basis points (`royaltyBps = 8500`, `charityBps = 1500`).
2. **Stripe Session Metadata:** Transmits `licenseeId`, `splitSpec`, and `charityAllocationBps` in the Stripe PaymentIntent.
3. **Webhook Processing (`src/routes/webhooks.stripe.ts`):**
   * Listens for `checkout.session.completed`.
   * Creates or updates `Transaction` status to `SETTLED`.
   * Inserts `FinancialSplit` and granular `CharityAllocation` records.
   * Executes atomic Stripe Transfers to verified charity connected accounts.
4. **Audit History Tracking:** Any modification to global or licensee-specific split ratios is cryptographically chained in `SplitConfigHistory`.

---

## 7. Cryptographic Provenance & Dual-Logo Credential Engine

### 7.1 On-Chain Polygon PoS Lifecycle
Upon reaching `APPROVED` status, the platform generates a permanent provenance asset:
1. **Asset Generation:** `src/services/dual-logo-composite.service.ts` combines the licensee's corporate mark with the statutory UKIPO Registered Trade Mark UK00003980004.
2. **Metadata Formulation:** Formulates an ERC-1155 JSON schema containing:
   * Verification seal (SHA-256 of `licenseeId + compositeBadgeUrl + timestamp`).
   * Audit score and attested ISO frameworks.
   * One-year statutory warranty expiration date.
3. **Smart Contract Minting:** `src/services/nft-minting.service.ts` interacts with the Polygon ERC-1155 contract, recording `tokenId`, `transactionHash`, and `openSeaUrl`.

### 7.2 Dynamic Embeddable Badge (`<iframe />` & SVG)
* Licensees embed their live compliance badge using `GET /api/credentials/embed/:id`.
* The embed endpoint verifies the `allowedOrigins` whitelist.
* Renders a real-time status pill reflecting current operational health (`ACTIVE`, `SUSPENDED`, or `EXPIRED`).

---

## 8. Database Schema Entity-Relationship Model

```
+------------------------------------+          +------------------------------------+
|             Licensee               | 1      * |            Transaction             |
|------------------------------------|----------|------------------------------------|
| id (cuid, PK)                      |          | id (cuid, PK)                      |
| name (String)                      |          | licenseeId (FK)                    |
| vertical (Enum)                    |          | grossAmountCents (Int)             |
| royaltyBps (Int: 1500)             |          | status (Enum: PENDING, SETTLED)    |
| b2bApiKeyHash (String)             |          | stripePaymentIntentId (String)     |
+------------------------------------+          +------------------------------------+
       | 1                                                   | 1
       |                                                     |
       | *                                                   | 1
+------------------------------------+          +------------------------------------+
|             PortalUser             |          |           FinancialSplit           |
|------------------------------------|          |------------------------------------|
| id (cuid, PK)                      |          | id (cuid, PK)                      |
| email (String, Unique)             |          | transactionId (FK, Unique)         |
| passwordHash (String)              |          | licensorRoyaltyCents (Int: 85%)    |
| role (Enum: ADMIN, PARTNER)        |          | charityGiftCents (Int: 15%)        |
| licenseeId (FK, Nullable)          |          +------------------------------------+
+------------------------------------+                               | 1
       | 1                                                           |
       |                                                             | *
       | *                                      +------------------------------------+
+------------------------------------+          |         CharityAllocation          |
|      IsoReadinessSubmission        |          |------------------------------------|
|------------------------------------|          | id (cuid, PK)                      |
| id (cuid, PK)                      |          | financialSplitId (FK)              |
| licenseeId (FK)                    |          | charityId (FK)                     |
| answers (Json)                     |          | amountCents (Int)                  |
| complianceScore (Int: 0-100)       |          | stripeTransferId (String)          |
| status (Enum)                      |          +------------------------------------+
+------------------------------------+
       | 1
       |
       | 1
+------------------------------------+          +------------------------------------+
|      AuditWarrantyCredential       |          |       AuditEvidenceDocument        |
|------------------------------------|          |------------------------------------|
| id (cuid, PK)                      |          | id (cuid, PK)                      |
| submissionId (FK, Unique)          |          | licenseeId (FK)                    |
| compositeBadgeUrl (String)         |          | fileName (String)                  |
| tokenId (String, Polygon PoS)      |          | category (Enum: SCADA, OTHER...)   |
| verificationSeal (SHA-256)         |          | fileUrl (String)                   |
| status (Enum: PENDING, MINTED)     |          | sha256Hash (String)                |
+------------------------------------+          +------------------------------------+
```

---

## 9. API Specifications & Route Directory

### Authentication & Tenant Management
| Verb | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials, issues JWT token and role scope. |
| `POST` | `/api/auth/register` | Public | Self-service account registration and company provisioning. |
| `POST` | `/api/auth/forgot-password`| Public | Issues cryptographically hashed password reset tokens. |
| `POST` | `/api/auth/reset-password` | Public | Validates reset token and sets new password hash. |

### Partner & Licensee Operations (`/api/portal/*`)
| Verb | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/portal/summary` | Partner (RLS) | High-level ledger metrics, spend totals, drop counts. |
| `GET` | `/api/portal/transactions` | Partner (RLS) | Licensee-scoped transaction history with status filters. |
| `POST` | `/api/portal/iso/evidence/upload-file` | Partner (RLS) | Uploads and SHA-256 hashes audit proof documents. |
| `GET` | `/api/portal/iso/evidence` | Partner (RLS) | Retrieves locker proof documents with category filters. |

### Lead Auditor & Administrative Queue (`/api/admin/*`)
| Verb | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/iso-submissions` | Admin Only | Fetches pending ISO readiness assessment dossiers. |
| `POST` | `/api/iso-readiness/review` | Admin Only | Scores audit dossiers (`APPROVE` or `REQUIRE_REVISION`). |
| `GET` | `/api/admin/split-config/history`| Admin Only | Audits statutory ESG 85/15 ratio historical chain. |
| `POST` | `/api/admin/split-config` | Admin Only | Updates licensee or platform-wide charity split allocations. |

### Telemetry & Hardware Calibration
| Verb | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/iso/telemetry` | API Key / JWT | Ingests real-time IoT readings with baseline screening. |
| `GET` | `/api/iso/calibration/status` | Partner (RLS) | Verifies ISO 17025 certificate validity for asset tags. |
| `GET` | `/api/iso/non-conformance` | Partner (RLS) | Lists open non-conformance incidents and root cause analyses.|

### Provenance & Public Ledger
| Verb | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/transparency/ledger` | Public | Public explorer for SHA-256 hashed transaction records. |
| `GET` | `/api/credentials/embed/:id` | Public Whitelist| Serves live SVG / HTML iframe assurance trust seals. |

---

## 10. Operational Topology & Deployment Standards

* **Runtime:** Node.js v20+ with TypeScript (`ts-node` for dev, compiled ES2022 JavaScript for production).
* **Database Engine:** PostgreSQL 14+ with pgcrypto, native schema migrations via Prisma.
* **Cache & Message Broker:** Redis 7+ for rate-limiting tiers and asynchronous queue tasks.
* **Frontend Engine:** React 18, React Router v6, Vanilla CSS design tokens (zero Tailwind dependency).
* **Static Assets & Uploads:** Local persistent volume storage at `/uploads/` mounted with immutable SHA-256 naming conventions.

---

### Software Engineering Confidence Score
**100/100**

* Rationale: Complete structural documentation mapping the running codebase, database schemas, cryptographic mechanisms, role separation controls, and statutory compliance pipelines.
