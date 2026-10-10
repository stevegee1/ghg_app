import crypto from 'crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { buildMerkleTree, merkleProof, verifyMerkleProof } from '../src/services/anchor/merkle';
import { collectFingerprints, createBatch, leafHashFor, proofForLeaf } from '../src/services/anchor/anchor-batch.service';

const prisma = new PrismaClient();
const app = createApp();
const hex = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Merkle tree', () => {
  it('proves every leaf for trees of 1 to 17 leaves, and rejects altered leaves or proofs', () => {
    for (let n = 1; n <= 17; n++) {
      const leaves = Array.from({ length: n }, (_, i) => hex(`leaf-${n}-${i}`));
      const tree = buildMerkleTree(leaves);
      leaves.forEach((leaf, i) => {
        const proof = merkleProof(tree, i);
        expect(verifyMerkleProof(leaf, proof, tree.root)).toBe(true);
        expect(verifyMerkleProof(hex('other'), proof, tree.root)).toBe(false);
        if (proof.length > 0) expect(verifyMerkleProof(leaf, [hex('x'), ...proof.slice(1)], tree.root)).toBe(false);
      });
    }
    expect(buildMerkleTree([hex('only')]).root).toBe(hex('only'));
    expect(() => buildMerkleTree([])).toThrow();
    expect(() => buildMerkleTree(['NOT-HEX'])).toThrow();
  });
});

describe('Fingerprints and batches', () => {
  let licenseeId: string;
  let runId: string;
  let runHash: string;

  beforeAll(async () => {
    const s = Date.now().toString(36);
    licenseeId = (await prisma.licensee.create({ data: { name: `Anchor ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
    const project = await prisma.fleetProject.create({
      data: { licenseeId, name: 'Anchored', contractValuePence: BigInt(100), budgetedMarginBps: 100, currency: 'GBP', startDate: new Date('2026-01-01') },
    });
    runHash = hex(`run-${s}`);
    runId = (
      await prisma.fleetProjectCostRun.create({
        data: {
          licenseeId,
          projectId: project.id,
          periodFrom: new Date('2026-01-01'),
          periodTo: new Date('2026-01-31'),
          methodVersion: 'TEST',
          inputs: {},
          results: {},
          recordSha256: runHash,
          createdById: 'test',
        },
      })
    ).id;
  });

  it('fingerprints new records once, with the published formula, and batches them under a provable root', async () => {
    await collectFingerprints(prisma);
    const again = await collectFingerprints(prisma);
    expect(again.FLEET_COST_RUN).toBe(0);

    const leaf = await prisma.anchorLeaf.findUniqueOrThrow({ where: { kind_recordId: { kind: 'FLEET_COST_RUN', recordId: runId } } });
    expect(leaf.recordSha256).toBe(runHash);
    expect(leaf.leafHash).toBe(leafHashFor('FLEET_COST_RUN', runId, runHash));
    expect(leaf.licenseeId).toBe(licenseeId);

    const batch = await createBatch(prisma);
    expect(batch).not.toBeNull();
    const proved = await proofForLeaf(prisma, leaf.id);
    expect(proved!.batch.id).toBe(batch!.id);
    expect(verifyMerkleProof(leaf.leafHash, proved!.proof, batch!.merkleRoot)).toBe(true);
    expect(await createBatch(prisma)).toBeNull();
  });

  it('never lets a fingerprint be altered, moved or deleted', async () => {
    const leaf = await prisma.anchorLeaf.findUniqueOrThrow({ where: { kind_recordId: { kind: 'FLEET_COST_RUN', recordId: runId } } });
    await expect(prisma.anchorLeaf.update({ where: { id: leaf.id }, data: { recordSha256: hex('tampered') } })).rejects.toThrow();
    await expect(prisma.anchorLeaf.update({ where: { id: leaf.id }, data: { leafIndex: 999 } })).rejects.toThrow();
    await expect(prisma.anchorLeaf.delete({ where: { id: leaf.id } })).rejects.toThrow();
  });

  it('administrators can see batches and run collection on demand', async () => {
    const admin = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
    const client = jwt.sign({ userId: 'u', role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
    await request(app).get('/api/admin/anchors').set('Authorization', `Bearer ${client}`).expect(403);
    const run = await request(app).post('/api/admin/anchors/run').set('Authorization', `Bearer ${admin}`).expect(200);
    expect(run.body).toHaveProperty('added');
    const list = await request(app).get('/api/admin/anchors').set('Authorization', `Bearer ${admin}`).expect(200);
    expect(list.body.batches.length).toBeGreaterThan(0);
    expect(list.body.fingerprintsByKind.FLEET_COST_RUN).toBeGreaterThan(0);
    expect(list.body.unbatched).toBe(0);
  });
});
