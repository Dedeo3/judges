import { sha256 } from "viem";

/** BN254 (alt_bn128) scalar field prime — the field Poseidon (via poseidon-lite / circomlib) operates over. */
export const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Reduce arbitrary bytes into a BN254 field element (big-endian). */
export function toField(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const b of bytes) {
    value = (value << 8n) | BigInt(b);
  }
  return value % FIELD_PRIME;
}

/**
 * sha256(bytes) reduced into the field. `viem`'s `sha256` is used instead of `node:crypto` so
 * this module runs unchanged in the browser — Redesign B (README §27, task 2) generates the
 * proof (and therefore hashes into the field) client-side. Output is byte-for-byte identical to
 * the previous `createHash("sha256")` path, so the on-chain `JudgesField.hashToField` (Solidity
 * `sha256`) still matches.
 */
export function hashBytesToField(bytes: Uint8Array): bigint {
  return BigInt(sha256(bytes)) % FIELD_PRIME;
}

/**
 * sha256-then-reduce-into-field for an arbitrary string. Single source of truth for turning a
 * variable-length string (applicationId, a domain separator) into one field element, used
 * identically by TS witness building and by `JudgesField.hashToField` on-chain.
 *
 * The string is always UTF-8 encoded (never hex-decoded), matching Solidity's `sha256(bytes(s))`
 * — this is deliberately NOT viem's `toBytes`, which would hex-decode a value that happens to
 * start with "0x" and silently diverge from the on-chain hash.
 */
export function hashToField(value: string): bigint {
  return hashBytesToField(new TextEncoder().encode(value));
}

/** Format a field element as a 32-byte 0x-prefixed hex string, e.g. for passing to Solidity as bytes32. */
export function toBytes32Hex(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, "0")}`;
}
