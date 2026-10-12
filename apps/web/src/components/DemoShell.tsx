"use client";

import { useCallback, useState, type ReactNode } from "react";
import { toJudgesProof, type JudgesProof } from "@judges/sdk";
import type { Address, WalletClient } from "viem";
import { judgesVerifierAbi } from "@/lib/abis";
import { addresses, explorerTxUrl, missingConfigReason, type APP_IDS } from "@/lib/judgesConfig";
import { proveMembershipInBrowser } from "@/lib/proveBrowser";
import { useConnectJudgesWallet } from "@/lib/judgesWalletContext";
import { publicClient } from "@/lib/wallet";
import { Marginalia } from "./Document";
import { Steps } from "./Progress";
import { SiteFrame } from "./SiteFrame";
import { Verdict } from "./Verdict";

/** What a run does, in order. `step` in the status below is an index into this list. */
const RUN_STEPS = [
  "Read the action binding from the contract",
  "Sign the identity message, then prove in your browser",
  "Submit to Monad",
] as const;

export type DemoStatus =
  | { kind: "idle" }
  | { kind: "busy"; step: number }
  | { kind: "success"; message: string; txHash?: `0x${string}` }
  /** `rejected`: the run stopped because this credential has already acted in this app. */
  | { kind: "error"; message: string; step?: number; rejected?: boolean };

const ALREADY_USED =
  "NullifierAlreadyUsed: this credential has already acted in this app, so the contract rejects it. Nothing was sent.";

/**
 * Whether this credential has already acted in this app, read from the registry itself.
 *
 * The verdict has to come from chain state, not from the text of a failed call: the revert
 * (NullifierAlreadyUsed) is declared by NullifierRegistry, not by the demo contracts, so it is not
 * in their ABIs and a wallet reports it as an undecodable error at best.
 */
function nullifierUsed(proof: JudgesProof): Promise<boolean> {
  return publicClient().readContract({
    address: addresses.judgesVerifier!,
    abi: judgesVerifierAbi,
    functionName: "isNullifierUsed",
    args: [proof.domain, proof.nullifier],
  });
}

/**
 * Shared scaffolding for the three README §15 demos: wallet connection, the prove step, status
 * reporting, and the "not deployed yet" guard. Each demo supplies only what's specific to it —
 * how to compute its action binding, and what transaction to send once it has a proof.
 */
export function DemoShell({
  title,
  intro,
  demo,
  appId,
  children,
  action,
}: {
  title: string;
  intro: ReactNode;
  demo: keyof typeof APP_IDS;
  appId: string;
  children?: ReactNode;
  action: {
    label: string;
    /** Read the action binding from the demo contract, so there's no TS copy of the hashing. */
    contextHash: (account: Address) => Promise<`0x${string}`>;
    /** Send the demo's own transaction with the finished proof. */
    submit: (args: {
      proof: JudgesProof;
      account: Address;
      walletClient: WalletClient;
    }) => Promise<`0x${string}`>;
  };
}) {
  const [account, setAccount] = useState<Address | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [status, setStatus] = useState<DemoStatus>({ kind: "idle" });
  const connectWallet = useConnectJudgesWallet();

  const notConfigured = missingConfigReason(demo);
  const busy = status.kind === "busy";

  const handleConnect = useCallback(async () => {
    try {
      const connected = await connectWallet();
      setAccount(connected.account);
      setWalletClient(connected.walletClient);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Wallet connection failed" });
    }
  }, [connectWallet]);

  const handleRun = useCallback(async () => {
    if (!account || !walletClient) return;
    let step = 0;
    let proof: JudgesProof | undefined;
    let sent = false;
    let reverted = false;
    try {
      setStatus({ kind: "busy", step });
      const contextHash = await action.contextHash(account);

      step = 1;
      setStatus({ kind: "busy", step });
      const raw = await proveMembershipInBrowser({
        appId,
        wallet: account,
        assurance: "user_verified",
        contextHash,
        signIdentityMessage: (message) => walletClient.signMessage({ account, message }),
      });
      proof = toJudgesProof(raw, "user_verified", appId);

      step = 2;
      setStatus({ kind: "busy", step });
      // A spent nullifier is certain to revert, so say so without asking the wallet to send it.
      if (await nullifierUsed(proof)) {
        setStatus({ kind: "error", message: ALREADY_USED, step, rejected: true });
        return;
      }
      const txHash = await action.submit({ proof, account, walletClient });
      sent = true;

      // The verdict is the mined result, not the fact that a transaction was sent.
      const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      if (receipt.status !== "success") {
        reverted = true;
        throw new Error(`The transaction was mined but reverted (${txHash}).`);
      }

      setStatus({ kind: "success", message: "Done — nullifier consumed for this domain.", txHash });
    } catch (err) {
      // A call that never went out, or one that was mined and reverted, may have lost to an earlier
      // use of the nullifier. One that was sent and has simply not confirmed yet may be our own
      // success, so that case is never reported as a rejection.
      const mayBeRejection = step === 2 && proof !== undefined && (!sent || reverted);
      const rejected = mayBeRejection && (await nullifierUsed(proof!).catch(() => false));
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed", step, rejected });
    }
  }, [account, walletClient, action, appId]);

  // A reused credential is rejected; show it as the verdict it is.
  const nullifierRejected = status.kind === "error" && status.rejected === true;

  // How far the run got: every step ticked on success, the failing one marked on error.
  const progress =
    status.kind === "busy" ? status.step : status.kind === "success" ? RUN_STEPS.length : status.kind === "error" ? status.step : undefined;

  return (
    <SiteFrame>
      <article className="sec sec--flush">
        <div className="sec-side enter">
          <span className="sec-num">
            <a href="/demo">Demos</a>
          </span>
          <Marginalia>
            You sign a fixed message with your wallet to derive a private identity; the proof is
            generated in your browser. Nothing about the secret leaves this device.
          </Marginalia>
        </div>

        <div className="sec-body enter-each">
          <h1 className="h1-demo">{title}</h1>
          <div className="intro">{intro}</div>

          {notConfigured && (
            <div className="panel">
              <div className="panel-head label">Not deployed yet</div>
              <p className="panel-empty">
                <code>{notConfigured}</code>. Run the deploy script (see <code>docs/deployment.md</code>) and set the
                address, then this page works end to end.
              </p>
            </div>
          )}

          <div className="stack">
            <button className="btn" onClick={handleConnect} disabled={busy}>
              {account ? `Connected: ${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
            </button>

            {children}

            <button className="btn" onClick={handleRun} disabled={busy || !account || Boolean(notConfigured)}>
              {busy ? "Working…" : action.label}
            </button>
          </div>

          <div role="status" aria-live="polite" className="stack">
            {progress !== undefined && (
              <Steps labels={RUN_STEPS} current={progress} failed={status.kind === "error"} />
            )}

            {status.kind === "success" && (
              <div className="stack">
                <Verdict status="accepted" />
                <p>
                  {status.message}
                  {status.txHash && explorerTxUrl(status.txHash) && (
                    <>
                      {" "}
                      <a href={explorerTxUrl(status.txHash)!} target="_blank" rel="noreferrer">
                        View transaction
                      </a>
                    </>
                  )}
                </p>
              </div>
            )}

            {status.kind === "error" && (
              <div className="stack">
                {nullifierRejected && <Verdict status="rejected" reason="nullifier already used" />}
                <p className="error" style={{ overflowWrap: "anywhere" }}>
                  {status.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
    </SiteFrame>
  );
}
