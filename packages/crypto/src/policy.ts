import { sha256 } from "viem";
import { hashBytesToField } from "./field";

/**
 * policyHash = toField(sha256(contextHash ‖ wallet))
 *
 * This is what binds a proof to *one wallet and one action*, implementing README §7.2's
 * "challenge must be bound to the exact action being authorized". Without it, a proof sitting in
 * the mempool is a bearer token: anyone can lift it, submit it themselves, and pick the action
 * parameters (which way to vote, where to send funds) freely, because nothing ties the proof to
 * the submitter or to what they're asking for.
 *
 * `contextHash` is defined by the consuming app — a DAO folds in (proposalId, support), a faucet
 * folds in its claim tag, and the default is just the assurance level. The on-chain consumer
 * recomputes the same value from its own call arguments (`sha256(abi.encodePacked(contextHash,
 * wallet)) % FIELD_PRIME` in Solidity), so a mismatch fails proof verification.
 *
 * Deliberately byte-oriented, not string-oriented: hashing display strings ("0xAbC..." vs
 * "0xabc...", checksummed or not) across TS and Solidity is exactly the kind of thing that
 * silently diverges. Both sides hash the same 52 raw bytes: 32-byte context ‖ 20-byte address.
 */
export function derivePolicyHash(params: { contextHash: Uint8Array; wallet: Uint8Array }): bigint {
  if (params.contextHash.length !== 32) {
    throw new Error(`contextHash must be 32 bytes, got ${params.contextHash.length}`);
  }
  if (params.wallet.length !== 20) {
    throw new Error(`wallet must be 20 bytes, got ${params.wallet.length}`);
  }

  const buf = new Uint8Array(52);
  buf.set(params.contextHash, 0);
  buf.set(params.wallet, 32);
  return hashBytesToField(buf);
}

/** Hex-string convenience wrapper: `contextHash` as 0x + 64 hex chars, `wallet` as an 0x address. */
export function derivePolicyHashFromHex(params: { contextHash: string; wallet: string }): bigint {
  return derivePolicyHash({
    contextHash: hexToBytes(params.contextHash, 32),
    wallet: hexToBytes(params.wallet, 20),
  });
}

/** Default context when an app doesn't bind a specific action: just the assurance level. */
export function assuranceContextHash(assurance: string): Uint8Array {
  return sha256(new TextEncoder().encode(assurance), "bytes");
}

function hexToBytes(value: string, expectedLength: number): Uint8Array {
  const normalized = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (normalized.length !== expectedLength * 2 || !/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error(`expected ${expectedLength} bytes of hex, got "${value}"`);
  }
  const bytes = new Uint8Array(expectedLength);
  for (let i = 0; i < expectedLength; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
