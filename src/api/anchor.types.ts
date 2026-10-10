export type AnchorBatchStatus = 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

export interface AnchorBatch {
  id: string;
  merkleRoot: string;
  leafCount: number;
  status: AnchorBatchStatus;
  network: string | null;
  chainId: number | null;
  txHash: string | null;
  blockNumber: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export type AnchorPublishing =
  | { enabled: false }
  | { enabled: true; network: string; chainId: number; address: string; explorerTxUrl: string };

export interface AnchorOverview {
  publishing: AnchorPublishing;
  batches: AnchorBatch[];
  unbatched: number;
  fingerprintsByKind: Record<string, number>;
}

export interface VerifyMatch {
  kind: string;
  recordId: string;
  recordSha256: string;
  leafHash: string;
  fingerprintedAt: string;
  formulaHolds: boolean;
  batch: {
    merkleRoot: string;
    leafCount: number;
    status: AnchorBatchStatus;
    network: string | null;
    chainId: number | null;
    txHash: string | null;
    blockNumber: string | null;
    confirmedAt: string | null;
  } | null;
  proof: string[] | null;
  proofValid: boolean | null;
  chain: { status: 'NOT_PUBLISHED' | 'PUBLISHED' | 'CONFIRMED'; rootOnChainMatches: boolean | null; explorerUrl: string | null };
}

export interface VerifyResult {
  hash: string;
  anchoringWallet: string | null;
  method: string[];
  matches: VerifyMatch[];
}
