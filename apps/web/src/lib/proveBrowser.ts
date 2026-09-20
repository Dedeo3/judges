import * as snarkjs from "snarkjs";
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
 * Steps: sign the fixed identity message -> secret -> commitment -> register it (idempotent) ->
 * fetch the LeanIMT inclusion proof -> build the witness -> Groth16 prove with the v2 wasm/zkey.
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

  // 2. Register the commitment (idempotent) so it is a leaf in the server's tree.
  const registerRes = await fetch(`${apiBaseUrl}/api/commitments/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commitment: commitment.toString() }),
  });
  if (!registerRes.ok) {
    return { verified: false, reason: "commitment_registration_failed" };
  }

  // 3. Fetch the inclusion proof for that commitment.
  const proofRes = await fetch(
    `${apiBaseUrl}/api/commitments/proof?commitment=${encodeURIComponent(commitment.toString())}`,
  );
  const proofBody = (await proofRes.json().catch(() => null)) as InclusionProofResponse | null;
  if (!proofRes.ok || !proofBody?.ok || !proofBody.proof) {
    return { verified: false, reason: proofBody?.reason ?? "inclusion_proof_unavailable" };
  }
  const incl = proofBody.proof;
  if (incl.indices.length !== MAX_TREE_DEPTH || incl.siblings.length !== MAX_TREE_DEPTH) {
    return { verified: false, reason: "inclusion_proof_malformed" };
  }

  // 4. Build the witness. The circuit binds policyHash = sha256(contextHash ‖ wallet) % p.
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

  // 5. Groth16 prove in the browser against the served v2 artifacts.
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
