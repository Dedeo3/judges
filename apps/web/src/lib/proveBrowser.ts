import * as snarkjs from "snarkjs";
import { startAuthentication } from "@simplewebauthn/browser";
import { encodeAbiParameters } from "viem";
import {
  assuranceContextHash,
  deriveIdentityCommitment,
  deriveIdentitySecret,
  deriveMembershipV2Witness,
  derivePolicyHashFromHex,
  JUDGES_IDENTITY_MESSAGE,
  MAX_TREE_DEPTH,
  membershipV2WitnessToInputJson,
  toBytes32Hex,
  type CircuitMerkleProof,
} from "@judges/crypto/client";
import type { AssuranceLevel, ProveApiResponse } from "@judges/sdk";

/**
 * Redesign B browser proving. Runs entirely on the Judges origin (the /connect popup and the
 * same-origin demos): the identity secret is derived from a wallet signature and NEVER leaves the
 * browser — the server only ever sees the commitment and the finished proof. This replaces the
 * pre-B `/api/prove` server path, whose server-held secret was README §27.8's disclosed weakness.
 *
 * Steps: sign the fixed identity message -> secret -> commitment -> fetch the LeanIMT inclusion
 * proof -> build the witness -> Groth16 prove with the v2 wasm/zkey. Registration is a separate,
 * passkey-gated step (`registerIdentity`); proving requires the identity to already be a member.
 *
 * The wasm + zkey are served as static assets under `public/prover/` (copied from
 * prover/build after `pnpm --filter @judges/prover build:v2 && setup:v2`). The proof only verifies
 * on-chain once the returned root has been posted to CommitmentTree (see /api/commitments/root).
 */
export const DEFAULT_WASM_URL = "/prover/judges_membership_v2_js/judges_membership_v2.wasm";
export const DEFAULT_ZKEY_URL = "/prover/judges_membership_v2_final.zkey";

export interface BrowserProveParams {
  appId: string;
  wallet: `0x${string}`;
  assurance: AssuranceLevel;
  /** App-defined action binding (0x + 64 hex); defaults to the assurance level alone. */
  contextHash?: `0x${string}`;
  /** Signs the fixed identity message with the user's wallet (e.g. walletClient.signMessage). */
  signIdentityMessage: (message: string) => Promise<`0x${string}`>;
  apiBaseUrl?: string;
  wasmUrl?: string;
  zkeyUrl?: string;
}

interface InclusionProofResponse {
  ok: boolean;
  reason?: string;
  proof?: { root: string; leaf: string; depth: number; indices: string[]; siblings: string[] };
}

function toHex32(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Produce a Judges membership proof in the browser. Returns the same shape the SDK's
 * `toJudgesProof` consumes (a `ProveApiResponse`), so the popup can post it back unchanged.
 */
export async function proveMembershipInBrowser(params: BrowserProveParams): Promise<ProveApiResponse> {
  const apiBaseUrl = params.apiBaseUrl ?? "";

  // 1. Wallet signature -> identity secret -> commitment. The secret stays in this function.
  const signature = await params.signIdentityMessage(JUDGES_IDENTITY_MESSAGE);
  const secret = deriveIdentitySecret(signature);
  const commitment = deriveIdentityCommitment(secret);

  // 2. Fetch the inclusion proof. Proving never registers — the commitment must already be a
  //    member (registered via the passkey-gated `registerIdentity` flow). A missing leaf means
  //    the user hasn't registered their identity yet.
  const proofRes = await fetch(
    `${apiBaseUrl}/api/commitments/proof?commitment=${encodeURIComponent(commitment.toString())}`,
  );
  const proofBody = (await proofRes.json().catch(() => null)) as InclusionProofResponse | null;
  if (proofRes.status === 404) {
    return { verified: false, reason: "identity_not_registered" };
  }
  if (!proofRes.ok || !proofBody?.ok || !proofBody.proof) {
    return { verified: false, reason: proofBody?.reason ?? "inclusion_proof_unavailable" };
  }
  const incl = proofBody.proof;
  if (incl.indices.length !== MAX_TREE_DEPTH || incl.siblings.length !== MAX_TREE_DEPTH) {
    return { verified: false, reason: "inclusion_proof_malformed" };
  }

  // 3. Build the witness. The circuit binds policyHash = sha256(contextHash ‖ wallet) % p.
  const contextHash = params.contextHash ?? toHex32(assuranceContextHash(params.assurance));
  const policyHash = derivePolicyHashFromHex({ contextHash, wallet: params.wallet });

  const merkleProof: CircuitMerkleProof = {
    root: BigInt(incl.root),
    leaf: commitment,
    depth: incl.depth,
    indices: incl.indices.map((v) => BigInt(v)),
    siblings: incl.siblings.map((v) => BigInt(v)),
  };
  const witness = deriveMembershipV2Witness({ secret, applicationId: params.appId, merkleProof, policyHash });
  const input = membershipV2WitnessToInputJson(witness);

  // 4. Groth16 prove in the browser against the served v2 artifacts.
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    params.wasmUrl ?? DEFAULT_WASM_URL,
    params.zkeyUrl ?? DEFAULT_ZKEY_URL,
  );

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
    merkleRoot: toBytes32Hex(witness.merkleRoot),
    nullifier: toBytes32Hex(witness.nullifier),
    domain: toBytes32Hex(witness.applicationIdHash),
    contextHash,
    wallet: params.wallet,
    appId: params.appId,
  };
}

export interface RegisterIdentityParams {
  wallet: `0x${string}`;
  signIdentityMessage: (message: string) => Promise<`0x${string}`>;
  apiBaseUrl?: string;
}

export interface RegisterIdentityResult {
  ok: boolean;
  reason?: string;
  root?: string;
  rootHex?: `0x${string}`;
  leafIndex?: number;
}

/**
 * Registers the caller's identity commitment, gated by a passkey (humanity).
 *
 * Requires a passkey already registered on this deployment. Runs a WebAuthn assertion (the
 * humanity gate), derives the commitment from a wallet signature, and posts both to
 * /api/commitments/register, which verifies the assertion before storing the commitment. The
 * secret never leaves the browser. The returned root must then be published on-chain
 * (CommitmentTree.postRoot) before proofs against it verify.
 */
export async function registerIdentity(params: RegisterIdentityParams): Promise<RegisterIdentityResult> {
  const apiBaseUrl = params.apiBaseUrl ?? "";

  const signature = await params.signIdentityMessage(JUDGES_IDENTITY_MESSAGE);
  const commitment = deriveIdentityCommitment(deriveIdentitySecret(signature));

  // Passkey assertion — proof a user-verified passkey holder is present.
  const optionsRes = await fetch(`${apiBaseUrl}/api/webauthn/auth/options`, { method: "POST" });
  if (!optionsRes.ok) return { ok: false, reason: "auth_options_failed" };
  const { sessionId, options } = (await optionsRes.json()) as {
    sessionId: string;
    options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
  };
  const assertion = await startAuthentication({ optionsJSON: options });

  const res = await fetch(`${apiBaseUrl}/api/commitments/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, response: assertion, commitment: commitment.toString() }),
  });
  const body = (await res.json().catch(() => null)) as RegisterIdentityResult | null;
  if (!res.ok || !body?.ok) {
    return { ok: false, reason: body?.reason ?? "registration_failed" };
  }
  return { ok: true, root: body.root, rootHex: body.rootHex, leafIndex: body.leafIndex };
}
