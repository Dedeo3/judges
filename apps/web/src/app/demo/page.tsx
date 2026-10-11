"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import type { Address, WalletClient } from "viem";
import { Marginalia } from "@/components/Document";
import { SiteFrame } from "@/components/SiteFrame";
import { Verdict } from "@/components/Verdict";
import { connectWallet } from "@/lib/wallet";
import { proveMembershipInBrowser, registerIdentity } from "@/lib/proveBrowser";

type Status = { kind: "idle" } | { kind: "success"; message: string } | { kind: "error"; message: string };

export default function DemoPage() {
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("judges-demo");
  const [account, setAccount] = useState<Address | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const signIdentityMessage = (message: string) => {
    if (!account || !walletClient) throw new Error("connect a wallet first");
    return walletClient.signMessage({ account, message });
  };

  async function handleRegisterPasskey() {
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const optionsRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const { sessionId, options } = await optionsRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, response: attestation }),
      });
      const result = await verifyRes.json();
      setStatus(
        result.verified
          ? { kind: "success", message: `Passkey registered (credential ${result.credentialId.slice(0, 12)}…).` }
          : { kind: "error", message: `Registration rejected: ${result.reason}` },
      );
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Registration failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectWallet() {
    try {
      const connected = await connectWallet();
      setAccount(connected.account);
      setWalletClient(connected.walletClient);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Wallet connection failed" });
    }
  }

  async function handleRegisterIdentity() {
    if (!account) {
      setStatus({ kind: "error", message: "Connect a wallet first — your identity secret is derived from its signature." });
      return;
    }
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await registerIdentity({ wallet: account, signIdentityMessage });
      setStatus(
        result.ok
          ? {
              kind: "success",
              message: `Identity registered (leaf ${result.leafIndex}). Root ${result.rootHex?.slice(0, 12)}… must be posted on-chain before proofs verify.`,
            }
          : { kind: "error", message: `Registration rejected: ${result.reason}` },
      );
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Identity registration failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleTestProve() {
    if (!account) {
      setStatus({ kind: "error", message: "Connect a wallet first — proofs are bound to one wallet." });
      return;
    }
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const result = await proveMembershipInBrowser({
        appId: domain,
        wallet: account,
        assurance: "user_verified",
        signIdentityMessage,
      });
      setStatus(
        result.verified
          ? {
              kind: "success",
              message: `ZK proof generated in-browser, bound to ${account.slice(0, 6)}…${account.slice(-4)}. nullifier ${result.nullifier?.slice(0, 12)}…, domain ${result.domain?.slice(0, 12)}….`,
            }
          : {
              kind: "error",
              message:
                result.reason === "identity_not_registered"
                  ? "Register your identity above first."
                  : `Proof failed: ${result.reason}`,
            },
      );
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Proof generation failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteFrame>
      <article className="sec" style={{ borderTop: 0 }}>
        <div className="sec-side">
          <span className="sec-num">Demos</span>
          <Marginalia>
            A passkey gates registration (a real user is present); your identity secret is derived from a wallet
            signature and never leaves this device.
          </Marginalia>
        </div>

        <div className="sec-body">
          <h1 className="h1-demo">Register your identity</h1>
          <p>
            Two steps, once per device: create a passkey, then register an identity. The identity commitment is
            <code> Poseidon(secret)</code> where the secret comes from a wallet signature — the server stores the
            commitment, never the secret.
          </p>

          <h2>1. Passkey</h2>
          <div className="stack">
            <label className="field">
              Display name (optional)
              <input value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy} />
            </label>
            <button className="btn" onClick={handleRegisterPasskey} disabled={busy}>
              Register with passkey
            </button>
          </div>

          <h2>2. Identity</h2>
          <div className="stack">
            <button className="btn" onClick={handleConnectWallet} disabled={busy}>
              {account ? `Connected: ${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
            </button>
            <button className="btn" onClick={handleRegisterIdentity} disabled={busy || !account}>
              Sign identity message and register (passkey-gated)
            </button>
          </div>

          <h2>Test a proof</h2>
          <p>
            Generate a membership proof in your browser for an app id. It doesn&apos;t submit anything — the three
            demos below do. Needs the identity registered and its root posted on-chain.
          </p>
          <div className="stack">
            <label className="field">
              App id
              <input value={domain} onChange={(e) => setDomain(e.target.value)} disabled={busy} />
            </label>
            <button className="btn" onClick={handleTestProve} disabled={busy || !account}>
              Generate a proof (ZK, in-browser)
            </button>
          </div>

          <h2>Demo integrations</h2>
          <p>Three apps, one flow, three separate nullifier domains. Acting in one does not spend your turn in another.</p>
          <ul className="prose-list">
            <li>
              <a href="/demo/dao">Sybil-resistant DAO</a>: one identity, one vote per proposal.
            </li>
            <li>
              <a href="/demo/agent">AI agent registry</a>: agents registered only under a verified identity.
            </li>
            <li>
              <a href="/demo/faucet">Sybil-resistant faucet</a>: one claim per identity.
            </li>
          </ul>

          <div role="status" aria-live="polite">
            {status.kind === "success" && (
              <div className="stack">
                <Verdict status="accepted" />
                <p style={{ overflowWrap: "anywhere" }}>{status.message}</p>
              </div>
            )}
            {status.kind === "error" && (
              <p className="error" style={{ overflowWrap: "anywhere" }}>
                {status.message}
              </p>
            )}
          </div>
        </div>
      </article>
    </SiteFrame>
  );
}
