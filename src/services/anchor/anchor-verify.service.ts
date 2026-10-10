import { AnchorBatchStatus, PrismaClient } from '@prisma/client';
import { proofForLeaf, leafHashFor } from './anchor-batch.service';
import { verifyMerkleProof } from './merkle';
import { ANCHOR_DATA_PREFIX, AnchorPublisher } from './anchor-publisher';

export const VERIFY_METHOD = [
  'fingerprint = SHA-256 of the UTF-8 text "<kind>:<recordId>:<recordSha256>"',
  'parent = SHA-256 of the two child hashes as bytes, smaller hash first; an unpaired hash moves up unchanged',
  `on chain: a transaction from the anchoring wallet to itself whose data is "${ANCHOR_DATA_PREFIX}" in UTF-8 followed by the 32-byte root`,
];

/** On-chain roots of confirmed transactions never change, so they are cached per transaction. */
const chainRootCache = new Map<string, string | null>();

async function onChainRoot(publisher: AnchorPublisher, txHash: string): Promise<string | null | 'UNAVAILABLE'> {
  if (chainRootCache.has(txHash)) return chainRootCache.get(txHash)!;
  try {
    const root = await publisher.readRoot(txHash);
    chainRootCache.set(txHash, root);
    return root;
  } catch {
    return 'UNAVAILABLE';
  }
}

/**
 * Everything needed to check a record independently: its fingerprint, the batch root, the proof,
 * and the transaction that published the root. Looks up by record SHA-256 or by fingerprint.
 * Returns no tenant identifiers or record content.
 */
export async function verifyHash(prisma: PrismaClient, hash: string, publisher: AnchorPublisher | null) {
  const leaves = await prisma.anchorLeaf.findMany({
    where: { OR: [{ recordSha256: hash }, { leafHash: hash }] },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  const matches = [];
  for (const leaf of leaves) {
    const formulaHolds = leafHashFor(leaf.kind, leaf.recordId, leaf.recordSha256) === leaf.leafHash;
    const proved = leaf.batchId ? await proofForLeaf(prisma, leaf.id) : null;
    const batch = proved?.batch ?? null;
    const proofValid = proved ? verifyMerkleProof(leaf.leafHash, proved.proof, proved.batch.merkleRoot) : null;

    let chain: { status: 'NOT_PUBLISHED' | 'PUBLISHED' | 'CONFIRMED'; rootOnChainMatches: boolean | null; explorerUrl: string | null } = {
      status: 'NOT_PUBLISHED',
      rootOnChainMatches: null,
      explorerUrl: null,
    };
    if (batch?.txHash && (batch.status === AnchorBatchStatus.SUBMITTED || batch.status === AnchorBatchStatus.CONFIRMED)) {
      const sameChain = publisher !== null && publisher.chainId === batch.chainId;
      const root = sameChain && batch.status === AnchorBatchStatus.CONFIRMED ? await onChainRoot(publisher!, batch.txHash) : 'UNAVAILABLE';
      chain = {
        status: batch.status === AnchorBatchStatus.CONFIRMED ? 'CONFIRMED' : 'PUBLISHED',
        rootOnChainMatches: root === 'UNAVAILABLE' ? null : root === batch.merkleRoot,
        explorerUrl: sameChain ? `${publisher!.explorerTxUrl}${batch.txHash}` : null,
      };
    }

    matches.push({
      kind: leaf.kind,
      recordId: leaf.recordId,
      recordSha256: leaf.recordSha256,
      leafHash: leaf.leafHash,
      fingerprintedAt: leaf.createdAt,
      formulaHolds,
      batch: batch
        ? {
            merkleRoot: batch.merkleRoot,
            leafCount: batch.leafCount,
            status: batch.status,
            network: batch.network,
            chainId: batch.chainId,
            txHash: batch.txHash,
            blockNumber: batch.blockNumber === null ? null : batch.blockNumber.toString(),
            confirmedAt: batch.confirmedAt,
          }
        : null,
      proof: proved?.proof ?? null,
      proofValid,
      chain,
    });
  }
  return { hash, anchoringWallet: publisher?.address ?? null, method: VERIFY_METHOD, matches };
}
