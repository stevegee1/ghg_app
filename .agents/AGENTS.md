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
- Migrate: `npm run migrate`   Seed: `npm run seed`

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