import type { AssuranceLevel } from "@judges/types";

export type { AssuranceLevel };

export type Network = "monad-testnet" | "monad-mainnet";

export interface JudgesConfig {
  network: Network;
  /** Domain-separates this app's commitments/nullifiers from every other app (README §7.5). */
  appId: string;
  /**
   * Base URL for the Judges API routes. Defaults to same-origin "/api" in a browser — set this
   * explicitly when the SDK runs somewhere without a same-origin API (a different host, a
   * script outside the Next.js app, apps/demo-agent, etc).
   */
  apiBaseUrl?: string;
  /** Retry attempts for API calls that fail transiently (network errors, 5xx). Default: 2. */
  maxRetries?: number;
}

/**
 * A Judges membership proof: a Groth16 proof plus the public signals JudgesVerifier.sol needs to
 * check it, bundled together so `verify()` doesn't need any separate lookup step.
 */
export interface JudgesProof {
  /** ABI-encoded (uint256[2], uint256[2][2], uint256[2]) Groth16 calldata. */
  proof: `0x${string}`;
  walletCommitment: `0x${string}`;
  nullifier: `0x${string}`;
  domain: `0x${string}`;
  policyHash: `0x${string}`;
  appId: string;
  assurance: AssuranceLevel;
}

export interface VerifyOnchainResult {
  valid: boolean;
  txHash: `0x${string}`;
  domain: `0x${string}`;
  nullifier: `0x${string}`;
}
