# Milestone 5d: Verification Honesty

## Platform Verification Scope & Statement

This platform acts as an automated transaction-routing, royalty-splitting, and transparency ledger engine for branded logo drop drops. **The platform does not independently audit, measure, or verify any partner's carbon, environmental, or emissions claims.** All claim data recorded by the system represents self-reported telemetry, partner API assertions, or consumer opt-in choices at checkout. While the platform guarantees strict cryptographic document integrity (SHA-256) and database split enforcement for financial allocations, these guarantees prove document authenticity and financial routing accuracy—they do not validate the real-world environmental truth of underlying partner assertions.

---

## Technical Design & Architecture

### 1. `TriggerEvent.attestationNote` & Standard Defaults
Every `TriggerEvent` row records an `attestationNote` describing the exact provenance and verification scope of the trigger:
- **`THIRD_PARTY_API`**: `"Data submitted via partner's own API/telemetry system. Not independently audited."`
- **`MANUAL_ATTESTATION`**: `"Manually attested by an authorized user. Not independently audited."`
- **`CONSUMER_OPT_IN`**: `"Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type."`

### 2. Guardrails Against Misleading Custom Notes
Callers can supply custom `attestationNote` strings, but custom notes are validated via `validateAttestationNote()`. Any custom note containing misleading claims of independent audit or certification (`"independently verified"`, `"certified"`, `"audited"`, `"carbon offset verified"`) is rejected with a `400 Bad Request` error (`"Custom attestationNote cannot claim independent verification or certification."`).

### 3. Public Disclaimers & Certificate Rendering
- **Generated PDF Certificates**: Render a prominent standing disclaimer near summary aggregate figures:
  `"Verification Disclaimer: This certificate reflects licensing transaction and charitable-routing data only. It does not independently verify any partner's environmental or carbon claims."`
- **Public Transparency Ledger**: `/api/v1/transparency-ledger` includes an unconditional top-level `dataDisclaimer` field on every response:
  `"Figures reflect settled licensing transactions and charitable routing only. Partner environmental claims are not independently verified by this platform."`
