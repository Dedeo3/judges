import {
  buildIdentityTree,
  FIELD_PRIME,
  generateCircuitMerkleProof,
  MAX_TREE_DEPTH,
  toBytes32Hex,
} from "@judges/crypto";
import { sql } from "./db";

/**
 * Redesign B server side: the identity-commitment set and its LeanIMT.
 *
 * Secrets are never stored — the client derives the secret from a wallet signature and sends only
 * `identityCommitment = Poseidon(secret)`. This module keeps the append-only leaf set, rebuilds the
 * tree deterministically (leaf order = `leaf_index`), and produces the inclusion proof the browser
 * prover needs. The root it returns must also be posted on-chain (CommitmentTree.postRoot) for a
 * proof against it to verify — see `/api/commitments/root`.
 *
 * The pure `*FromLeaves` helpers hold all the tree logic and are unit-tested without a database
 * (commitments.test.ts); the exported async functions are thin DB wrappers around them.
 */

export interface SerializedInclusionProof {
  /** Merkle root as the circuit public input (decimal field element). */
  root: string;
  /** Same root as bytes32, for comparing against / posting to CommitmentTree on-chain. */
  rootHex: `0x${string}`;
  /** The leaf (identity commitment) this proof is for, decimal. */
  leaf: string;
  /** Actual tree depth for this proof. */
  depth: number;
  /** Direction bits, padded to MAX_TREE_DEPTH (decimal "0"/"1"). */
  indices: string[];
  /** Siblings, padded to MAX_TREE_DEPTH (decimal). */
  siblings: string[];
}

export interface TreeRoot {
  root: string;
  rootHex: `0x${string}`;
  leafCount: number;
}

/** Parse and range-check a decimal field-element string. Throws on anything invalid. */
export function parseCommitment(value: unknown): bigint {
  if (typeof value !== "string" || !/^\d{1,78}$/.test(value)) {
    throw new Error("commitment must be a decimal string");
  }
  const n = BigInt(value);
  if (n <= 0n || n >= FIELD_PRIME) {
    throw new Error("commitment out of field range");
  }
  return n;
}

/** Current root over an ordered leaf list, or null for an empty set. Pure. */
export function rootFromLeaves(leaves: bigint[]): TreeRoot | null {
  if (leaves.length === 0) return null;
  const tree = buildIdentityTree(leaves);
  return { root: tree.root.toString(), rootHex: toBytes32Hex(tree.root), leafCount: leaves.length };
}

/** Inclusion proof for `commitment` under the tree of `leaves`, or null if it isn't a member. Pure. */
export function inclusionProofFromLeaves(leaves: bigint[], commitment: bigint): SerializedInclusionProof | null {
  const tree = buildIdentityTree(leaves);
  if (tree.indexOf(commitment) === -1) return null;
  const proof = generateCircuitMerkleProof(tree, commitment);
  return {
    root: proof.root.toString(),
    rootHex: toBytes32Hex(proof.root),
    leaf: proof.leaf.toString(),
    depth: proof.depth,
    indices: proof.indices.map((v) => v.toString()),
    siblings: proof.siblings.map((v) => v.toString()),
  };
}

/** Max leaves the fixed-depth circuit can prove membership for. */
export const MAX_LEAVES = 2 ** MAX_TREE_DEPTH;

// ── DB wrappers ──────────────────────────────────────────────────────────────

async function allLeaves(): Promise<bigint[]> {
  const rows = (await sql()`
    select commitment from identity_commitments order by leaf_index asc
  `) as { commitment: string }[];
  return rows.map((r) => BigInt(r.commitment));
}

/**
 * Append a commitment to the set (idempotent — re-registering the same identity is a no-op) and
 * return the current tree root. `leaf_index` is DB-assigned (identity column), so insertion order
 * is race-free.
 */
export async function registerCommitment(commitmentDec: string): Promise<TreeRoot & { leafIndex: number }> {
  const commitment = parseCommitment(commitmentDec);

  await sql()`
    insert into identity_commitments (commitment)
    values (${commitment.toString()})
    on conflict (commitment) do nothing
  `;

  const rows = (await sql()`
    select leaf_index from identity_commitments where commitment = ${commitment.toString()}
  `) as { leaf_index: string | number }[];
  const leafIndex = Number(rows[0]?.leaf_index ?? -1);

  const leaves = await allLeaves();
  const root = rootFromLeaves(leaves);
  if (!root) throw new Error("tree is empty after registering a commitment");
  return { ...root, leafIndex };
}

/** Inclusion proof for a registered commitment, or null if it isn't registered. */
export async function getInclusionProof(commitmentDec: string): Promise<SerializedInclusionProof | null> {
  const commitment = parseCommitment(commitmentDec);
  return inclusionProofFromLeaves(await allLeaves(), commitment);
}

/** The current root (to post on-chain), or null when no commitment is registered yet. */
export async function getCurrentRoot(): Promise<TreeRoot | null> {
  return rootFromLeaves(await allLeaves());
}
