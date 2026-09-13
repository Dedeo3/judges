import { startAuthentication } from "@simplewebauthn/browser";
import { createPublicClient, http as viemHttp, type Address, type Chain, type WalletClient } from "viem";
import { judgesVerifierAbi } from "./abi";
import { isValidAppId, namespacedAppId, normalizeOrigin } from "./connect";
import { postJson } from "./http";
import { requestProofViaPopup } from "./popup";
import { assertProofMatchesRequest, toJudgesProof, type ProveApiResponse } from "./proof";
import type { AssuranceLevel, JudgesConfig, JudgesProof, Network, VerifyOnchainResult } from "./types";

export * from "./types";
export { judgesVerifierAbi } from "./abi";
export { JudgesApiError } from "./http";
export { JudgesPopupError } from "./popup";
export { assertProofMatchesRequest, toJudgesProof, type ProveApiResponse } from "./proof";
export {
  ASSURANCE_LEVELS,
  CONNECT_PATH,
  buildConnectUrl,
  isConnectMessageFor,
  isValidAppId,
  isValidProofAppId,
  namespacedAppId,
  normalizeOrigin,
  parseConnectRequest,
  referrerMatchesOrigin,
  type ConnectMessage,
  type ConnectRequest,
} from "./connect";

const DEFAULT_MAX_RETRIES = 2;

/**
 * Hides WebAuthn ceremonies, proof preparation, and Monad RPC interaction behind three calls —
 * README §11:
 *
 * ```ts
 * const judges = new Judges({ network: "monad-testnet", appId: "my-dapp", judgesOrigin: "https://judges.example" });
 * const proof = await judges.prove({ assurance: "user_verified", wallet });
 * const result = await judges.verify(proof, { walletClient, verifierAddress, chain });
 * ```
 */
export class Judges {
  private readonly network: Network;
  private readonly appId: string;
  private readonly judgesOrigin: string | null;
  private readonly apiBaseUrl: string;
  private readonly maxRetries: number;
  private readonly popupTimeoutMs: number | undefined;

  constructor(config: JudgesConfig) {
    if (!isValidAppId(config.appId)) {
      throw new Error(`Invalid appId "${config.appId}": lowercase letters, digits, . _ -; max 64 chars`);
    }
    if (config.judgesOrigin !== undefined && !normalizeOrigin(config.judgesOrigin)) {
      throw new Error(`Invalid judgesOrigin "${config.judgesOrigin}": expected an https origin with no path`);
    }

    this.network = config.network;
    this.appId = config.appId;
    this.judgesOrigin = config.judgesOrigin ? normalizeOrigin(config.judgesOrigin) : null;
    this.apiBaseUrl = config.apiBaseUrl ?? "/api";
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.popupTimeoutMs = config.popupTimeoutMs;
  }

  /** True when proofs must be requested through the Judges popup rather than same-origin APIs. */
  get usesPopup(): boolean {
    if (!this.judgesOrigin) return false;
    return typeof window === "undefined" || window.location.origin !== this.judgesOrigin;
  }

  /**
   * Runs a passkey ceremony and returns a ZK membership proof bound to `wallet`. The credential
   * secret never leaves the Judges server — this call only ever sees the finished proof.
   *
   * From a third-party site (see `judgesOrigin`), this opens a Judges popup, so **call it
   * directly from a click handler**: browsers block popups opened after an `await`.
   */
  prove(params: {
    assurance: AssuranceLevel;
    /** The wallet this proof is bound to — required, so a lifted proof can't be redirected. */
    wallet: Address;
    /**
     * App-defined action binding (0x + 64 hex), e.g. a DAO's (proposalId, support). Omitted, the
     * proof binds the wallet but not a specific action.
     */
    contextHash?: `0x${string}`;
  }): Promise<JudgesProof> {
    // Not `async`, and no await before this branch: the popup must open synchronously inside the
    // caller's click handler.
    if (this.usesPopup) {
      return requestProofViaPopup({
        judgesOrigin: this.judgesOrigin!,
        request: {
          appId: this.appId,
          assurance: params.assurance,
          wallet: params.wallet,
          contextHash: params.contextHash,
        },
        timeoutMs: this.popupTimeoutMs,
      }).then((payload) => {
        const proof = toJudgesProof(payload as ProveApiResponse, params.assurance, null);
        assertProofMatchesRequest(proof, {
          appId: namespacedAppId(window.location.origin, this.appId),
          wallet: params.wallet,
          contextHash: params.contextHash,
        });
        return proof;
      });
    }

    return this.proveSameOrigin(params);
  }

