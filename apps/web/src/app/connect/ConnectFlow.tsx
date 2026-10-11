"use client";

import { useState } from "react";
import {
  namespacedAppId,
  parseConnectRequest,
  referrerMatchesOrigin,
  type ConnectMessage,
  type ConnectRequest,
} from "@judges/sdk";
import { proveMembershipInBrowser } from "@/lib/proveBrowser";
import { connectWallet } from "@/lib/wallet";

/**
 * The popup a third-party site opens to get a proof. It runs on Judges' own origin and hands back
 * only the finished proof. See packages/sdk/src/connect.ts for the threat model this page enforces.
 *
 * Redesign B: the identity secret is derived here in the browser from a wallet signature and never
 * leaves this window (nor reaches the Judges server). The wallet is connected inside the popup and
 * must match the wallet the requesting site asked the proof to be bound to.
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
    setState({ kind: "working", request, effectiveAppId, message: "Connecting your wallet…" });
    try {
      const { account, walletClient } = await connectWallet();
      if (account.toLowerCase() !== request.wallet.toLowerCase()) {
        setState({
          kind: "retry",
          request,
          effectiveAppId,
          message: `Connect the wallet the proof is for (${shortAddress(request.wallet)}). This browser connected ${shortAddress(account)}.`,
        });
        return;
      }

      setState({ kind: "working", request, effectiveAppId, message: "Sign the identity message, then proving in your browser…" });
      const result = await proveMembershipInBrowser({
        appId: effectiveAppId,
        wallet: request.wallet,
        assurance: request.assurance,
        contextHash: request.contextHash,
        signIdentityMessage: (message) => walletClient.signMessage({ account, message }),
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

      post(request, { type: "judges:proof", requestId: request.requestId, proof: { ...result, appId: effectiveAppId } });
      setState({ kind: "done" });
      window.close();
    } catch (err) {
      setState({
        kind: "retry",
        request,
        effectiveAppId,
        message: err instanceof Error ? err.message : "Verification failed.",
      });
    }
  }

  function handleCancel(request: ConnectRequest) {
    post(request, { type: "judges:cancel", requestId: request.requestId });
    window.close();
  }

  const working = state.kind === "working";

  return (
    <main className="page" style={{ maxWidth: "34rem" }}>
      <header className="site-header">
        <p className="caption label">Judges Protocol · Verification</p>
      </header>

      {state.kind === "blocked" && (
        <section className="sec" style={{ borderTop: 0 }}>
          <div className="sec-body">
            <h1>{state.title}</h1>
            <p>{state.detail}</p>
          </div>
        </section>
      )}

      {state.kind === "done" && (
        <section className="sec" style={{ borderTop: 0 }}>
          <div className="sec-body">
            <h1>Verified</h1>
            <p>You can close this window.</p>
          </div>
        </section>
      )}

      {(state.kind === "consent" || working || state.kind === "retry") && (
        <section className="sec" style={{ borderTop: 0 }}>
          <div className="sec-body">
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>Verify you&apos;re a real user</h1>
            <p>
              <strong className="mono" style={{ wordBreak: "break-all" }}>
                {state.request.requestingOrigin}
              </strong>{" "}
              is asking you to confirm with your wallet.
            </p>

            <div className="panel" style={{ margin: "1.5rem 0" }}>
              <div className="panel-head label">Verdict requested</div>
              <dl>
                <div>
                  <dt>Credited to</dt>
                  <dd className="mono">{shortAddress(state.request.wallet)}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd className="mono" style={{ wordBreak: "break-all" }}>
                    {state.effectiveAppId}
                  </dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>
                    {state.request.contextHash
                      ? "One specific action on that site"
                      : "Proves you're verified, not tied to a specific action"}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="muted" style={{ fontSize: "0.9375rem" }}>
              The site receives a zero-knowledge proof — not your keys, your identity, or which other
              apps you use. It can only use it within its own namespace.
            </p>

            {state.kind === "retry" && (
              <p className="error" style={{ overflowWrap: "anywhere" }}>
                {state.message}
              </p>
            )}
            {working && <p className="muted">{state.message}</p>}

            <div className="stack" style={{ marginTop: "1.5rem" }}>
              <button className="btn" onClick={() => handleVerify(state.request, state.effectiveAppId)} disabled={working}>
                {working ? "Working…" : state.kind === "retry" ? "Try again" : "Verify with wallet"}
              </button>
              <button className="btn" onClick={() => handleCancel(state.request)} disabled={working}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
