import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  ANCHOR_ENV,
  AnchorPublisher,
  AnchorReceipt,
  FeeAboveCapError,
  anchorTxData,
  readAnchorConfig,
  rootFromTxData,
} from '../src/services/anchor/anchor-publisher';
import { DROPPED_AFTER_MS, MAX_PUBLISH_ATTEMPTS, publishAndConfirm } from '../src/services/anchor/anchor-publish.service';

const prisma = new PrismaClient();
const hex = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Anchoring configuration', () => {
  const saved = Object.fromEntries(Object.values(ANCHOR_ENV).map((k) => [k, process.env[k]]));
  const valid = {
    [ANCHOR_ENV.rpcUrl]: 'https://rpc-amoy.example.org',
    [ANCHOR_ENV.privateKey]: `0x${'1'.repeat(64)}`,
    [ANCHOR_ENV.chainId]: '80002',
    [ANCHOR_ENV.maxFeeGwei]: '150',
    [ANCHOR_ENV.confirmations]: '30',
    [ANCHOR_ENV.explorerTxUrl]: 'https://amoy.polygonscan.com/tx/',
  };
  const set = (env: Record<string, string | undefined>) => {
    for (const k of Object.values(ANCHOR_ENV)) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
  };
  afterAll(() => set(saved));

  it('is off when nothing is set, and on with a full valid configuration', () => {
    set({});
    expect(readAnchorConfig()).toBeNull();
    set(valid);
    expect(readAnchorConfig()).toMatchObject({ chainId: 80002, network: 'polygon-amoy', confirmations: 30 });
  });

  it('refuses a partial or invalid configuration', () => {
    set({ [ANCHOR_ENV.rpcUrl]: valid[ANCHOR_ENV.rpcUrl] });
    expect(() => readAnchorConfig()).toThrow(/partly configured/);
    set({ ...valid, [ANCHOR_ENV.chainId]: '1' });
    expect(() => readAnchorConfig()).toThrow(/ANCHOR_CHAIN_ID/);
    set({ ...valid, [ANCHOR_ENV.privateKey]: 'abc' });
    expect(() => readAnchorConfig()).toThrow(/ANCHOR_PRIVATE_KEY/);
    set({ ...valid, [ANCHOR_ENV.rpcUrl]: 'http://insecure.example' });
    expect(() => readAnchorConfig()).toThrow(/https/);
  });
});

describe('Anchor transaction data', () => {
  it('carries the prefix and root and reads back exactly', () => {
    const root = hex('root');
    expect(rootFromTxData(anchorTxData(root))).toBe(root);
    expect(rootFromTxData('0x1234')).toBeNull();
  });
});

/** A chain double: records what was published and returns scripted receipts. */
function fakeChain() {
  const sent: string[] = [];
  const receipts = new Map<string, AnchorReceipt | null>();
  let feeTooHigh = false;
  const publisher: AnchorPublisher = {
    address: '0x000000000000000000000000000000000000dEaD',
    chainId: 80002,
    network: 'polygon-amoy',
    confirmationsRequired: 3,
    explorerTxUrl: 'https://amoy.polygonscan.com/tx/',
    async publish(root) {
      if (feeTooHigh) throw new FeeAboveCapError('900', 150);
      sent.push(root);
      return { txHash: `0x${hex(`${root}-${sent.length}`)}` };
    },
    async receipt(txHash) {
      return receipts.has(txHash) ? receipts.get(txHash)! : null;
    },
    async readRoot() {
      return null;
    },
  };
  return { publisher, sent, receipts, setFeeTooHigh: (v: boolean) => (feeTooHigh = v) };
}

describe('Publishing and confirming batch roots', () => {
  beforeEach(async () => {
    await prisma.anchorBatch.updateMany({ where: { status: { in: ['PENDING', 'FAILED', 'SUBMITTED'] } }, data: { status: 'CONFIRMED' } });
  });

  it('publishes a waiting batch once, then confirms it after enough confirmations', async () => {
    const chain = fakeChain();
    const batch = await prisma.anchorBatch.create({ data: { merkleRoot: hex(`b1-${Date.now()}`), leafCount: 1 } });

    const first = await publishAndConfirm(prisma, chain.publisher);
    expect(first.published).toBe(1);
    const submitted = await prisma.anchorBatch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(submitted).toMatchObject({ status: 'SUBMITTED', network: 'polygon-amoy', chainId: 80002, attempts: 1 });

    chain.receipts.set(submitted.txHash!, { state: 'PENDING' });
    await publishAndConfirm(prisma, chain.publisher);
    expect((await prisma.anchorBatch.findUniqueOrThrow({ where: { id: batch.id } })).status).toBe('SUBMITTED');
    expect(chain.sent).toEqual([batch.merkleRoot]);

    chain.receipts.set(submitted.txHash!, { state: 'CONFIRMED', blockNumber: 1234, confirmations: 3 });
    const done = await publishAndConfirm(prisma, chain.publisher);
    expect(done.confirmed).toBe(1);
    expect(await prisma.anchorBatch.findUniqueOrThrow({ where: { id: batch.id } })).toMatchObject({ status: 'CONFIRMED', blockNumber: BigInt(1234) });
  });

  it('waits without using an attempt when the network fee is above the cap', async () => {
    const chain = fakeChain();
    chain.setFeeTooHigh(true);
    const batch = await prisma.anchorBatch.create({ data: { merkleRoot: hex(`b2-${Date.now()}`), leafCount: 1 } });
    await publishAndConfirm(prisma, chain.publisher);
    const after = await prisma.anchorBatch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(after).toMatchObject({ status: 'PENDING', attempts: 0 });
    expect(after.lastError).toMatch(/above the cap/);
  });

  it('republishes after a revert or a dropped transaction, up to the attempt limit', async () => {
    const chain = fakeChain();
    let clock = Date.now();
    const now = () => new Date(clock);
    const batch = await prisma.anchorBatch.create({ data: { merkleRoot: hex(`b3-${Date.now()}`), leafCount: 1 } });

    await publishAndConfirm(prisma, chain.publisher, now);
    const tx1 = (await prisma.anchorBatch.findUniqueOrThrow({ where: { id: batch.id } })).txHash!;
    chain.receipts.set(tx1, { state: 'REVERTED', blockNumber: 9 });
    await publishAndConfirm(prisma, chain.publisher, now);
    const second = await prisma.anchorBatch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(second.status).toBe('SUBMITTED');
    expect(second.txHash).not.toBe(tx1);

    clock += DROPPED_AFTER_MS + 1000; // never mined
    await publishAndConfirm(prisma, chain.publisher, now);
    expect((await prisma.anchorBatch.findUniqueOrThrow({ where: { id: batch.id } })).attempts).toBe(3);

    await prisma.anchorBatch.update({ where: { id: batch.id }, data: { status: 'FAILED', attempts: MAX_PUBLISH_ATTEMPTS } });
    const sentBefore = chain.sent.length;
    await publishAndConfirm(prisma, chain.publisher, now);
    expect(chain.sent.length).toBe(sentBefore);
  });
});
