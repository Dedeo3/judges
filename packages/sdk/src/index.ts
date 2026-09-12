import { startAuthentication } from "@simplewebauthn/browser";
import { createPublicClient, http as viemHttp, type Address, type Chain, type WalletClient } from "viem";
import { judgesVerifierAbi } from "./abi";
import { postJson } from "./http";
import type { JudgesConfig, JudgesProof, Network, VerifyOnchainResult } from "./types";

export * from "./types";
export { judgesVerifierAbi } from "./abi";
export { JudgesApiError } from "./http";

const DEFAULT_MAX_RETRIES = 2;

function defaultApiBaseUrl(): string {
  if (typeof window !== "undefined") return "/api";
  throw new Error(
    "JudgesConfig.apiBaseUrl is required outside a browser (no same-origin '/api' to fall back to)",
  );
}

interface ProveApiResponse {
  verified: boolean;
  reason?: string;
  proof?: `0x${string}`;
  walletCommitment?: `0x${string}`;
  nullifier?: `0x${string}`;
  domain?: `0x${string}`;
  contextHash?: `0x${string}`;
  wallet?: `0x${string}`;
}

/**
 * Hides WebAuthn ceremonies, proof preparation, and Monad RPC interaction behind three calls —
 * README §11:
 *
 * ```ts
 * const judges = new Judges({ network: "monad-testnet", appId: "my-dapp" });
 * const proof = await judges.prove({ assurance: "user_verified" });
 * const result = await judges.verify(proof, { walletClient, verifierAddress });
 * ```
 */
export class Judges {
  private readonly network: Network;
  private readonly appId: string;
  private readonly apiBaseUrl: string;
  private readonly maxRetries: number;

  constructor(config: JudgesConfig) {
    this.network = config.network;
    this.appId = config.appId;
    this.apiBaseUrl = config.apiBaseUrl ?? defaultApiBaseUrl();
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Runs a full passkey authentication ceremony in the browser, then asks the Judges backend to
   * turn the result into a ZK membership proof. The credential secret never leaves the server —
   * this call only ever sees the finished proof.
   */
  async prove(params: {
    assurance: import("@judges/types").AssuranceLevel;
    /** The wallet this proof is bound to — required, so a lifted proof can't be redirected. */
    wallet: Address;
    /**
     * App-defined action binding (0x + 64 hex), e.g. a DAO's (proposalId, support). Omitted, the
     * proof binds the wallet but not a specific action.
     */
    contextHash?: `0x${string}`;
  }): Promise<JudgesProof> {
    const { sessionId, options } = await postJson<{ sessionId: string; options: unknown }>(
      `${this.apiBaseUrl}/webauthn/auth/options`,
      {},
      this.maxRetries,
    );

    // Not retried: a WebAuthn assertion is tied to one server-issued, single-use challenge, so
    // resubmitting it (or restarting the ceremony) after a partial failure needs a fresh call
    // from the top, not a blind retry of the same request.
    const response = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]["optionsJSON"] });

    const result = await postJson<ProveApiResponse>(
      `${this.apiBaseUrl}/prove`,
      {
        sessionId,
        response,
        appId: this.appId,
        assurance: params.assurance,
        wallet: params.wallet,
        contextHash: params.contextHash,
      },
      this.maxRetries,
    );

    if (
      !result.verified ||
      !result.proof ||
      !result.walletCommitment ||
      !result.nullifier ||
      !result.domain ||
      !result.contextHash ||
      !result.wallet
    ) {
      throw new Error(`Judges.prove failed: ${result.reason ?? "unknown reason"}`);
    }

    return {
      proof: result.proof,
      walletCommitment: result.walletCommitment,
      nullifier: result.nullifier,
      domain: result.domain,
      contextHash: result.contextHash,
      wallet: result.wallet,
      appId: this.appId,
      assurance: params.assurance,
    };
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
