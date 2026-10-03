-- Migration: remove_blockchain
-- On-chain minting and all blockchain features are withdrawn from the product. Credentials are issued and verified
-- from the platform database.
--   1. CredentialStatus.MINTED is renamed to ISSUED, preserving existing rows
--   2. WorkflowStatus.MINTED is removed. Existing MINTED rows become BADGE_ISSUED.
--      Transition log reasons are kept unchanged as the historical record.
--   3. All blockchain columns are dropped: credential and workflow token fields,
--      the keepsake token URI and the charity crypto wallet address.

-- 1. CredentialStatus
ALTER TYPE "CredentialStatus" RENAME VALUE 'MINTED' TO 'ISSUED';

-- 2. WorkflowStatus
UPDATE "WorkflowSubmission" SET "status" = 'BADGE_ISSUED' WHERE "status" = 'MINTED';
UPDATE "WorkflowTransitionLog" SET "newStatus" = 'BADGE_ISSUED' WHERE "newStatus" = 'MINTED';
UPDATE "WorkflowTransitionLog" SET "previousStatus" = 'BADGE_ISSUED' WHERE "previousStatus" = 'MINTED';

ALTER TYPE "WorkflowStatus" RENAME TO "WorkflowStatus_old";
CREATE TYPE "WorkflowStatus" AS ENUM (
  'ASSESSMENT_PENDING',
  'PREPARATION',
  'DRAFT',
  'SUBMITTED',
  'AI_SCREENED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PAID',
  'BADGE_ISSUED'
);

ALTER TABLE "WorkflowSubmission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkflowSubmission"
  ALTER COLUMN "status" TYPE "WorkflowStatus" USING ("status"::text::"WorkflowStatus");
ALTER TABLE "WorkflowSubmission" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "WorkflowTransitionLog"
  ALTER COLUMN "previousStatus" TYPE "WorkflowStatus" USING ("previousStatus"::text::"WorkflowStatus");
ALTER TABLE "WorkflowTransitionLog"
  ALTER COLUMN "newStatus" TYPE "WorkflowStatus" USING ("newStatus"::text::"WorkflowStatus");

DROP TYPE "WorkflowStatus_old";

-- 3. Drop blockchain columns
ALTER TABLE "AuditWarrantyCredential"
  DROP COLUMN IF EXISTS "tokenId",
  DROP COLUMN IF EXISTS "contractAddress",
  DROP COLUMN IF EXISTS "transactionHash",
  DROP COLUMN IF EXISTS "openSeaUrl";

ALTER TABLE "WorkflowSubmission"
  DROP COLUMN IF EXISTS "tokenId",
  DROP COLUMN IF EXISTS "contractAddress",
  DROP COLUMN IF EXISTS "transactionHash",
  DROP COLUMN IF EXISTS "openSeaUrl",
  DROP COLUMN IF EXISTS "mintedAt";

ALTER TABLE "CustomKeepsakeSpec" DROP COLUMN IF EXISTS "openSeaTokenUri";

ALTER TABLE "Charity" DROP COLUMN IF EXISTS "walletAddress";
