import path from "node:path";
import * as snarkjs from "snarkjs";
import { encodeAbiParameters } from "viem";
import {
  assuranceContextHash,
  deriveCredentialSecret,
  deriveMembershipWitness,
  derivePolicyHashFromHex,
  toBytes32Hex,
} from "@judges/crypto";
import { verifyAuthentication, type AuthenticationResponseJSON } from "@judges/webauthn";
import { rpConfig, requireEnv } from "./env";
import { challengeStore } from "./challengeStore";
import { neonCredentialStore } from "./credentialStore";

// Committed, frozen artifacts (see .gitignore's prover/build exceptions and prover/README.md) —
// NOT the intermediate ceremony files, which stay gitignored/regeneratable.
const PROVER_BUILD_DIR = path.join(process.cwd(), "..", "..", "prover", "build");
const WASM_PATH = path.join(PROVER_BUILD_DIR, "judges_membership_js", "judges_membership.wasm");
const ZKEY_PATH = path.join(PROVER_BUILD_DIR, "judges_membership_final.zkey");

export type ProveResult =
  | {
      verified: true;
      proof: `0x${string}`;
      walletCommitment: `0x${string}`;
      nullifier: `0x${string}`;
      domain: `0x${string}`;
      contextHash: `0x${string}`;
      wallet: `0x${string}`;
    }
  | { verified: false; reason: string };

function toHex32(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Verifies a fresh WebAuthn assertion (the same challenge-consumption path as
 * /api/webauthn/auth/verify — this route doesn't accept a bare credentialId, only a live
 * ceremony result, so a caller can't request a proof for a credential they don't control), then
 * generates a real Groth16 proof of the credential-secret -> commitment/nullifier relationship.
 *
 * The credential secret is derived and used entirely server-side and never appears in the
 * response — only the finished proof does.
 */
export async function proveMembership(params: {
  sessionId: string;
  response: AuthenticationResponseJSON;
  appId: string;
  assurance: string;
  /** The wallet this proof is bound to — an attacker lifting the proof can't redirect it. */
  wallet: string;
  /**
   * App-defined action binding (0x + 64 hex). A DAO folds in (proposalId, support); omitted, it
   * defaults to the assurance level alone, which binds the wallet but not a specific action.
   */
  contextHash?: string;
}): Promise<ProveResult> {
  const auth = await verifyAuthentication({
    rp: rpConfig,
    sessionId: params.sessionId,
    response: params.response,
    challengeStore: challengeStore,
    credentialStore: neonCredentialStore,
  });

  if (!auth.verified) {
    return { verified: false, reason: auth.reason };
  }

  const credential = await neonCredentialStore.findById(auth.credentialId);
  if (!credential) {
    return { verified: false, reason: "credential_not_found_after_verification" };
  }

  const credentialSecret = deriveCredentialSecret({
    domainSecret: requireEnv("JUDGES_DOMAIN_SECRET"),
    credentialId: credential.id,
    credentialPublicKey: credential.publicKey,
  });

  // The circuit's policyHash public input carries the wallet/action binding (README §7.2).
  // JudgesVerifier.sol recomputes exactly this from its own call arguments, so a proof can't be
  // lifted from the mempool and pointed at a different wallet or a different action.
  const contextHash = params.contextHash ?? toHex32(assuranceContextHash(params.assurance));
  const policyHash = derivePolicyHashFromHex({ contextHash, wallet: params.wallet });

  const witness = deriveMembershipWitness({
    credentialSecret,
    credentialPublicKey: credential.publicKey,
    applicationId: params.appId,
    policyHash,
  });

  const input = Object.fromEntries(Object.entries(witness).map(([key, value]) => [key, value.toString()]));
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH);

  // exportSolidityCallData resolves the G2 point (pB) coordinate ordering the on-chain verifier
  // expects -- hand-rolling that ordering is a well-known Groth16 footgun, so we defer to it
  // rather than re-deriving it ourselves.
  const callData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const [pA, pB, pC] = JSON.parse(`[${callData}]`) as [string[], string[][], string[]];

  const encodedProof = encodeAbiParameters(
    [{ type: "uint256[2]" }, { type: "uint256[2][2]" }, { type: "uint256[2]" }],
    [
      pA.map(BigInt) as [bigint, bigint],
      pB.map((row) => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
      pC.map(BigInt) as [bigint, bigint],
    ],
  );

  return {
    verified: true,
    proof: encodedProof,
    walletCommitment: toBytes32Hex(witness.walletCommitment),
    nullifier: toBytes32Hex(witness.nullifier),
    domain: toBytes32Hex(witness.applicationIdHash),
    // The binding inputs, not the derived policyHash: the contract derives that itself, and
    // handing it back would invite a caller to pass it along as if it were authoritative.
    contextHash: contextHash as `0x${string}`,
    wallet: params.wallet as `0x${string}`,
  };
}
