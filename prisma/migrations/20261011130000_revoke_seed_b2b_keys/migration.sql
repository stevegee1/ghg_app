-- The development seed gave its two sample companies B2B API keys whose plain values are in the
-- repository history (prisma/seed.ts, and formerly the browser bundle). Remove those keys wherever the
-- seed has run, including production. Real clients' keys are not affected.
UPDATE "Licensee"
SET "b2bApiKeyHash" = NULL
WHERE "id" IN ('lic_itm_power', 'lic_jcb_test');
