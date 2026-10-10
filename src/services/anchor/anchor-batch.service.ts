import { AnchorRecordKind, Prisma, PrismaClient } from '@prisma/client';
import { sha256Hex } from '../canonical-hash.service';
import { buildMerkleTree, merkleProof } from './merkle';

/** Largest number of fingerprints in one on-chain batch. */
export const MAX_BATCH_LEAVES = 100_000;

/** The fingerprint published for a record, binding its kind and ID to its content hash. */
export function leafHashFor(kind: AnchorRecordKind, recordId: string, recordSha256: string): string {
  return sha256Hex(`${kind}:${recordId}:${recordSha256}`);
}

/**
 * Where each kind of record keeps its SHA-256. Every source query returns id, licenseeId and hash,
 * and only well-formed lowercase hex hashes are taken.
 */
const SOURCES: { kind: AnchorRecordKind; sql: Prisma.Sql }[] = [
  {
    kind: AnchorRecordKind.FLEET_TELEMETRY_SNAPSHOT,
    sql: Prisma.sql`SELECT "id", "licenseeId", "payloadSha256" AS "hash" FROM "FleetTelemetrySnapshot"`,
  },
  {
    kind: AnchorRecordKind.FLEET_IMPORT_FILE,
    sql: Prisma.sql`SELECT "id", "licenseeId", "fileSha256" AS "hash" FROM "FleetImportBatch"`,
  },
  {
    kind: AnchorRecordKind.FLEET_COST_RUN,
    sql: Prisma.sql`SELECT "id", "licenseeId", "recordSha256" AS "hash" FROM "FleetProjectCostRun"`,
  },
  {
    kind: AnchorRecordKind.EVIDENCE_FILE,
    sql: Prisma.sql`SELECT "id", "licenseeId", "sha256Hash" AS "hash" FROM "AuditEvidenceDocument"`,
  },
  {
    kind: AnchorRecordKind.CREDENTIAL,
    sql: Prisma.sql`SELECT "id", "licenseeId", "verificationSeal" AS "hash" FROM "AuditWarrantyCredential" WHERE "status" = 'ISSUED'`,
  },
];

/**
 * Records a fingerprint for every record that does not have one yet. Safe to run repeatedly.
 * The leaf hash is computed in the database with the same formula as leafHashFor.
 */
export async function collectFingerprints(prisma: PrismaClient): Promise<Record<string, number>> {
  const added: Record<string, number> = {};
  for (const source of SOURCES) {
    added[source.kind] = await prisma.$executeRaw`
      INSERT INTO "AnchorLeaf" ("id", "kind", "recordId", "recordSha256", "leafHash", "licenseeId")
      SELECT gen_random_uuid()::text, ${source.kind}::"AnchorRecordKind", s."id", s."hash",
             encode(sha256(convert_to(${source.kind} || ':' || s."id" || ':' || s."hash", 'UTF8')), 'hex'),
             s."licenseeId"
      FROM (${source.sql}) s
      WHERE s."hash" ~ '^[0-9a-f]{64}$'
      ON CONFLICT ("kind", "recordId") DO NOTHING`;
  }
  return added;
}

/** Adds one record's fingerprint straight away (used for records created outside the daily sources). */
export async function addFingerprint(
  db: PrismaClient | Prisma.TransactionClient,
  params: { kind: AnchorRecordKind; recordId: string; recordSha256: string; licenseeId: string | null }
) {
  return db.anchorLeaf.upsert({
    where: { kind_recordId: { kind: params.kind, recordId: params.recordId } },
    create: { ...params, leafHash: leafHashFor(params.kind, params.recordId, params.recordSha256) },
    update: {},
  });
}

/**
 * Puts every unbatched fingerprint (oldest first, up to MAX_BATCH_LEAVES) into a new batch and
 * records each one's position. Returns null when there is nothing to batch.
 */
export async function createBatch(prisma: PrismaClient) {
  return prisma.$transaction(
    async (tx) => {
      const leaves = await tx.anchorLeaf.findMany({
        where: { batchId: null },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: MAX_BATCH_LEAVES,
        select: { id: true, leafHash: true },
      });
      if (leaves.length === 0) return null;
      const tree = buildMerkleTree(leaves.map((l) => l.leafHash));
      const batch = await tx.anchorBatch.create({ data: { merkleRoot: tree.root, leafCount: leaves.length } });
      // Positions are written in chunks to keep each statement small.
      for (let start = 0; start < leaves.length; start += 1000) {
        const chunk = leaves.slice(start, start + 1000);
        const values = Prisma.join(chunk.map((l, i) => Prisma.sql`(${l.id}, ${start + i})`));
        await tx.$executeRaw`
          UPDATE "AnchorLeaf" AS a SET "batchId" = ${batch.id}, "leafIndex" = v.idx
          FROM (VALUES ${values}) AS v(id, idx)
          WHERE a."id" = v.id AND a."batchId" IS NULL`;
      }
      return batch;
    },
    { timeout: 120_000 }
  );
}

/** The proof that a fingerprint is in its batch root, rebuilt from the stored batch order. */
export async function proofForLeaf(prisma: PrismaClient, leafId: string) {
  const leaf = await prisma.anchorLeaf.findUnique({ where: { id: leafId }, include: { batch: true } });
  if (!leaf || !leaf.batch || leaf.leafIndex === null) return null;
  const ordered = await prisma.anchorLeaf.findMany({
    where: { batchId: leaf.batchId },
    orderBy: { leafIndex: 'asc' },
    select: { leafHash: true },
  });
  const tree = buildMerkleTree(ordered.map((l) => l.leafHash));
  if (tree.root !== leaf.batch.merkleRoot) throw new Error(`Batch ${leaf.batchId} no longer matches its stored root`);
  return { leaf, batch: leaf.batch, proof: merkleProof(tree, leaf.leafIndex) };
}
