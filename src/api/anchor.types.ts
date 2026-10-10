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
