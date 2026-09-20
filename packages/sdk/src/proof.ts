import type { AssuranceLevel, JudgesProof } from "./types";

const HEX_BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** abi.encode(uint256[2], uint256[2][2], uint256[2]) is 8 words = 256 bytes = 512 hex chars. */
const HEX_PROOF = /^0x[0-9a-fA-F]{512}$/;

/** The /api/prove response body. Also what the /connect popup posts back, plus the app id used. */
export interface ProveApiResponse {
  verified: boolean;
  reason?: string;
  proof?: string;
  merkleRoot?: string;
  nullifier?: string;
  domain?: string;
  contextHash?: string;
  wallet?: string;
  /** Set by the popup: the namespaced app id the proof was actually generated for. */
  appId?: string;
}

/**
 * Turns an API/popup response into a JudgesProof, checking every field's shape first.
 *
 * The popup path's payload arrives over postMessage. Its origin and source are verified before
 * this runs, but a well-formed-looking object is still just data — checking shapes here means a
 * malformed payload fails loudly now rather than as an opaque revert when submitted on-chain.
 *
 * @param fallbackAppId The app id to report in same-origin mode. In popup mode it's null and the
 *        popup's reported (namespaced) app id is required instead.
 */
export function toJudgesProof(
  result: ProveApiResponse,
  assurance: AssuranceLevel,
  fallbackAppId: string | null,
): JudgesProof {
  if (!result || !result.verified) {
    throw new Error(`Judges.prove failed: ${result?.reason ?? "unknown reason"}`);
  }

  const appId = fallbackAppId ?? result.appId;
  const malformed =
    !result.proof ||
    !HEX_PROOF.test(result.proof) ||
    !result.merkleRoot ||
    !HEX_BYTES32.test(result.merkleRoot) ||
    !result.nullifier ||
    !HEX_BYTES32.test(result.nullifier) ||
    !result.domain ||
    !HEX_BYTES32.test(result.domain) ||
    !result.contextHash ||
    !HEX_BYTES32.test(result.contextHash) ||
    !result.wallet ||
    !HEX_ADDRESS.test(result.wallet) ||
    !appId;

  if (malformed) {
    throw new Error("Judges.prove failed: the proof response was malformed");
  }

  return {
    proof: result.proof as `0x${string}`,
    merkleRoot: result.merkleRoot as `0x${string}`,
    nullifier: result.nullifier as `0x${string}`,
    domain: result.domain as `0x${string}`,
    contextHash: result.contextHash as `0x${string}`,
    wallet: result.wallet as `0x${string}`,
    appId: appId!,
    assurance,
  };
}

/**
 * Checks a returned proof is for exactly what was asked: the expected (namespaced) app, the
 * requested wallet, and — when one was given — the requested action binding.
 *
 * Any mismatch here would otherwise surface much later as an opaque on-chain revert, or worse,
 * as a proof the integrator's contract happens to accept for the wrong thing. Failing now, with
 * the specific field named, turns a confusing integration bug into an obvious one.
 */
export function assertProofMatchesRequest(
  proof: JudgesProof,
  expected: { appId: string; wallet: string; contextHash?: string },
): void {
  if (proof.appId !== expected.appId) {
    throw new Error(`Judges.prove: proof is for app "${proof.appId}", expected "${expected.appId}"`);
  }
  if (proof.wallet.toLowerCase() !== expected.wallet.toLowerCase()) {
    throw new Error(`Judges.prove: proof is bound to ${proof.wallet}, expected ${expected.wallet}`);
  }
  if (expected.contextHash && proof.contextHash.toLowerCase() !== expected.contextHash.toLowerCase()) {
    throw new Error("Judges.prove: proof is bound to a different action (contextHash) than requested");
  }
}
