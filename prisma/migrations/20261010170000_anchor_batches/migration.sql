-- Fingerprints of platform records, batched daily into a Merkle root that is published on chain.
CREATE TYPE "AnchorRecordKind" AS ENUM ('FLEET_TELEMETRY_SNAPSHOT', 'FLEET_IMPORT_FILE', 'FLEET_COST_RUN', 'EVIDENCE_FILE', 'CREDENTIAL', 'SCOPE3_RECORD');
CREATE TYPE "AnchorBatchStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

CREATE TABLE "AnchorBatch" (
    "id" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "leafCount" INTEGER NOT NULL,
    "status" "AnchorBatchStatus" NOT NULL DEFAULT 'PENDING',
    "network" TEXT,
    "chainId" INTEGER,
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnchorBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AnchorBatch_root_hex" CHECK ("merkleRoot" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "AnchorBatch_merkleRoot_key" ON "AnchorBatch"("merkleRoot");
CREATE INDEX "AnchorBatch_status_createdAt_idx" ON "AnchorBatch"("status", "createdAt");

CREATE TABLE "AnchorLeaf" (
    "id" TEXT NOT NULL,
    "kind" "AnchorRecordKind" NOT NULL,
    "recordId" TEXT NOT NULL,
    "recordSha256" TEXT NOT NULL,
    "leafHash" TEXT NOT NULL,
    "licenseeId" TEXT,
    "batchId" TEXT,
    "leafIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnchorLeaf_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AnchorLeaf_hashes_hex" CHECK ("recordSha256" ~ '^[0-9a-f]{64}$' AND "leafHash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "AnchorLeaf_kind_recordId_key" ON "AnchorLeaf"("kind", "recordId");
CREATE INDEX "AnchorLeaf_leafHash_idx" ON "AnchorLeaf"("leafHash");
CREATE INDEX "AnchorLeaf_batchId_leafIndex_idx" ON "AnchorLeaf"("batchId", "leafIndex");
CREATE INDEX "AnchorLeaf_batchId_createdAt_idx" ON "AnchorLeaf"("batchId", "createdAt");
ALTER TABLE "AnchorLeaf" ADD CONSTRAINT "AnchorLeaf_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AnchorBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A fingerprint never changes once recorded, and its batch position is set once.
CREATE OR REPLACE FUNCTION "anchor_leaf_guard"() RETURNS trigger AS $$
BEGIN
  IF NEW."kind" <> OLD."kind" OR NEW."recordId" <> OLD."recordId" OR NEW."recordSha256" <> OLD."recordSha256" OR NEW."leafHash" <> OLD."leafHash" THEN
    RAISE EXCEPTION 'Anchor fingerprints cannot be changed';
  END IF;
  IF OLD."batchId" IS NOT NULL AND (NEW."batchId" IS DISTINCT FROM OLD."batchId" OR NEW."leafIndex" IS DISTINCT FROM OLD."leafIndex") THEN
    RAISE EXCEPTION 'A batched fingerprint cannot be moved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AnchorLeaf_guard" BEFORE UPDATE ON "AnchorLeaf" FOR EACH ROW EXECUTE FUNCTION "anchor_leaf_guard"();
CREATE OR REPLACE FUNCTION "anchor_leaf_no_delete"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Anchor fingerprints cannot be deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "AnchorLeaf_no_delete" BEFORE DELETE ON "AnchorLeaf" FOR EACH ROW EXECUTE FUNCTION "anchor_leaf_no_delete"();
