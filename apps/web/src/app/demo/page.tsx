"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { Judges, type JudgesProof } from "@judges/sdk";
import { Marginalia } from "@/components/Document";
import { SiteFrame } from "@/components/SiteFrame";
import { Verdict } from "@/components/Verdict";
// Imported for its `window.ethereum` global declaration, kept in one place.
import "@/lib/wallet";

type Status = { kind: "idle" } | { kind: "success"; message: string } | { kind: "error"; message: string };

export default function DemoPage() {
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("judges-demo");
  const [wallet, setWallet] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
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
          ? { kind: "success", message: `Passkey registered (credential ${result.credentialId.slice(0, 12)}…)` }
          : { kind: "error", message: `Registration rejected: ${result.reason}` },
      );
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Registration failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleAuthenticate() {
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const optionsRes = await fetch("/api/webauthn/auth/options", { method: "POST" });
      const { sessionId, options } = await optionsRes.json();

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/webauthn/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, response: assertion }),
      });
      const result = await verifyRes.json();

      setStatus(
        result.verified
          ? { kind: "success", message: `Verified as user ${result.userId} (userVerified: ${result.userVerified})` }
          : { kind: "error", message: `Verification rejected: ${result.reason}` },
      );
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Authentication failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleProveMembership() {
    if (!wallet) {
      setStatus({ kind: "error", message: "Connect a wallet first — proofs are bound to one wallet" });
      return;
    }
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const judges = new Judges({ network: "monad-testnet", appId: domain });
      const proof: JudgesProof = await judges.prove({
        assurance: "user_verified",
        wallet: wallet as `0x${string}`,
      });
      setStatus({
        kind: "success",
        message: `ZK proof generated, bound to ${proof.wallet.slice(0, 6)}…${proof.wallet.slice(-4)}. nullifier ${proof.nullifier.slice(0, 12)}…, domain ${proof.domain.slice(0, 12)}… (onchain verify() needs a deployed JudgesVerifier — Phase 8)`,
      });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Proof generation failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectWallet() {
    if (!window.ethereum) {
      setStatus({ kind: "error", message: "No injected wallet found (install MetaMask or similar)" });
      return;
    }
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    setWallet(accounts[0] ?? null);
  }

  async function handleBindWallet() {
    if (!wallet || !window.ethereum) {
      setStatus({ kind: "error", message: "Connect a wallet first" });
      return;
    }
    setBusy(true);
    setStatus({ kind: "idle" });
    try {
      const challengeRes = await fetch("/api/bindings/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, domain }),
      });
      const { sessionId, options, message } = await challengeRes.json();

      const walletSignature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, wallet],
      });

      const assertion = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/bindings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, walletSignature, response: assertion }),
      });
      const result = await verifyRes.json();

      setStatus(
        result.verified
          ? { kind: "success", message: `Bound ${result.wallet} to credential ${result.credentialId.slice(0, 12)}… in domain "${result.domain}"` }
          : { kind: "error", message: `Binding rejected: ${result.reason}` },
      );
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Binding failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteFrame>
      <article className="sec" style={{ borderTop: 0 }}>
        <div className="sec-side">
          <span className="sec-num">Demos</span>
          <Marginalia>Registration and verification run against this deployment&apos;s own backend and database.</Marginalia>
        </div>

        <div className="sec-body">
          <h1 className="h1-demo">Passkey demo</h1>
          <p>Register a passkey and verify it, then bind that passkey to a wallet.</p>

          <div className="stack">
            <label className="field">
              Display name (optional)
              <input value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy} />
            </label>
            <button className="btn" onClick={handleRegister} disabled={busy}>
              Register with passkey
            </button>
            <button className="btn" onClick={handleAuthenticate} disabled={busy}>
              Sign in with passkey
            </button>
          </div>

          <h2>Wallet binding</h2>
          <div className="stack">
            <button className="btn" onClick={handleConnectWallet} disabled={busy}>
              {wallet ? `Connected: ${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect wallet"}
            </button>
            <label className="field">
              Domain
              <input value={domain} onChange={(e) => setDomain(e.target.value)} disabled={busy} />
            </label>
            <button className="btn" onClick={handleBindWallet} disabled={busy || !wallet}>
              Bind wallet to passkey
            </button>
          </div>

          <h2>Prove membership</h2>
          <p>
            Uses <code>@judges/sdk</code> rather than a direct fetch, and proves through the WebAuthn ceremony above.
            It needs a connected wallet: proofs are bound to one wallet, so they cannot be lifted and reused.
          </p>
          <div className="stack">
            <button className="btn" onClick={handleProveMembership} disabled={busy || !wallet}>
              Prove membership (ZK) via SDK
            </button>
          </div>

          <h2>Demo integrations</h2>
          <p>Three apps, one SDK, three separate nullifier domains. Acting in one does not spend your turn in another.</p>
          <ul className="prose-list">
            <li>
              <a href="/demo/dao">Sybil-resistant DAO</a>: one credential, one vote per proposal.
            </li>
            <li>
              <a href="/demo/agent">AI agent registry</a>: agents registered only under a verified credential.
            </li>
            <li>
              <a href="/demo/faucet">Sybil-resistant faucet</a>: one claim per credential.
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
