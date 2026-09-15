import { LeanIMT } from "@zk-kit/lean-imt";
import { poseidon2 } from "poseidon-lite";

/**
 * Redesign B membership tree. Identity commitments (`deriveIdentityCommitment`) are the leaves;
 * the server builds this off-chain and posts the root on-chain (a root-history contract keeps a
 * slightly-stale root valid — see `contracts/src/CommitmentTree.sol`). The ZK circuit proves a
 * secret's commitment is a leaf under a posted root, which is what an outsider cannot forge.
 *
 * LeanIMT (zk-kit), not a fixed-depth IMT: the same structure Semaphore v4 uses. Its internal
 * node hash is Poseidon(2) over the two children, matching circomlib's `Poseidon(2)` in the
 * circuit and `PoseidonT3` on-chain. The circuit is built for a MAX depth of `MAX_TREE_DEPTH`
 * but verifies against the tree's ACTUAL depth (a private `depth` signal), exactly like
 * zk-kit's `binary-merkle-root.circom` — so proofs stay valid as the tree grows, up to the max.
 */
export const MAX_TREE_DEPTH = 20;

/** Poseidon(2) — the LeanIMT internal-node hash. Must match the circuit and on-chain hashers. */
export const leanIMTHash = (a: bigint, b: bigint): bigint => poseidon2([a, b]);

export function buildIdentityTree(leaves: bigint[] = []): LeanIMT<bigint> {
  const tree = new LeanIMT<bigint>(leanIMTHash);
  if (leaves.length > 0) {
    tree.insertMany(leaves);
  }
  return tree;
}

/**
 * A Merkle inclusion proof shaped for the fixed-`MAX_TREE_DEPTH` circuit: `indices` and
 * `siblings` are always length `MAX_TREE_DEPTH`, zero-padded above the real depth. The circuit's
 * BinaryMerkleRoot ignores levels `>= depth` (it passes the node through unchanged), so padding
 * with zeros is safe and reproduces the LeanIMT root exactly.
 */
export interface CircuitMerkleProof {
  root: bigint;
  leaf: bigint;
  /** Actual number of tree levels for this proof (the LeanIMT depth). */
  depth: number;
  /** Direction bit per level, LSB-first: 0 = node is the left child, 1 = the right child. */
  indices: bigint[];
  /** Sibling per level, zero-padded to `MAX_TREE_DEPTH`. */
  siblings: bigint[];
}

/** Build a circuit-ready inclusion proof for `leaf`. Throws if the leaf isn't in the tree. */
export function generateCircuitMerkleProof(tree: LeanIMT<bigint>, leaf: bigint): CircuitMerkleProof {
  const index = tree.indexOf(leaf);
  if (index === -1) {
    throw new Error("leaf is not a member of the tree");
  }

  const proof = tree.generateProof(index);
  const depth = proof.siblings.length;
  if (depth > MAX_TREE_DEPTH) {
    throw new Error(`tree depth ${depth} exceeds MAX_TREE_DEPTH ${MAX_TREE_DEPTH}`);
  }

  const indices: bigint[] = [];
  const siblings: bigint[] = [];
  for (let i = 0; i < MAX_TREE_DEPTH; i++) {
    // LeanIMT encodes the path in the leaf index: bit i is the direction at level i.
    indices.push(BigInt((proof.index >> i) & 1));
    siblings.push(i < depth ? proof.siblings[i] : 0n);
  }

  return { root: proof.root, leaf, depth, indices, siblings };
}
