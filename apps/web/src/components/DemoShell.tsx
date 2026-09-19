"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Judges, type JudgesProof } from "@judges/sdk";
import type { Address, WalletClient } from "viem";
import { explorerTxUrl, missingConfigReason, type APP_IDS } from "@/lib/judgesConfig";
import { connectWallet } from "@/lib/wallet";
import { Marginalia } from "./Document";
import { SiteFrame } from "./SiteFrame";
import { Verdict } from "./Verdict";

export type DemoStatus =
  | { kind: "idle" }
  | { kind: "busy"; message: string }
  | { kind: "success"; message: string; txHash?: `0x${string}` }
  | { kind: "error"; message: string };

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
  }, []);

  const handleRun = useCallback(async () => {
    if (!account || !walletClient) return;
    try {
      setStatus({ kind: "busy", message: "Reading action binding from the contract…" });
      const contextHash = await action.contextHash(account);

      setStatus({ kind: "busy", message: "Passkey ceremony, then generating the ZK proof…" });
      const judges = new Judges({ network: "monad-testnet", appId });
      const proof = await judges.prove({ assurance: "user_verified", wallet: account, contextHash });

      setStatus({ kind: "busy", message: "Submitting to Monad…" });
      const txHash = await action.submit({ proof, account, walletClient });

      setStatus({ kind: "success", message: "Done — nullifier consumed for this domain.", txHash });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  }, [account, walletClient, action, appId]);

  // A reused credential reverts with this custom error; show it as the verdict it is.
  const nullifierRejected = status.kind === "error" && status.message.includes("NullifierAlreadyUsed");

  return (
    <SiteFrame>
      <article className="sec" style={{ borderTop: 0 }}>
        <div className="sec-side">
          <span className="sec-num">
            <a href="/demo">Demos</a>
          </span>
          <Marginalia>
            Requires a registered passkey. Register one on the <a href="/demo">main demo page</a> first.
          </Marginalia>
        </div>

        <div className="sec-body">
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

          <div role="status" aria-live="polite">
            {status.kind === "busy" && <p className="muted">{status.message}</p>}

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
