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
