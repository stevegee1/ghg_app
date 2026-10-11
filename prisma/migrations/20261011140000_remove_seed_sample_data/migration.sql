-- Removes the development seed's sample data wherever the seed was run, including production:
-- the sample companies ITM Power Test, JCB Test and Arsenal FC Test with their users, transactions
-- and everything they own, and the sample charities. Administrators and real clients are untouched.

-- Tenant tables force row level security; this migration acts as the platform for its own transaction.
SELECT set_config('app.is_admin', 'true', true);

CREATE TEMP TABLE "_sample_licensees" ON COMMIT DROP AS
SELECT "id" FROM "Licensee" WHERE "id" IN ('lic_itm_power', 'lic_jcb_test', 'lic_arsenal_fc');

-- A catalogue item pointed at the sample Arsenal company; it belongs to the platform store.
UPDATE "MerchProduct" SET "licenseeId" = 'lic_ghg_official'
WHERE "licenseeId" IN (SELECT "id" FROM "_sample_licensees");

-- Money records are not cascaded by the schema, so they are removed explicitly (children first).
DELETE FROM "FinancialSplit" WHERE "transactionId" IN (SELECT "id" FROM "Transaction" WHERE "licenseeId" IN (SELECT "id" FROM "_sample_licensees"));
DELETE FROM "TriggerEvent" WHERE "transactionId" IN (SELECT "id" FROM "Transaction" WHERE "licenseeId" IN (SELECT "id" FROM "_sample_licensees"));
DELETE FROM "Transaction" WHERE "licenseeId" IN (SELECT "id" FROM "_sample_licensees");
DELETE FROM "JobCreationReport" WHERE "licenseeId" IN (SELECT "id" FROM "_sample_licensees");
DELETE FROM "McpQueryLog" WHERE "licenseeId" IN (SELECT "id" FROM "_sample_licensees");

-- Sample users: their sign-in is disabled first, so any user that cannot be deleted (because it is
-- recorded as the author of shared platform data) can no longer log in.
UPDATE "PortalUser" SET "passwordHash" = '!disabled', "licenseeId" = NULL
WHERE "licenseeId" IN (SELECT "id" FROM "_sample_licensees") OR "id" IN ('usr_partner_001', 'usr_partner_002');
-- Everything else the sample companies own (API keys, imports, assets, submissions...) cascades from the company.
DELETE FROM "Licensee" WHERE "id" IN (SELECT "id" FROM "_sample_licensees");

DELETE FROM "PortalUser" u
WHERE (u."id" IN ('usr_partner_001', 'usr_partner_002') OR (u."passwordHash" = '!disabled' AND u."licenseeId" IS NULL AND u."role" <> 'ADMIN'))
  AND NOT EXISTS (SELECT 1 FROM "EmissionFactor" e WHERE e."createdByUserId" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "FleetApiKey" k WHERE k."createdById" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "FleetDataProvider" p WHERE p."createdById" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "FleetImportBatch" b WHERE b."uploadedById" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "FleetSetupRequest" r WHERE r."requestedById" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "SplitConfigHistory" c WHERE c."changedByUserId" = u."id");


-- Sample charities, unless a real payment's allocation still points at them (then they stay INACTIVE).
DELETE FROM "Charity" c
WHERE c."id" IN ('charity_green_earth', 'charity_ocean_clean', 'charity_youth_sport', 'charity_legacy_inactive')
  AND NOT EXISTS (SELECT 1 FROM "CharityAllocation" a WHERE a."charityId" = c."id");
UPDATE "Charity" SET "status" = 'INACTIVE'
WHERE "id" IN ('charity_green_earth', 'charity_ocean_clean', 'charity_youth_sport', 'charity_legacy_inactive');
