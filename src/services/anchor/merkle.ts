import crypto from 'crypto';

/**
 * SHA-256 Merkle tree over hex leaf hashes.
 * - A parent is SHA-256 of its two children's bytes, smaller child first (sorted pairs), so a proof
 *   needs only the sibling hashes, not left/right flags.
 * - An odd node at the end of a level is carried up unchanged.
 * - A one-leaf tree's root is the leaf itself.
 */
export interface MerkleTree {
  levels: string[][];
  root: string;
}

const HEX64 = /^[0-9a-f]{64}$/;

function parent(a: string, b: string): string {
  const [x, y] = a <= b ? [a, b] : [b, a];
  return crypto.createHash('sha256').update(Buffer.from(x + y, 'hex')).digest('hex');
}

export function buildMerkleTree(leaves: string[]): MerkleTree {
  if (leaves.length === 0) throw new Error('A Merkle tree needs at least one leaf');
  for (const l of leaves) if (!HEX64.test(l)) throw new Error('Merkle leaves must be lowercase 64-character hex');
  const levels: string[][] = [leaves.slice()];
  while (levels[levels.length - 1].length > 1) {
    const level = levels[levels.length - 1];
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? parent(level[i], level[i + 1]) : level[i]);
    levels.push(next);
  }
  return { levels, root: levels[levels.length - 1][0] };
}

/** Sibling hashes from the leaf up to the root. */
export function merkleProof(tree: MerkleTree, index: number): string[] {
  if (index < 0 || index >= tree.levels[0].length) throw new Error('Leaf index out of range');
  const proof: string[] = [];
  let i = index;
  for (let depth = 0; depth < tree.levels.length - 1; depth++) {
    const level = tree.levels[depth];
    const sibling = i % 2 === 0 ? i + 1 : i - 1;
    if (sibling < level.length) proof.push(level[sibling]);
    i = Math.floor(i / 2);
  }
  return proof;
}

/** Recomputes the root from a leaf and its proof. */
export function verifyMerkleProof(leaf: string, proof: string[], root: string): boolean {
  if (!HEX64.test(leaf) || !HEX64.test(root) || proof.some((p) => !HEX64.test(p))) return false;
  return proof.reduce((acc, sibling) => parent(acc, sibling), leaf) === root;
}
