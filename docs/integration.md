# Integration Guide

How a third-party app integrates `@judges/sdk` to verify that a wallet is backed by a real,
user-verified passkey — no identity disclosure, no KYC, no registration with Judges.

A runnable version of everything below lives in [`examples/external-dapp`](../examples/external-dapp).

## Install

```bash
npm install @judges/sdk
```

Until the package is on npm, install a packed tarball — see `examples/external-dapp/README.md`.
Inside this monorepo, workspace packages use `"@judges/sdk": "workspace:*"`.

## How it works from your site

Passkeys are bound to the site that created them, so a Judges passkey can only be used on the
Judges origin. Your site therefore never runs the ceremony itself:

```text
your site                         Judges origin (popup)
─────────                         ─────────────────────
judges.prove()  ── window.open ─▶ /connect
                                    shows who's asking, which wallet, which app
                                    passkey ceremony (Touch ID / Windows Hello / phone)
                                    /api/prove → ZK proof
                ◀─ postMessage ──  proof only, to your exact origin
judges.verify() ─▶ JudgesVerifier on Monad
```

## Usage

```ts
import { Judges } from "@judges/sdk";

const judges = new Judges({
  network: "monad-testnet",
  appId: "airdrop",                        // your app's id within your own namespace
  judgesOrigin: "https://judges.example",  // where Judges is deployed
});

button.addEventListener("click", async () => {
  // Opens the popup — call it directly from the click handler, before any `await`,
  // or the browser blocks it.
  const proof = await judges.prove({
    assurance: "user_verified",
    wallet: account, // the proof is bound to this wallet
  });

  // Submits to JudgesVerifier.verify() using YOUR wallet client — the SDK never holds a signer.
  const result = await judges.verify(proof, {
    walletClient,
    verifierAddress: "0x...", // see docs/architecture.md
    chain: monadTestnet,
  });

  if (result.valid) {
    // allow the action — this wallet is backed by a user-verified passkey, and that passkey
    // can't be used for this action again in your app (nullifier consumed on-chain).
  }
});
```

## Your namespace, and deploying your contract

Every proof requested from your site is scoped to **your origin**. With `appId: "airdrop"` on
`https://your.site`, the effective app id is `https://your.site/airdrop`:

```ts
import { namespacedAppId } from "@judges/sdk";
namespacedAppId(window.location.origin, "airdrop"); // "https://your.site/airdrop"
```

Deploy your consuming contract with the domain derived from that full string:

```solidity
bytes32 domain = bytes32(JudgesField.hashToField("https://your.site/airdrop"));
```

`proof.appId` and `proof.domain` in the returned proof are exactly these values.

Why this exists: without it, any site could open the Judges popup, get a user to tap their passkey,
and spend that user's one-per-app action inside *your* airdrop or DAO. Namespacing by origin means a
site can only ever act within its own space — and it needs no allowlist or registration with Judges,
so nobody has to ask permission to integrate.

Pick one canonical origin. `https://www.your.site` and `https://your.site` are different namespaces,
so a user could act once on each.

## Binding a proof to a specific action

By default a proof is bound to the wallet but not to any particular action — fine for a plain "is
this a verified user" gate. When the action matters — *which* way someone voted, *which* agent they
registered — bind it, or a third party could lift the proof from the mempool and point it at a
different action.

Your contract defines the binding and exposes it as a view, so there's one definition and nothing
to reimplement in TypeScript:

```ts
const contextHash = await publicClient.readContract({
  address: daoAddress,
  abi: daoAbi,
  functionName: "contextHashFor",
  args: [proposalId, support],
});

const proof = await judges.prove({ assurance: "user_verified", wallet: account, contextHash });

await daoContract.write.vote([proposalId, support, proof.proof, proof.walletCommitment, proof.nullifier, proof.wallet]);
```

`contracts/src/demos/` has three worked examples: DAO voting, an AI agent registry, and a faucet.

### Checking a nullifier without a wallet

```ts
const used = await judges.isNullifierUsed({
  domain: proof.domain,
  nullifier: proof.nullifier,
  verifierAddress: "0x...",
  chain: monadTestnet,
});
```

## Requirements for your page

- **Call `prove()` from a user gesture.** Otherwise it rejects with `JudgesPopupError` code
  `popup_blocked`.
- **Don't send `Cross-Origin-Opener-Policy: same-origin`.** It severs your page's link to the popup
  and the proof can't come back. `same-origin-allow-popups` works.
- **No CORS setup is needed.** Your site never calls the Judges API directly.

## Errors

`prove()` rejects with `JudgesPopupError`:

| `code` | meaning |
|---|---|
| `popup_blocked` | not called from a user gesture |
| `cancelled` | the user pressed Cancel in the popup |
| `closed` | the user closed the popup |
| `timeout` | no answer within `popupTimeoutMs` (default 5 minutes) |
| `failed` | the request itself was invalid |

A proof that comes back for a different app, wallet, or action than requested is rejected with a
plain `Error` naming the field. Treat that as an integration bug, not a user error.

## What the SDK hides

- The popup handshake and its security checks (origin, window, request id)
- The WebAuthn ceremony (`@simplewebauthn/browser`)
- Server-side credential-secret derivation and ZK proof generation
- The wallet/action binding (`policyHash = sha256(contextHash ‖ wallet) mod FIELD_PRIME`)
- ABI encoding of the Groth16 proof
- Normalising the on-chain result into `{ valid, txHash, domain, nullifier }`

## Security model of the popup

Enforced by `packages/sdk/src/connect.ts` and `apps/web/src/app/connect/`:

| Attack | What stops it |
|---|---|
| A site spends a user's action inside another site's app | App id always namespaced under the requesting origin |
| A site claims another origin to borrow its namespace | Proof is posted with `targetOrigin` = the claimed origin, so the real opener never receives it |
| A site claims another origin to show a trusted name | Referrer must match the claimed origin, or the popup refuses |
| Another window forges a "proof" message | SDK accepts only the exact Judges origin, the exact popup window, and its own random request id |
| A proof for the wrong app/wallet/action slips through | SDK checks the returned proof against the request |
| The consent screen is framed under a decoy | `X-Frame-Options: DENY` and `frame-ancestors 'none'` on `/connect` |

Verified in a real Chrome engine by `examples/external-dapp/e2e/popup.e2e.mjs` (15 checks across two
origins). That test injects the proof message rather than running a real passkey ceremony, which
needs the deployed backend and a real authenticator.

## Status

**Verified**: the SDK installs from its packed tarball into a project outside this monorepo, and
typechecks there under TypeScript's strictest resolution (`NodeNext`, `strict`,
`skipLibCheck: false`); it imports in Node without crashing (so SSR frameworks can load it); and the
cross-origin popup flow and its attack cases pass in a real Chrome engine.

**Not yet verified**: a full `prove()` → `verify()` round trip on live infrastructure. That needs
the backend deployed with Upstash/Neon, `JudgesVerifier` on Monad Testnet, and a real platform
authenticator — see `docs/deployment.md`.
