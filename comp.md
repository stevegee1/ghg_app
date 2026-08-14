# GHG Logo Drop — Comprehensive Platform Architecture & System Documentation

---

## 1. Executive Summary & Platform Vision

**GHG Logo Drop** is a financial compliance, Web3 digital provenance, and trademark royalty routing platform. It connects corporate enterprise partners, consumer event organizers, and verified environmental charity organizations into an automated, auditable financial ecosystem.

### Core Value Proposition & Financial Guarantee
Every trademark "logo drop" on a physical product, digital web application, or consumer event souvenir enforces an automated, auditable financial split (by default **85% Licensor Royalty / 15% Verified Environmental Charity**). Every settled transaction is backed by:
- **On-Chain Digital Provenance**: ERC-721 Web3 token links on OpenSea (`https://opensea.io/assets/...`).
- **Audit-Grade Compliance Certificates**: Dynamic downloadable PDF certificates generated on-the-fly via PDFKit.
- **Unconditional Legal Disclaimers**: Verbatim platform disclaimers clarifying that figures represent settled financial transactions and that partner environmental assertions are not independently audited by this platform.

---

## 2. The 3 Core Product Pillars

```
+-----------------------------------------------------------------------------------+
|                                  GHG LOGO DROP                                    |
+-----------------------------------------+-----------------------------------------+
|                                         |                                         |
|  1. Enterprise Carbon Licensing        |  2. Consumer & Event Souvenir Drops     |
|     - Annual CO2e Footprint Calc        |     - Weddings, Galas, Birthdays        |
|     - 1-Year Verified Warranty Mark     |     - Physical Merch & Custom Items     |
|     - Website/Software Embed Snippet    |     - Public Dropshipping Tracker       |
|                                         |                                         |
+-----------------------------------------+-----------------------------------------+
|                                                                                   |
|  3. Official Company Merchandise Store                                           |
|     - Internal Apparel (Caps, Hoodies, T-Shirts, Eco Bottles)                     |
|     - Instant Stripe Checkout & 85/15 Split Routing                              |
|     - OpenSea Digital Provenance Verification                                     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Pillar 1: Enterprise Annual Carbon Emissions & Warranty Licensing (`/licensing`)
- **Annual Carbon Footprint Calculator**: Enterprise corporate partners input their annual carbon emissions (e.g. `250 tonnes CO2e/year`).
- **Financial Metric Engine**: Automatically calculates annual licensing fees based on carbon scale (£10 per tonne CO2e/year, minimum £500/year).
- **1-Year Verified Warranty Mark**: Issues an active 1-Year Verified Warranty Mark (`✓ Active (Exp: 2027-08-11)`) with annual renewal date tracking.
- **Software & Website Embed Generator**: Generates a unique B2B API Key (`ghg_live_itm_99882233`) and a copyable HTML `<script>` embed snippet:
  ```html
  <div id="ghg-logo-drop" data-api-key="ghg_live_itm_99882233" data-theme="dark"></div>
  <script src="https://cdn.ghglogodrop.com/embed.js" async></script>
  ```

---

### Pillar 2: Personal & Consumer Event Souvenir Drops (`/souvenirs` & `/public-tracker`)
- **Universal Consumer Access**: Open to anyone (wedding souvenirs, birthday events, community galas, custom merch).
- **Event Order Form**: Form collects event name, occasion category, target event deadline, souvenir item selection (Eco Organic Cotton Tote Bags £2.50, Printed Mugs £3.00, Organic T-Shirts £8.00, Bamboo Gift Boxes £12.00), order quantity, and delivery destination.
- **Stripe Order Settlement**: Instant test mode card checkout to secure production before event deadlines.
- **Public Dropshipping Tracker ([`/public-tracker`](file:///Users/user/ghg_app/src/pages/PublicTrackerPage.tsx))**: Public tracking portal searchable by Order Reference ID (`ord_wedding_9988`) displaying live step progress:
  1. 📝 *Order Placed & Secured*
  2. 🎨 *Logo Overlay Approved*
  3. 🖨️ *Logo Drop Printed*
  4. 🚚 *Out for Dropshipping*
  5. 🎁 *Delivered Before Event*

---

### Pillar 3: Official Company Merchandise Store ([`/merch`](file:///Users/user/ghg_app/src/pages/MerchStorePage.tsx))
- **Internal Company Apparel & Gear Catalog**:
  - **GHG Logo Drop Official Embroidered Cap** (£20.00)
  - **GHG Logo Drop Heavyweight Cotton Sweatshirt / Hoodie** (£45.00)
  - **GHG Logo Drop Organic Cotton T-Shirt** (£25.00)
  - **GHG Logo Drop Eco Stainless Steel Water Bottle** (£18.00)
- **Live 85/15 Charity Split Bar**: Displays exact licensor royalty vs charity allocation in real-time.
- **OpenSea Digital Provenance Badge**: Generates an instant post-purchase OpenSea verification link.

---

## 3. Backend Architecture & Security Infrastructure

### PostgreSQL Schema & Row Level Security (RLS)
The database schema (`prisma/schema.prisma`) maintains multi-tenant isolation via PostgreSQL Row Level Security (RLS):
- **`Licensee`**: Registered corporate licensees (e.g. `lic_itm_power`, `lic_arsenal_fc`).
- **`User`**: System accounts assigned roles (`ADMIN` or `PARTNER`) and linked to specific `licenseeId`s.
- **`Transaction`**: Immutable record of gross volume, settled status, verification trigger notes, and delivery types.
- **`SplitConfig`**: Versioned split configurations stored in basis points (10000 bps = 100%).
- **`AuditLog`**: Insert-only audit trail logging every admin split configuration change.

### Financial Split Calculation Engine (`src/services/splitEngine.service.ts`)
The split engine operates in integer basis points (`bps`) to eliminate floating-point rounding errors:
$$\text{Licensor Royalty Cents} = \left\lfloor \frac{\text{Gross Amount Cents} \times \text{Royalty Bps}}{10000} \right\rfloor$$
$$\text{Charity Gift Cents} = \text{Gross Amount Cents} - \text{Licensor Royalty Cents}$$

### Admin Versioned Governance (`/admin`)
Split configurations are versioned and immutable:
- When an admin updates split percentages, the previous configuration is marked `isActive = false`, and the new configuration is created with `previousConfigId` pointing to the previous version.
- Requires explicit user confirmation via a modal dialog before applying.

---

## 4. API Endpoints Reference

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token + user profile | None |
| `POST` | `/api/checkout` | Create Stripe PaymentIntent for product purchases | None |
| `POST` | `/api/b2b-trigger` | Create B2B logo drop licensing transaction | None |
| `GET` | `/api/portal/summary` | Return scoped licensee summary metrics | `PARTNER` / `ADMIN` |
| `GET` | `/api/portal/transactions` | Return scoped partner transaction ledger | `PARTNER` / `ADMIN` |
| `GET` | `/api/portal/transactions/:id/pdf` | Generate & download PDF compliance certificate | `PARTNER` / `ADMIN` |
| `GET` | `/api/v1/transparency-ledger` | Return public transparency ledger & partner list | None |
| `GET` | `/api/admin/split-config` | Fetch versioned split config history | `ADMIN` only |
| `POST` | `/api/admin/split-config` | Create new versioned split config | `ADMIN` only |

---

## 5. Deployment & Build Operations

### Railway Cloud Deployment
The repository is prepared for zero-downtime deployment on **Railway.app**:
- **`Procfile`**: `web: node dist/src/index.js`
- **`railway.json`**: Pre-configures Railway Nixpacks build (`npm run build`), release migrations (`npm run db:deploy`), and process launch.
- **Build Script**: `npm run build` executes `tsc -p tsconfig.server.json` (compiles Express server to `dist/src`) and `vite build` (compiles React SPA to `dist/`).

---

## 6. Project File Directory Tree

```text
ghg_app/
├── comp.md                        # Comprehensive system documentation (this file)
├── Procfile                       # Railway process entrypoint
├── railway.json                   # Railway Nixpacks build & release configuration
├── package.json                   # Project dependencies and script definitions
├── tsconfig.json                  # Root TypeScript configuration
├── tsconfig.server.json           # Dedicated Express backend compilation config
├── vite.config.ts                 # Vite bundler configuration
├── prisma/
│   ├── schema.prisma              # PostgreSQL database models
│   └── seed.ts                    # Test account & licensee database seed script
├── src/
│   ├── index.ts                   # Entrypoint initializing DB connection & Express
│   ├── app.ts                     # Express routes, middleware & static SPA fallback
│   ├── index.css                  # Custom CSS design system tokens
│   ├── AppClient.tsx              # React Router SPA route definitions
│   ├── api/                       # API integration & mock client fallbacks
│   ├── components/                # Reusable UI widgets (SoftwareEmbedBuilder, OpenSeaBadge, etc.)
│   ├── context/                   # AuthContext state management
│   ├── db/                        # PostgreSQL Row Level Security (RLS) helpers
│   ├── jobs/                      # Background reconciliation cron jobs
│   ├── middleware/                # JWT auth and RLS session middleware
│   ├── pages/                     # Feature pages (Licensing, Souvenirs, Tracker, Merch, Transparency)
│   ├── routes/                    # Express REST API route controllers
│   └── services/                  # Business logic services (Checkout, PDF, SplitEngine)
└── tests/                         # Automated test suite (8 test files)
```
