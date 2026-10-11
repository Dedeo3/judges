import { hashToField } from "./field";
import { deriveNullifier } from "./nullifier";
import { deriveIdentityCommitment } from "./identity";
import { generateCircuitMerkleProof, MAX_TREE_DEPTH, type CircuitMerkleProof } from "./tree";
import type { LeanIMT } from "@zk-kit/lean-imt";

/**
 * Builds the exact public + private signal set the Redesign B circuit
 * (`prover/circuits/judges_membership_v2.circom`) expects.
 *
 * Statement proved:
 *   1. leaf == Poseidon(secret)                                      (identity commitment)
 *   2. leaf is a member of the tree with root `merkleRoot`           (LeanIMT inclusion)
 *   3. nullifier == Poseidon(secret, applicationIdHash, EPOCH)       (domain-scoped uniqueness)
 *   4. policyHash echoed as a public input                          (wallet/action binding)
 *
 * `secret`, `depth`, `indices`, and `siblings` are private; `merkleRoot`, `nullifier`,
 * `applicationIdHash`, and `policyHash` are public. Signal names match the circom `signal input`
 * names 1:1 — do not rename one side without the other.
 */
export interface MembershipV2WitnessParams {
  secret: bigint;
  applicationId: string;
  merkleProof: CircuitMerkleProof;
  policyHash: bigint;
  /** Fixed epoch by default (matches the circuit's EPOCH constant); reserved for future rotation. */
  epoch?: string | number;
}

export interface MembershipV2Witness {
  // Public signals
  merkleRoot: bigint;
  nullifier: bigint;
  applicationIdHash: bigint;
  policyHash: bigint;
  // Private witness
  secret: bigint;
  depth: bigint;
  indices: bigint[];
  siblings: bigint[];
}

export function deriveMembershipV2Witness(params: MembershipV2WitnessParams): MembershipV2Witness {
  if (params.merkleProof.indices.length !== MAX_TREE_DEPTH || params.merkleProof.siblings.length !== MAX_TREE_DEPTH) {
    throw new Error(`merkleProof must be padded to MAX_TREE_DEPTH (${MAX_TREE_DEPTH})`);
  }

  // Defensive: the proof must actually be for this secret's commitment. Catches a mismatched
  // (secret, proof) pairing before it becomes an unsatisfiable witness.
  const expectedLeaf = deriveIdentityCommitment(params.secret);
  if (params.merkleProof.leaf !== expectedLeaf) {
    throw new Error("merkleProof.leaf does not match Poseidon(secret)");
  }

  const applicationIdHash = hashToField(params.applicationId);
  const nullifier = deriveNullifier({
    credentialSecret: params.secret,
    applicationId: params.applicationId,
    epoch: params.epoch,
  });

  return {
    merkleRoot: params.merkleProof.root,
    nullifier,
    applicationIdHash,
    policyHash: params.policyHash,
    secret: params.secret,
    depth: BigInt(params.merkleProof.depth),
    indices: params.merkleProof.indices,
    siblings: params.merkleProof.siblings,
  };
}

/** Convenience: build the witness straight from a tree, generating the inclusion proof for the secret. */
export function deriveMembershipV2WitnessFromTree(params: {
  secret: bigint;
  applicationId: string;
  tree: LeanIMT<bigint>;
  policyHash: bigint;
  epoch?: string | number;
}): MembershipV2Witness {
  const leaf = deriveIdentityCommitment(params.secret);
  const merkleProof = generateCircuitMerkleProof(params.tree, leaf);
  return deriveMembershipV2Witness({
    secret: params.secret,
    applicationId: params.applicationId,
    merkleProof,
    policyHash: params.policyHash,
    epoch: params.epoch,
  });
}

/** JSON-serializable form (snarkjs' witness calculator expects decimal-string field elements). */
export function membershipV2WitnessToInputJson(witness: MembershipV2Witness): Record<string, string | string[]> {
  return {
    merkleRoot: witness.merkleRoot.toString(),
    nullifier: witness.nullifier.toString(),
    applicationIdHash: witness.applicationIdHash.toString(),
    policyHash: witness.policyHash.toString(),
    secret: witness.secret.toString(),
    depth: witness.depth.toString(),
    indices: witness.indices.map((v) => v.toString()),
    siblings: witness.siblings.map((v) => v.toString()),
  };
}
