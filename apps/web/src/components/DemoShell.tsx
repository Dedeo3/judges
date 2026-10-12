"use client";

import { useCallback, useState, type ReactNode } from "react";
import { toJudgesProof, type JudgesProof } from "@judges/sdk";
import type { Address, WalletClient } from "viem";
import { explorerTxUrl, missingConfigReason, type APP_IDS } from "@/lib/judgesConfig";
import { proveMembershipInBrowser } from "@/lib/proveBrowser";
import { useConnectJudgesWallet } from "@/lib/judgesWalletContext";
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
  | { kind: "error"; message: string; step?: number };

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
      const proof = toJudgesProof(raw, "user_verified", appId);

      step = 2;
      setStatus({ kind: "busy", step });
      const txHash = await action.submit({ proof, account, walletClient });

      setStatus({ kind: "success", message: "Done — nullifier consumed for this domain.", txHash });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed", step });
    }
  }, [account, walletClient, action, appId]);

  // A reused credential reverts with this custom error; show it as the verdict it is.
  const nullifierRejected = status.kind === "error" && status.message.includes("NullifierAlreadyUsed");

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
