# GHG Emission Logs (repo: ghg_app, package: ghg-logo-drop)

Enterprise compliance SaaS. Production code only. Every change must be shippable as written.

## Stack
- Backend: Node 18+, Express 4, TypeScript (strict), Prisma 5, PostgreSQL with row-level security
- Frontend: React 18, Vite 5, react-router 6, TypeScript (strict)
- Payments: Stripe (hosted checkout, Connect splits, webhooks).
- Tests: Jest + ts-jest + supertest, run in band, need local PostgreSQL (tests/.env.test)
- Deploy: Railway (Nixpacks). Start runs `prisma migrate deploy`

## Layout
- src/routes: one file per API area, thin. Validate input, call a service, return.
- src/services: all business logic. Routes never contain business rules.
- src/db/rls.ts: `runWithRls` wraps every tenant-scoped query. Never query tenant tables outside it.
- src/pages and src/components: UI. src/api/client.ts is the only place the UI calls the API.
- prisma/migrations: schema changes ship as migrations, never by editing the database by hand.
- tests: one file per feature area. Add to the matching file.

## Commands
- Server dev: `npm run dev`   Client dev: `npm run frontend`
- Typecheck: `npx tsc --noEmit -p tsconfig.json`
- Test: `npm test`   Build: `npm run build`
- Migrate: `npm run migrate`. There is no seed: sample data lives only in tests/fixtures, and
  compliance frameworks are reference data in src/services/framework-registry.ts, synced at startup.

## Definition of done (every task, no exceptions)
1. Typecheck passes with zero errors. Paste the output.
2. `npm test` passes. New behavior has a test in tests/. Paste the summary line.
3. `npm run build` succeeds if routes, services, config or dependencies changed.
4. UI changes verified at 360px, 768px and 1280px widths, no horizontal scroll.
5. No TODO, FIXME, placeholder text, console.log, or commented-out code left in the diff.
6. If any of 1 to 4 could not be run, say which one and why. Never report done without it.

## Data and config rules (no hardcoding, no mocking)
- Prices, fee amounts, split percentages, charity names and counts come from the database or the API.
  Use `resolveActiveSplitConfig` (src/services/split-config.service.ts). Never write 200, 170, 30, 85 or 15 into UI text or logic.
- Contract addresses, API keys, URLs and model names come from environment variables.
- Required env vars are validated at boot. If one is missing, fail with a clear error.
  Never fall back to a fake value (no 'sk_test_placeholder', no zero address, no mock token ID).
- Any new env var is added to .env.example in the same change.
- Fixtures and test doubles live only in tests/. Application code under src/ never contains sample data.
- Every data view has loading, empty, error and success states, driven by real API responses.
- Generate IDs and references with crypto.randomUUID() or the database. Not Math.random().

## UI rules
- Layout and spacing go in CSS classes in src/index.css with media queries. Do not use inline style={{}} for layout,
  because inline styles cannot respond to screen size.
- Mobile first. Check 360px before desktop.
- Reuse existing components in src/components before creating new ones.
- Do not add to the large files (AdminPage, ReadinessEngineWorkflow, PortalPage, MerchStorePage,
  WorkflowWizard, PartnersPage). Extract new sections into new components in their own files.

## Code rules
- No `any`, no @ts-ignore in new code. Type the value or narrow it.
- Use the shared Prisma client in src/db.ts. Never create a new PrismaClient.
- Raw SQL only through parameterized queries. SET LOCAL values cannot be parameterized, so they
  must pass the validation already in runWithRls.
- Secrets never enter the repo or logs. Do not commit .env files.
- Errors returned to clients are generic. Detail goes to server logs only.

## Style
- No em-dashes in code, comments, UI copy or docs. Use a comma, colon or full stop.
- No emojis in UI, code or docs.
- Plain, direct copy suitable for an enterprise audience.

## Boundaries
- Do not add dependencies without asking.
- Do not touch files outside the scope of the task. Mention unrelated problems in the summary instead of fixing them.
- Do not rewrite or reformat code you were not asked to change.
- If a requirement is ambiguous or would force a hardcoded value, ask one specific question before coding.

## Working method
- For anything touching more than 3 files, write the plan first and wait for approval.
- Follow the nearest existing pattern. Name the file you copied the pattern from.
- Keep each change small and committable on its own.

# GHG Platform: Agent Knowledge Brief

## What the platform is
Three services, each with its own isolated pipeline:
1. Workforce
2. Fleet
3. GHG

The pipelines are separate workflows. They share nothing except the one
Fleet → GHG handoff described below.

## Onboarding
Every client starts with onboarding: a set of questions and preferences.
Their answers determine which service they are subscribing to. Route the
client to that service's pipeline and nothing else.

## Workforce pipeline
Questions → compliance standard → compliance engine review → output.
Compliance standards are versioned and kept up to date. Always record which
standard version was applied.

## Fleet pipeline
Fleet follows the Hiboo.ai model: the client gets a dedicated dashboard and an
API, fed by their equipment data. All data from all sources is normalized to
one standard schema (location, runtime, fuel/energy use, idling, fault codes),
and emissions are calculated from actual consumption. We mirror Hiboo.ai's
standards and keep them updated; record the standard version used in every
calculation.

Fleet has two onboarding branches, decided per asset by asking whether the
machine already reports to a cloud (OEM or telematics provider):

Branch A, machine already cloud-connected:
- Collect the client's access/credentials for that provider.
- Pull the machine's data into the client's dashboard via our own connector.

Branch B, machine not connected (e.g. an old generator):
- The machine has no cloud source, so it must first be connected.
- Use our in-house hardware to track the machine (fuel, runtime, emissions)
  and send data to our cloud.
- Where needed, a demo/consultation is booked to learn how to configure the
  machine to connect to the cloud.
- Once it reports data, it follows the same path as Branch A.

A single client can have both kinds of machines. Handle each asset on its own
branch.

## GHG pipeline
GHG runs its own independent workflow.

## The only intersection: Fleet → GHG
If a GHG client needs fleet data and does not have it:
1. Pause the GHG pipeline and save its state.
2. Run the client through the complete Fleet onboarding (both branches as needed).
3. Use the Fleet output as input to the GHG pipeline.
4. Resume GHG.
If the client already has the needed fleet data, continue GHG without Fleet.

## Rules
- Never merge or blend pipelines outside the Fleet → GHG handoff.
- A Fleet run triggered from GHG is the standard, complete Fleet pipeline.
- Never assume a machine is connected; confirm per asset.
- Log all routing decisions and handoffs.

## Clarifications (confirmed 2026-10-04)
- Merch stays as a separate shop. It is not one of the three pipelines and is not part of onboarding routing.
- A client can subscribe to several services. Each runs in its own isolated pipeline. Onboarding lets the client pick one or more (confirmed 2026-10-10) and lands them on the first; more can be added later. A service already held is never offered again.
- The Fleet standard data schema follows ISO 15143-3 (AEMP 2.0), the published standard OEMs and Hiboo.ai build on. The schema is versioned and the version is recorded with every calculation.
- Branch B uses a partner tracking device until in-house hardware exists. No partner is chosen yet, so device ingestion must be configurable: any tracker is added through configuration (device type, authentication, field mapping to the ISO 15143-3 schema), never through code written for one device.
- Uploaded files (evidence, logos) are stored on a Railway persistent volume at FILE_STORAGE_DIR, never in a public folder. Files are served only through authenticated, ownership-checked endpoints.
