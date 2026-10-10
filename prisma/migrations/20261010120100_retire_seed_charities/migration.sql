-- The three sample charities written by the development seed are not real partners.
-- They are set INACTIVE rather than deleted, so any payment history that references them is kept,
-- and their places open for real applicants.
UPDATE "Charity"
SET "status" = 'INACTIVE', "updatedAt" = NOW()
WHERE "id" IN ('charity_green_earth', 'charity_ocean_clean', 'charity_youth_sport');

-- Active split configurations that route the charity share to them are replaced by a new history row
-- without those entries. The charity share is then recorded and held until an administrator sets a
-- configuration with real charities.
CREATE TEMP TABLE "_seed_split_cleanup" ON COMMIT DROP AS
SELECT
  c."id" AS "oldId",
  c."licenseeId",
  c."royaltyBps",
  c."changedByUserId",
  COALESCE(
    (
      SELECT jsonb_agg(e)
      FROM jsonb_array_elements(c."charityAllocationBps"::jsonb) AS e
      WHERE COALESCE(e->>'charityId', e->>'id') NOT IN ('charity_green_earth', 'charity_ocean_clean', 'charity_youth_sport')
    ),
    '[]'::jsonb
  ) AS "bps"
FROM "SplitConfigHistory" c
WHERE c."isActive" = true
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(c."charityAllocationBps"::jsonb) AS e
    WHERE COALESCE(e->>'charityId', e->>'id') IN ('charity_green_earth', 'charity_ocean_clean', 'charity_youth_sport')
  );

UPDATE "SplitConfigHistory" SET "isActive" = false
WHERE "id" IN (SELECT "oldId" FROM "_seed_split_cleanup");

INSERT INTO "SplitConfigHistory" ("id", "licenseeId", "royaltyBps", "charityAllocationBps", "isActive", "changedByUserId", "changedAt", "previousConfigId")
SELECT gen_random_uuid()::text, "licenseeId", "royaltyBps", "bps", true, "changedByUserId", NOW(), "oldId"
FROM "_seed_split_cleanup";
