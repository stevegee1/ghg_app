-- AlterTable
ALTER TABLE "TriggerEvent" ADD COLUMN "attestationNote" TEXT;

-- Backfill pre-existing rows based on verificationSource
UPDATE "TriggerEvent"
SET "attestationNote" = CASE "verificationSource"::text
  WHEN 'THIRD_PARTY_API' THEN 'Data submitted via partner''s own API/telemetry system. Not independently audited.'
  WHEN 'MANUAL_ATTESTATION' THEN 'Manually attested by an authorized user. Not independently audited.'
  WHEN 'CONSUMER_OPT_IN' THEN 'Consumer opt-in selection at checkout. No underlying emissions claim is made for this transaction type.'
  ELSE 'Data submitted via partner system. Not independently audited.'
END
WHERE "attestationNote" IS NULL;
