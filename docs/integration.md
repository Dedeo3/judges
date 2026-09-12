# Integration Guide

How an external app integrates `@judges/sdk` to verify that a wallet is backed by a real,
user-verified passkey — no identity disclosure, no KYC.

## Install

Inside this monorepo, any workspace package can depend on it directly:

```json
{
  "dependencies": {
    "@judges/sdk": "workspace:*"
  }
}
```

Outside the monorepo (a genuinely external integrator), once the package is published:

```bash
npm install @judges/sdk
```

## Usage

```ts
import { Judges } from "@judges/sdk";

const judges = new Judges({
  network: "monad-testnet",
  appId: "my-dapp", // domain-separates your app's nullifiers from every other app
});

// 1. Runs the WebAuthn ceremony in the browser, then asks the Judges backend to turn the
//    result into a ZK proof. The credential secret never leaves the server.
const proof = await judges.prove({ assurance: "user_verified" });

// 2. Submits the proof to JudgesVerifier.verify() on Monad using YOUR connected wallet client
//    (the SDK never holds a signer) and consumes the nullifier for your app's domain.
const result = await judges.verify(proof, {
  walletClient, // a viem WalletClient with a connected account
  verifierAddress: "0x...", // JudgesVerifier's deployed address (see docs/architecture.md)
  chain: monadTestnet, // a viem Chain definition for Monad Testnet
});

if (result.valid) {
  // allow the action — this wallet just proved a real, user-verified passkey authorized it,
  // and can't reuse the same proof again in your domain (nullifier consumed on-chain).
}
```

### Checking a nullifier without a wallet

```ts
const used = await judges.isNullifierUsed({
  domain: proof.domain,
  nullifier: proof.nullifier,
  verifierAddress: "0x...",
  chain: monadTestnet,
});
```

## What the SDK hides

- WebAuthn challenge creation and the browser ceremony (`@simplewebauthn/browser`)
- Server-side credential-secret derivation and ZK proof generation (never exposed to the client)
- ABI encoding of the Groth16 proof for `JudgesVerifier.verify()`
- Retries on transient API failures (network errors, 5xx — not 4xx, and not a WebAuthn ceremony
  itself, since a consumed challenge can't be resubmitted)
- Normalizing the on-chain result into `{ valid, txHash, domain, nullifier }`

## Requirements

- The app must be served from an origin the Judges backend's `RP_ID`/`RP_ORIGIN` recognizes (see
  `.env.example`) — WebAuthn is origin-scoped by design.
- `verifierAddress` and `chain` must point at a real deployed `JudgesVerifier` — see
  `docs/architecture.md` for the current Testnet/Mainnet addresses.

## Status (honest, as of Phase 6)

This has been verified: the SDK package compiles, typechecks, and the exact code shape above
matches what `apps/web`'s API routes (`/api/webauthn/auth/*`, `/api/prove`) and
`contracts/src/JudgesVerifier.sol` actually implement — traced end-to-end by reading the code,
not assumed.

**Not yet verified**: an actual `prove()` → `verify()` round trip against live infrastructure.
That needs three things this repo doesn't have yet: Neon/Upstash credentials provisioned (Phase
1/2's same open item), `JudgesVerifier` actually deployed to Monad Testnet (Phase 8), and a real
platform authenticator (Phase 1's same limitation — an automated browser has no Touch ID/Windows
Hello/phone to complete the ceremony with). Do this manually once those exist, before treating
this integration as production-ready.
