"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  namespacedAppId,
  parseConnectRequest,
  referrerMatchesOrigin,
  runProveCeremony,
  type ConnectMessage,
  type ConnectRequest,
} from "@judges/sdk";

/**
 * The popup a third-party site opens to get a proof. Runs the passkey ceremony on Judges' own
 * origin (the only place a Judges passkey can be exercised) and hands back only the finished
 * proof. See packages/sdk/src/connect.ts for the threat model this page enforces.
 */

type PageState =
  | { kind: "blocked"; title: string; detail: string }
  | { kind: "consent"; request: ConnectRequest; effectiveAppId: string }
  | { kind: "working"; request: ConnectRequest; effectiveAppId: string; message: string }
  | { kind: "retry"; request: ConnectRequest; effectiveAppId: string; message: string }
  | { kind: "done" };

function post(request: ConnectRequest, message: ConnectMessage) {
  // targetOrigin is the claimed requesting origin, never "*". If the opener isn't really that
  // origin, the browser silently drops this — which is the point.
  window.opener?.postMessage(message, request.requestingOrigin);
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Computed once, synchronously, from the URL and the window. This component only ever renders in
 * the browser (see page.tsx), so there's no server render to mismatch against and no need to
 * defer it to an effect.
 */
function initialState(): PageState {
  const parsed = parseConnectRequest(new URLSearchParams(window.location.search));
  if (!parsed.ok) {
    return { kind: "blocked", title: "This request can't be processed", detail: parsed.reason };
  }

  const request = parsed.value;

  if (!window.opener) {
    return {
      kind: "blocked",
      title: "Open this from an app",
      detail: "This page is meant to be opened by a site using Judges, so it can return a proof to it.",
    };
  }

  // Defence in depth: a site claiming to be someone else, to borrow their name on this screen.
  if (!referrerMatchesOrigin(document.referrer, request.requestingOrigin)) {
    return {
      kind: "blocked",
      title: "This request looks forged",
      detail: `It claims to come from ${request.requestingOrigin}, but was opened by a different site.`,
    };
  }

  return {
    kind: "consent",
    request,
    effectiveAppId: namespacedAppId(request.requestingOrigin, request.appId),
  };
}

export default function ConnectFlow() {
  const [state, setState] = useState<PageState>(initialState);

  async function handleVerify(request: ConnectRequest, effectiveAppId: string) {
    setState({ kind: "working", request, effectiveAppId, message: "Waiting for your passkey…" });
    try {
      const result = await runProveCeremony({
        appId: effectiveAppId,
        assurance: request.assurance,
        wallet: request.wallet,
        contextHash: request.contextHash,
      });

      if (!result.verified) {
        setState({
          kind: "retry",
          request,
          effectiveAppId,
          message: `Verification was rejected (${result.reason ?? "unknown reason"}).`,
        });
        return;
      }

      post(request, {
        type: "judges:proof",
        requestId: request.requestId,
        proof: { ...result, appId: effectiveAppId },
      });
      setState({ kind: "done" });
      window.close();
    } catch (err) {
      // Ceremony dismissed, no passkey on this device, network error — all recoverable in place,
      // so offer a retry instead of failing the whole request back to the site.
      setState({
        kind: "retry",
        request,
        effectiveAppId,
        message:
          err instanceof Error && err.name === "NotAllowedError"
            ? "The passkey prompt was dismissed, or no Judges passkey was found on this device."
            : err instanceof Error
              ? err.message
              : "Verification failed.",
      });
    }
  }

  async function handleRegister(request: ConnectRequest, effectiveAppId: string) {
    setState({ kind: "working", request, effectiveAppId, message: "Creating your passkey…" });
    try {
      const optionsRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const { sessionId, options } = await optionsRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, response: attestation }),
      });
      const result = await verifyRes.json();

      setState(
        result.verified
          ? { kind: "consent", request, effectiveAppId }
          : { kind: "retry", request, effectiveAppId, message: `Passkey registration was rejected (${result.reason}).` },
      );
    } catch (err) {
      setState({
        kind: "retry",
        request,
        effectiveAppId,
        message: err instanceof Error ? err.message : "Passkey registration failed.",
      });
    }
  }

  function handleCancel(request: ConnectRequest) {
    post(request, { type: "judges:cancel", requestId: request.requestId });
    window.close();
  }

  return (
    <main style={{ maxWidth: 420, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <p style={{ fontSize: 13, letterSpacing: 1, color: "#666", margin: 0 }}>JUDGES</p>

      {state.kind === "blocked" && (
        <>
          <h1 style={{ fontSize: 22 }}>{state.title}</h1>
          <p>{state.detail}</p>
        </>
      )}

      {state.kind === "done" && (
        <>
          <h1 style={{ fontSize: 22 }}>Verified</h1>
          <p>You can close this window.</p>
        </>
      )}

      {(state.kind === "consent" || state.kind === "working" || state.kind === "retry") && (
        <>
          <h1 style={{ fontSize: 22, marginBottom: 4 }}>Verify you&apos;re a real user</h1>
          <p style={{ marginTop: 0 }}>
            <strong style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{state.request.requestingOrigin}</strong>{" "}
            is asking you to confirm with your passkey.
          </p>

          <dl style={{ background: "#f6f6f6", padding: 12, borderRadius: 6, fontSize: 14, margin: "16px 0" }}>
            <dt style={{ color: "#666" }}>Credited to wallet</dt>
            <dd style={{ margin: "0 0 8px", fontFamily: "monospace" }}>{shortAddress(state.request.wallet)}</dd>
            <dt style={{ color: "#666" }}>For</dt>
            <dd style={{ margin: "0 0 8px", fontFamily: "monospace", wordBreak: "break-all" }}>
              {state.effectiveAppId}
            </dd>
            <dt style={{ color: "#666" }}>Scope</dt>
            <dd style={{ margin: 0 }}>
              {state.request.contextHash
                ? "One specific action on that site"
                : "Proves you're verified, not tied to a specific action"}
            </dd>
          </dl>

          <p style={{ fontSize: 13, color: "#555" }}>
            The site receives a zero-knowledge proof — not your passkey, your identity, or which other apps you use. It
            can only use this within its own space; it can&apos;t spend your turn on another site.
          </p>

          {state.kind === "retry" && <p style={{ color: "crimson", fontSize: 14 }}>{state.message}</p>}
          {state.kind === "working" && <p style={{ color: "#444", fontSize: 14 }}>{state.message}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <button
              onClick={() => handleVerify(state.request, state.effectiveAppId)}
              disabled={state.kind === "working"}
            >
              {state.kind === "retry" ? "Try again" : "Verify with passkey"}
            </button>
            <button
              onClick={() => handleRegister(state.request, state.effectiveAppId)}
              disabled={state.kind === "working"}
            >
              I don&apos;t have a Judges passkey yet — create one
            </button>
            <button onClick={() => handleCancel(state.request)} disabled={state.kind === "working"}>
              Cancel
            </button>
          </div>
        </>
      )}
    </main>
  );
}
