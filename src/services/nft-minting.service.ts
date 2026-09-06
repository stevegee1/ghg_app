/**
 * nft-minting.service.ts
 * Polygon PoS ERC-1155 minting via viem JSON-RPC.
 *
 * Strategy:
 *  1. If POLYGON_PRIVATE_KEY and POLYGON_RPC_URL are set → real on-chain mint.
 *  2. If only POLYGON_CONTRACT_ADDRESS is set → deterministic pre-mint receipt
 *     (cryptographic commitment, no gas spend, upgradeable to real mint later).
 *  3. If nothing is configured → dev/test mode with mock token ID.
 *
 * The service never blocks payment or credential issuance regardless of
 * Polygon config state.
 */

import crypto from 'crypto';

export interface MintInput {
  credentialId: string;
  licenseeId: string;
  metadataUri: string;      // e.g. https://ghgapp.railway.app/api/credentials/{id}/metadata.json
  recipientAddress?: string; // optional on-chain recipient wallet; defaults to platform wallet
}

export interface MintResult {
  tokenId: string;
  contractAddress: string;
  transactionHash: string | null;
  openSeaUrl: string;
  isOnChain: boolean;
  preMintReceiptSeal?: string;
}

const POLYGON_OPENSEA_BASE = 'https://opensea.io/assets/matic';
const POLYGON_TESTNET_OPENSEA_BASE = 'https://testnets.opensea.io/assets/amoy';

/**
 * Derives a deterministic uint256 token ID from the credential UUID.
 * Uses the first 32 hex chars of the SHA-256 of the credentialId — fits
 * safely in a uint256 and is reproducible for pre-mint receipts.
 */
function deriveTokenId(credentialId: string): string {
  const hash = crypto.createHash('sha256').update(credentialId).digest('hex');
  // Take first 16 hex digits (~64-bit token ID, well within uint256 range)
  return BigInt(`0x${hash.substring(0, 16)}`).toString(10);
}

export async function mintAuditWarrantyToken(input: MintInput): Promise<MintResult> {
  const { credentialId, metadataUri, recipientAddress } = input;

  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
  const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS || '';
  const isTestnet = process.env.POLYGON_NETWORK === 'testnet';

  const tokenId = deriveTokenId(credentialId);
  const openSeaBase = isTestnet ? POLYGON_TESTNET_OPENSEA_BASE : POLYGON_OPENSEA_BASE;
  const effectiveContract = contractAddress || '0x0000000000000000000000000000000000000000';

  // ── Real on-chain mint ─────────────────────────────────────────────────────
  if (privateKey && contractAddress) {
    try {
      const { createWalletClient, createPublicClient, http } = await import('viem');
      const { privateKeyToAccount } = await import('viem/accounts');
      const { polygon, polygonAmoy } = await import('viem/chains');

      const chain = isTestnet ? polygonAmoy : polygon;
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
      const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

      // ABI: GHGAuditWarrantyNFT.sol mint(address to, uint256 id, string calldata credentialId, string calldata metadataUri)
      const mintAbi = [
        {
          name: 'mint',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'id', type: 'uint256' },
            { name: 'credentialId', type: 'string' },
            { name: 'metadataUri', type: 'string' },
          ],
          outputs: [],
        },
      ] as const;

      const toAddress = (recipientAddress || account.address) as `0x${string}`;

      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: mintAbi,
        functionName: 'mint',
        args: [toAddress, BigInt(tokenId), credentialId, metadataUri],
      });

      // Wait for 1 confirmation
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      return {
        tokenId,
        contractAddress,
        transactionHash: txHash,
        openSeaUrl: `${openSeaBase}/${contractAddress}/${tokenId}`,
        isOnChain: true,
      };
    } catch (mintErr) {
      console.error('[NFT MINT ERROR] On-chain mint failed, issuing pre-mint receipt:', mintErr);
      // Fallthrough to pre-mint receipt
    }
  }

  // ── Pre-mint receipt (cryptographic commitment, no gas required) ───────────
  const seal = crypto
    .createHash('sha256')
    .update(`${credentialId}::${tokenId}::${metadataUri}::${Date.now()}`)
    .digest('hex');

  console.info(
    `[NFT MINT] Pre-mint receipt issued for credential ${credentialId}. ` +
    `Token ID: ${tokenId}. Upgrade to live mint by setting POLYGON_PRIVATE_KEY + POLYGON_CONTRACT_ADDRESS.`
  );

  const txHash = privateKey ? null : null; // Will be null for pre-mint

  return {
    tokenId,
    contractAddress: effectiveContract,
    transactionHash: txHash,
    openSeaUrl: contractAddress
      ? `${openSeaBase}/${contractAddress}/${tokenId}`
      : `https://ghgapp-production.up.railway.app/api/credentials/${credentialId}/metadata.json`,
    isOnChain: false,
    preMintReceiptSeal: seal,
  };
}
