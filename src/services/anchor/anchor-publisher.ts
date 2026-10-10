import { JsonRpcProvider, Wallet, getBytes, hexlify, toUtf8Bytes, concat, formatUnits } from 'ethers';

/**
 * Publishes batch roots in the data field of a zero-value transaction the anchoring wallet sends to
 * itself: "NFTYLOGS-ANCHOR-V1" in UTF-8 followed by the 32-byte Merkle root.
 */
export const ANCHOR_DATA_PREFIX = 'NFTYLOGS-ANCHOR-V1';

/** Supported networks. Polygon PoS mainnet for production, Polygon Amoy testnet for staging. */
export const ANCHOR_NETWORKS: Record<number, string> = {
  137: 'polygon',
  80002: 'polygon-amoy',
};

export const ANCHOR_ENV = {
  rpcUrl: 'ANCHOR_RPC_URL',
  privateKey: 'ANCHOR_PRIVATE_KEY',
  chainId: 'ANCHOR_CHAIN_ID',
  maxFeeGwei: 'ANCHOR_MAX_FEE_GWEI',
  confirmations: 'ANCHOR_CONFIRMATIONS',
  explorerTxUrl: 'ANCHOR_EXPLORER_TX_URL',
} as const;

export interface AnchorConfig {
  rpcUrl: string;
  privateKey: string;
  chainId: number;
  network: string;
  maxFeeGwei: number;
  confirmations: number;
  explorerTxUrl: string;
}

/** Reads the anchoring configuration. Null when none of it is set (anchoring off); throws when it is partly or wrongly set. */
export function readAnchorConfig(): AnchorConfig | null {
  const raw = Object.fromEntries(Object.entries(ANCHOR_ENV).map(([k, env]) => [k, process.env[env]?.trim() || ''])) as Record<keyof typeof ANCHOR_ENV, string>;
  if (Object.values(raw).every((v) => v === '')) return null;
  const missing = (Object.keys(ANCHOR_ENV) as (keyof typeof ANCHOR_ENV)[]).filter((k) => raw[k] === '').map((k) => ANCHOR_ENV[k]);
  if (missing.length > 0) throw new Error(`Blockchain anchoring is partly configured. Also set: ${missing.join(', ')}.`);

  const problems: string[] = [];
  if (!/^https:\/\//.test(raw.rpcUrl)) problems.push(`${ANCHOR_ENV.rpcUrl} must be an https URL.`);
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw.privateKey)) problems.push(`${ANCHOR_ENV.privateKey} must be a 0x-prefixed 32-byte hex key.`);
  const chainId = Number(raw.chainId);
  if (!ANCHOR_NETWORKS[chainId]) problems.push(`${ANCHOR_ENV.chainId} must be one of ${Object.keys(ANCHOR_NETWORKS).join(', ')}.`);
  const maxFeeGwei = Number(raw.maxFeeGwei);
  if (!Number.isFinite(maxFeeGwei) || maxFeeGwei <= 0) problems.push(`${ANCHOR_ENV.maxFeeGwei} must be a positive number.`);
  const confirmations = Number(raw.confirmations);
  if (!Number.isInteger(confirmations) || confirmations < 1 || confirmations > 500) problems.push(`${ANCHOR_ENV.confirmations} must be a whole number from 1 to 500.`);
  if (!/^https:\/\/.+\/tx\/$/.test(raw.explorerTxUrl)) problems.push(`${ANCHOR_ENV.explorerTxUrl} must be an https URL ending in /tx/.`);
  if (problems.length > 0) throw new Error(problems.join(' '));

  return { ...raw, chainId, network: ANCHOR_NETWORKS[chainId], maxFeeGwei, confirmations };
}

/** Boot check: fails fast on a partial or invalid configuration. */
export function validateAnchorConfig(): void {
  readAnchorConfig();
}

export function anchorTxData(rootHex: string): string {
  return hexlify(concat([toUtf8Bytes(ANCHOR_DATA_PREFIX), getBytes(`0x${rootHex}`)]));
}

/** Extracts the root from a transaction's data, or null when it is not an anchor transaction. */
export function rootFromTxData(data: string): string | null {
  const bytes = getBytes(data);
  const prefix = toUtf8Bytes(ANCHOR_DATA_PREFIX);
  if (bytes.length !== prefix.length + 32) return null;
  for (let i = 0; i < prefix.length; i++) if (bytes[i] !== prefix[i]) return null;
  return hexlify(bytes.slice(prefix.length)).slice(2);
}

export type AnchorReceipt =
  | { state: 'PENDING' }
  | { state: 'CONFIRMED'; blockNumber: number; confirmations: number }
  | { state: 'REVERTED'; blockNumber: number };

/** What the anchoring service needs from a chain. The ethers implementation is below; tests supply their own. */
export interface AnchorPublisher {
  /** The anchoring wallet address; verifiers check anchors were sent by it. */
  address: string;
  chainId: number;
  network: string;
  confirmationsRequired: number;
  explorerTxUrl: string;
  /** Sends the root; throws when the network fee is above the configured cap. */
  publish(rootHex: string): Promise<{ txHash: string }>;
  receipt(txHash: string): Promise<AnchorReceipt | null>;
  /** The root an on-chain transaction carries, or null. */
  readRoot(txHash: string): Promise<string | null>;
}

export class FeeAboveCapError extends Error {
  constructor(feeGwei: string, capGwei: number) {
    super(`Network fee ${feeGwei} gwei is above the cap of ${capGwei} gwei; publishing is postponed.`);
    this.name = 'FeeAboveCapError';
  }
}

export function createEthersPublisher(config: AnchorConfig): AnchorPublisher {
  const provider = new JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });
  const wallet = new Wallet(config.privateKey, provider);
  const capWei = BigInt(Math.round(config.maxFeeGwei * 1e9));

  return {
    address: wallet.address,
    chainId: config.chainId,
    network: config.network,
    confirmationsRequired: config.confirmations,
    explorerTxUrl: config.explorerTxUrl,

    async publish(rootHex) {
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== config.chainId) {
        throw new Error(`The RPC endpoint is on chain ${network.chainId}, not ${config.chainId}.`);
      }
      const fee = await provider.getFeeData();
      const maxFee = fee.maxFeePerGas ?? fee.gasPrice;
      if (maxFee === null) throw new Error('The RPC endpoint did not return a network fee.');
      if (maxFee > capWei) throw new FeeAboveCapError(formatUnits(maxFee, 'gwei'), config.maxFeeGwei);
      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0n,
        data: anchorTxData(rootHex),
        maxFeePerGas: capWei,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas && fee.maxPriorityFeePerGas < capWei ? fee.maxPriorityFeePerGas : capWei,
      });
      return { txHash: tx.hash };
    },

    async receipt(txHash) {
      const r = await provider.getTransactionReceipt(txHash);
      if (!r) return null;
      if (r.status === 0) return { state: 'REVERTED', blockNumber: r.blockNumber };
      const confirmations = await r.confirmations();
      return confirmations >= config.confirmations ? { state: 'CONFIRMED', blockNumber: r.blockNumber, confirmations } : { state: 'PENDING' };
    },

    async readRoot(txHash) {
      const tx = await provider.getTransaction(txHash);
      if (!tx || tx.from.toLowerCase() !== wallet.address.toLowerCase()) return null;
      return rootFromTxData(tx.data);
    },
  };
}
