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
