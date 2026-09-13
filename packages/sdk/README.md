# @judges/sdk

Verify that a wallet is backed by a real, user-verified passkey — privately, on Monad. Your app
gets a zero-knowledge proof and a nullifier, never the user's identity, passkey, or which other
apps they use.

```bash
npm install @judges/sdk
```

## Use it from your site

```ts
import { Judges } from "@judges/sdk";

const judges = new Judges({
  network: "monad-testnet",
  appId: "airdrop",                          // your app's id within your own namespace
  judgesOrigin: "https://judges.example",    // where Judges is deployed
});

button.addEventListener("click", async () => {
  // Opens a Judges popup, so call it directly in the click handler —
  // browsers block popups opened after an `await`.
  const proof = await judges.prove({ assurance: "user_verified", wallet: account });

  const result = await judges.verify(proof, { walletClient, verifierAddress, chain });
  if (result.valid) {
    // allow the action
  }
});
```

Passkeys are bound to the site that created them, so the passkey ceremony runs in a popup on the
Judges origin. Your page only ever receives the finished proof.

## Your app's namespace

Proofs requested from your site are scoped to your origin. With `appId: "airdrop"` on
`https://your.site`, the effective app id is:

```ts
import { namespacedAppId } from "@judges/sdk";

namespacedAppId("https://your.site", "airdrop"); // "https://your.site/airdrop"
```

Deploy your contract with `domain = hashToField("https://your.site/airdrop")` (Solidity:
`JudgesField.hashToField`). `proof.appId` returns the same string.

This is a security property, not a formality: no other site can spend your users' one-per-app
action, and you can't spend theirs. It needs no registration with Judges.

Use one canonical origin — `www.your.site` and `your.site` are different namespaces.

## Binding a specific action

Pass a `contextHash` your contract computes from its own arguments, so a proof can't be lifted and
pointed at a different action:

```ts
const contextHash = await dao.read.contextHashFor([proposalId, support]);
const proof = await judges.prove({ assurance: "user_verified", wallet: account, contextHash });
```

## Requirements

- **Call `prove()` from a user gesture** (a click). Otherwise the popup is blocked and `prove()`
  rejects with `JudgesPopupError` code `popup_blocked`.
- **Don't set `Cross-Origin-Opener-Policy: same-origin`** on the page that calls `prove()`. It
  severs the link to the popup, so the proof can't come back. `same-origin-allow-popups` is fine.
- The user needs a passkey registered with Judges. The popup offers to create one if they don't.

## Errors

`prove()` rejects with `JudgesPopupError`, whose `code` is one of:

| code | meaning |
|---|---|
| `popup_blocked` | not called from a user gesture |
| `cancelled` | the user pressed Cancel |
| `closed` | the user closed the window |
| `timeout` | no answer within `popupTimeoutMs` (default 5 minutes) |
| `failed` | the request was invalid |

A proof that comes back for a different app, wallet, or action than you asked for is rejected with
a plain `Error` naming the mismatched field.

## What Judges proves — and what it doesn't

It proves this wallet is backed by a passkey that passed local user verification (fingerprint,
face, or PIN). It does **not** prove a unique human: one person can hold several passkeys. It
raises the cost of sybil attacks; it doesn't eliminate them.

## License

MIT
