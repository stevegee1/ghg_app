import crypto from 'crypto';
import request from 'supertest';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { collectFingerprints, createBatch } from '../src/services/anchor/anchor-batch.service';
import { setAnchorPublisher } from '../src/services/anchor/anchor-runtime';
import type { AnchorPublisher } from '../src/services/anchor/anchor-publisher';
import { verifyMerkleProof } from '../src/services/anchor/merkle';

const prisma = new PrismaClient();
const app = createApp();
const hex = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const onChain = new Map<string, string>();

const publisher: AnchorPublisher = {
  address: '0x000000000000000000000000000000000000bEEF',
  chainId: 80002,
  network: 'polygon-amoy',
  confirmationsRequired: 3,
  explorerTxUrl: 'https://amoy.polygonscan.com/tx/',
  publish: async () => ({ txHash: '0x' }),
  receipt: async () => null,
  readRoot: async (txHash) => onChain.get(txHash) ?? null,
};

let recordSha256: string;

beforeAll(async () => {
  setAnchorPublisher(publisher);
  const s = Date.now().toString(36);
  const licenseeId = (await prisma.licensee.create({ data: { name: `Verify ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } })).id;
  const project = await prisma.fleetProject.create({
    data: { licenseeId, name: 'Verified', contractValuePence: BigInt(100), budgetedMarginBps: 100, currency: 'GBP', startDate: new Date('2026-01-01') },
  });
  recordSha256 = hex(`verify-${s}`);
  await prisma.fleetProjectCostRun.create({
    data: {
      licenseeId,
      projectId: project.id,
      periodFrom: new Date('2026-01-01'),
      periodTo: new Date('2026-01-31'),
      methodVersion: 'TEST',
      inputs: {},
      results: {},
      recordSha256,
      createdById: 'test',
    },
  });
  await collectFingerprints(prisma);
});

afterAll(async () => {
  setAnchorPublisher(null);
  await prisma.$disconnect();
});

describe('Public record verification', () => {
  it('rejects input that is not a SHA-256 and returns nothing for an unknown hash', async () => {
    await request(app).get('/api/public/verify/not-a-hash').expect(400);
    const res = await request(app).get(`/api/public/verify/${hex('unknown')}`).expect(200);
    expect(res.body.matches).toEqual([]);
  });

  it('shows a fingerprinted record waiting for its batch', async () => {
    const res = await request(app).get(`/api/public/verify/${recordSha256}`).expect(200);
    expect(res.body.matches).toHaveLength(1);
    expect(res.body.matches[0]).toMatchObject({ kind: 'FLEET_COST_RUN', formulaHolds: true, batch: null, proofValid: null });
    expect(res.body.matches[0].chain.status).toBe('NOT_PUBLISHED');
    expect(res.body.matches[0]).not.toHaveProperty('licenseeId');
  });

  it('proves the record into a confirmed on-chain root and links the transaction', async () => {
    const batch = (await createBatch(prisma))!;
    const txHash = `0x${hex(`tx-${batch.id}`)}`;
    await prisma.anchorBatch.update({
      where: { id: batch.id },
      data: { status: 'CONFIRMED', txHash, chainId: 80002, network: 'polygon-amoy', blockNumber: BigInt(77), confirmedAt: new Date() },
    });
    onChain.set(txHash, batch.merkleRoot);

    const res = await request(app).get(`/api/public/verify/${recordSha256}`).expect(200);
    const m = res.body.matches[0];
    expect(m.proofValid).toBe(true);
    expect(verifyMerkleProof(m.leafHash, m.proof, m.batch.merkleRoot)).toBe(true);
    expect(m.chain).toEqual({ status: 'CONFIRMED', rootOnChainMatches: true, explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}` });
    expect(res.body.anchoringWallet).toBe(publisher.address);

    // Also found by its fingerprint.
    const byLeaf = await request(app).get(`/api/public/verify/${m.leafHash}`).expect(200);
    expect(byLeaf.body.matches[0].recordSha256).toBe(recordSha256);
  });

  it('reports a mismatch when the root on chain differs', async () => {
    const leaf = await prisma.anchorLeaf.findFirstOrThrow({ where: { recordSha256 } });
    const otherTx = `0x${hex(`other-${leaf.id}`)}`;
    await prisma.anchorBatch.update({ where: { id: leaf.batchId! }, data: { txHash: otherTx } });
    onChain.set(otherTx, hex('a different root'));
    const res = await request(app).get(`/api/public/verify/${recordSha256}`).expect(200);
    expect(res.body.matches[0].chain.rootOnChainMatches).toBe(false);
  });
});
