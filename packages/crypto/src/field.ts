import { createHash } from "node:crypto";

/** BN254 (alt_bn128) scalar field prime — the field Poseidon (via poseidon-lite / circomlib) operates over. */
export const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Reduce arbitrary bytes into a BN254 field element. */
export function toField(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const b of bytes) {
    value = (value << 8n) | BigInt(b);
  }
  return value % FIELD_PRIME;
}

/**
 * sha256-then-reduce-into-field for an arbitrary string. Single source of truth for turning a
 * variable-length string (applicationId, a public key, a domain separator) into one field
 * element — used identically by `deriveCommitment`/`deriveNullifier` (TS/onchain-facing) and by
 * `deriveMembershipWitness` (the Phase 5 circuit's witness), so a circuit proof and a plain TS
 * computation can never silently diverge.
 */
export function hashToField(value: string): bigint {
  return toField(createHash("sha256").update(value).digest());
}

/** Format a field element as a 32-byte 0x-prefixed hex string, e.g. for passing to Solidity as bytes32. */
export function toBytes32Hex(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}
