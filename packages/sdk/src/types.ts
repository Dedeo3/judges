/**
 * Defined here rather than imported from the monorepo's @judges/types: this package is published
 * to npm, and a dependency on an unpublished workspace package would make it uninstallable.
 */
export type AssuranceLevel = "possession" | "user_verified" | "unique";

export type Network = "monad-testnet" | "monad-mainnet";

export interface JudgesConfig {
  network: Network;
  /**
   * Domain-separates this app's commitments/nullifiers from every other app (README §7.5).
   * Lowercase letters, digits, `.`, `_`, `-`; max 64.
   *
   * When proving through the popup (see `judgesOrigin`), the effective app id is namespaced under
   * your site's origin — `https://your.site/<appId>` — and that full string is what your contract
   * must be deployed with. `proof.appId` returns it.
   */
  appId: string;
  /**
   * Origin of the Judges deployment, e.g. "https://judges.example". Set this when your site is NOT
   * served from that origin — which is every third-party integration. Passkeys are scoped to the
   * relying party, so the ceremony has to run on Judges' own origin: the SDK opens a popup there
   * and receives the finished proof back.
   *
   * Leave unset only when your pages are served from the Judges origin itself.
   */
  judgesOrigin?: string;
  /**
   * Base URL for the Judges API routes, used only in same-origin mode. Defaults to "/api".
   */
  apiBaseUrl?: string;
  /** Retry attempts for API calls that fail transiently (network errors, 5xx). Default: 2. */
  maxRetries?: number;
  /** How long to wait for the popup flow before giving up. Default: 5 minutes. */
  popupTimeoutMs?: number;
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
  /** The action binding this proof commits to — JudgesVerifier re-derives policyHash from it. */
  contextHash: `0x${string}`;
  /** The wallet this proof is bound to. Consumers must credit this, not msg.sender. */
  wallet: `0x${string}`;
  appId: string;
  assurance: AssuranceLevel;
}

export interface VerifyOnchainResult {
  valid: boolean;
  txHash: `0x${string}`;
  domain: `0x${string}`;
  nullifier: `0x${string}`;
}