  private async proveSameOrigin(params: {
    assurance: AssuranceLevel;
    wallet: Address;
    contextHash?: `0x${string}`;
  }): Promise<JudgesProof> {
    const result = await runProveCeremony({
      apiBaseUrl: this.apiBaseUrl,
      appId: this.appId,
      assurance: params.assurance,
      wallet: params.wallet,
      contextHash: params.contextHash,
      maxRetries: this.maxRetries,
    });
    return toJudgesProof(result, params.assurance, this.appId);
  }

  /**
   * Submits the proof to `JudgesVerifier.verify()` on Monad using the caller's own wallet client
   * (the SDK never holds a signer itself) and normalizes the result.
   */
  async verify(
    proof: JudgesProof,
    options: { walletClient: WalletClient; verifierAddress: Address; account?: Address; chain: Chain },
  ): Promise<VerifyOnchainResult> {
    const account = options.account ?? options.walletClient.account?.address;
    if (!account) {
      throw new Error("Judges.verify requires an account (pass options.account, or connect one on the walletClient)");
    }

    if (account.toLowerCase() !== proof.wallet.toLowerCase()) {
      throw new Error(
        `Judges.verify: proof is bound to ${proof.wallet}, but the submitting account is ${account}. ` +
          "Generate the proof for the account that will submit it.",
      );
    }

    const txHash = await options.walletClient.writeContract({
      address: options.verifierAddress,
      abi: judgesVerifierAbi,
      functionName: "verify",
      args: [proof.proof, proof.walletCommitment, proof.domain, proof.nullifier, proof.contextHash, proof.wallet],
      account,
      chain: options.chain,
    });

    const publicClient = createPublicClient({ chain: options.chain, transport: viemHttp() });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      valid: receipt.status === "success",
      txHash,
      domain: proof.domain,
      nullifier: proof.nullifier,
    };
  }

  /** Whether a nullifier has already been consumed in this app's domain — no wallet needed. */
  async isNullifierUsed(params: {
    domain: `0x${string}`;
    nullifier: `0x${string}`;
    verifierAddress: Address;
    chain: Chain;
  }): Promise<boolean> {
    const publicClient = createPublicClient({ chain: params.chain, transport: viemHttp() });
    return publicClient.readContract({
      address: params.verifierAddress,
      abi: judgesVerifierAbi,
      functionName: "isNullifierUsed",
      args: [params.domain, params.nullifier],
    });
  }
}

/**
 * The raw passkey ceremony + proof request against same-origin Judges APIs, returning the API
 * response untouched. Only meaningful on the Judges origin itself (passkeys are scoped to it).
 *
 * Exported for Judges' own /connect page, which proves under a namespaced app id
 * (`https://site/app`) that the integrator-facing `Judges` constructor deliberately refuses.
 * Integrators should use `Judges.prove()`.
 */
export async function runProveCeremony(params: {
  apiBaseUrl?: string;
  appId: string;
  assurance: AssuranceLevel;
  wallet: string;
  contextHash?: string;
  maxRetries?: number;
}): Promise<ProveApiResponse> {
  const apiBaseUrl = params.apiBaseUrl ?? "/api";
  const maxRetries = params.maxRetries ?? DEFAULT_MAX_RETRIES;

  const { sessionId, options } = await postJson<{ sessionId: string; options: unknown }>(
    `${apiBaseUrl}/webauthn/auth/options`,
    {},
    maxRetries,
  );

  // Not retried: a WebAuthn assertion is tied to one server-issued, single-use challenge, so
  // resubmitting it (or restarting the ceremony) after a partial failure needs a fresh call
  // from the top, not a blind retry of the same request.
  const response = await startAuthentication({
    optionsJSON: options as Parameters<typeof startAuthentication>[0]["optionsJSON"],
  });

  return postJson<ProveApiResponse>(
    `${apiBaseUrl}/prove`,
    {
      sessionId,
      response,
      appId: params.appId,
      assurance: params.assurance,
      wallet: params.wallet,
      contextHash: params.contextHash,
    },
    maxRetries,
  );
}
