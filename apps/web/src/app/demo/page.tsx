"use client";

import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

type Status = { kind: "idle" } | { kind: "success"; message: string } | { kind: "error"; message: string };

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

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
    <main style={{ maxWidth: 480, margin: "4rem auto", fontFamily: "sans-serif" }}>
      <h1>Judges — WebAuthn Demo</h1>
      <p>Phase 1: register and verify a passkey. Phase 2: bind that passkey to a wallet.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Display name (optional)"
          disabled={busy}
        />
        <button onClick={handleRegister} disabled={busy}>
          Register with passkey
        </button>
        <button onClick={handleAuthenticate} disabled={busy}>
          Sign in with passkey
        </button>
      </div>

      <hr style={{ margin: "32px 0" }} />

      <h2>Wallet binding</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={handleConnectWallet} disabled={busy}>
          {wallet ? `Connected: ${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect wallet"}
        </button>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Domain" disabled={busy} />
        <button onClick={handleBindWallet} disabled={busy || !wallet}>
          Bind wallet to passkey
        </button>
      </div>

      {status.kind !== "idle" && (
        <p style={{ marginTop: 24, color: status.kind === "error" ? "crimson" : "green" }}>{status.message}</p>
      )}
    </main>
  );
}
