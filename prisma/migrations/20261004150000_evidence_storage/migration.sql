-- Migration: evidence_storage
-- Evidence files are kept in private storage and served only through an authenticated,
-- ownership-checked endpoint. Records created before this change have no stored file.

ALTER TABLE "AuditEvidenceDocument" ADD COLUMN "storageKey" TEXT;
