-- Migration: retire_legacy_frameworks
-- The framework registry (prisma/seeds/framework-seed.ts) is the single source of frameworks.
-- Four frameworks were previously upserted on every server boot with conflicting definitions
-- (ISO 14064-1 typed as CARBON, a duplicate Section 106). They are retired, not deleted, so
-- historical submissions keep their framework.

ALTER TABLE "WorkflowFramework" ADD COLUMN "retiredAt" TIMESTAMP(3);

UPDATE "WorkflowFramework"
SET "retiredAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('ISO_14064_1', 'ISO_50001', 'UK_SECTION_106', 'SOCIAL_VALUE_PPN0620');
