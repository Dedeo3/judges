# Judges Protocol

> **Private human-verification infrastructure for Web3**
>
> Prove that a wallet is controlled by a real user-verified credential without exposing identity, biometrics, or KYC data.

Judges turns the WebAuthn/passkey authentication already available on modern devices into a reusable trust primitive for wallets, dApps, DAOs, AI agents, games, faucets, and other applications.

The project is designed for the Monad **Trust, Identity & AI Infrastructure** track. The track asks for protocol-level primitives that applications can build on, and explicitly highlights native P256 verification for WebAuthn as one of Monad's relevant building blocks. fileciteturn0file0L8-L18

---

## 1. The Problem

Web3 usually treats:

```text
1 wallet = 1 user
```

That assumption is weak.

A user can create many wallets cheaply, which creates Sybil problems across:

- DAO voting
- token distribution
- airdrops
- AI-agent registries
- reputation systems
- marketplaces
- social applications
- anti-abuse systems

Existing identity solutions often introduce a different problem: applications become dependent on a centralized identity issuer or collect highly sensitive information.

Judges takes a different approach:

```text
Existing user device
       |
       v
   Passkey / WebAuthn
       |
       v
 User verification
       |
       v
 Privacy-preserving proof
       |
       v
    Monad
       |
       v
 Any application
```

No passport upload.  
No biometric database.  
No application-specific KYC database.  
No requirement for a new identity hardware ecosystem.

---

## 2. Core Idea

Judges is **not another wallet** and is **not a consumer identity app**.

It is a developer-facing verification layer.

A developer should be able to write:

```ts
const proof = await judges.prove({ assurance: "user_verified", wallet });
const result = await judges.verify(proof, { walletClient, verifierAddress, chain });

if (result.valid) {
  // allow action
}
```

An onchain application can consume the proof directly, and gets sybil resistance without keeping
any per-user records of its own — a reused credential simply reverts:

```solidity
judges.verify(proof, walletCommitment, domain, nullifier, contextHashFor(proposalId, support), wallet);
```

The goal is to hide the complexity of:

```text
WebAuthn
+ P-256 parsing
+ challenge binding
+ replay protection
+ proof generation
+ nullifiers
+ onchain verification
```

behind a simple SDK/API.

---

## 3. Important Security Model

### What Judges can prove

The primary MVP claim is:

> **This wallet is backed by a user-controlled WebAuthn credential that successfully completed the required user-verification ceremony.**

Depending on device/authenticator policy, Judges can additionally require stronger authenticator properties, including device-bound or hardware-backed credentials where the platform exposes sufficient assurance.

### What Judges cannot prove by passkey alone

A passkey does **not inherently prove**:

```text
1 credential = 1 human
```

Modern passkeys may be device-bound or synced across devices. FIDO explicitly distinguishes these two models. citeturn822650search0turn822650search2

Therefore Judges uses three assurance concepts:

| Assurance | Meaning |
|---|---|
| `possession` | The user controls the credential and can produce a valid signature. |
| `user_verified` | The WebAuthn ceremony required local user verification. |
| `unique` | The application has a domain-specific uniqueness policy. This is **not** magically derived from WebAuthn alone. |

This distinction prevents Judges from making an unjustified "one human = one credential" claim.

---

## 4. Why WebAuthn / Passkeys?

WebAuthn is a public-key authentication standard. It creates credentials scoped to a relying party, and the user agent mediates access to authenticators. User verification is performed by the authenticator/device rather than by the application collecting the biometric itself. citeturn822650search1turn822650search3

FIDO describes passkeys as cryptographic credentials that may be stored as synced passkeys or device-bound passkeys. Biometric information, when used, stays on the user's device and is not sent to the relying party. citeturn822650search0turn822650search4

Judges therefore uses the platform security model that users already have instead of introducing a new biometric collection system.

---

## 5. Why Monad?

Monad is a first-class fit for Judges because native support for **EIP-7951 P256VERIFY** makes P-256 verification available at the protocol level. Monad's official changelog records P256VERIFY activation in the MONAD_FOUR revision. citeturn211832search0

Current documented networks include:

| Network | Chain ID |
|---|---:|
| Monad Mainnet | `143` |
| Monad Testnet | `10143` |

For the hackathon MVP, deployment should target **Monad Testnet first**, with Mainnet deployment added once the demo is stable.

### The key Monad-specific argument

Without Monad:

```text
WebAuthn P-256
      |
      v
application-specific cryptography
```

With Judges on Monad:

```text
WebAuthn P-256
      |
      v
native P256VERIFY
      |
      v
onchain trust primitive
```

This makes Monad part of the architecture instead of merely the deployment destination.

### Where P256VERIFY actually sits in the shipped MVP

Being precise, because this is the claim most worth getting right:

`MonadP256Adapter.sol` wraps the native precompile at `0x0100` and is **deployed and verified
against live Monad Testnet** — a real secp256r1 keypair, signed off-chain, accepted on-chain
(`contracts/test/MonadP256Adapter.t.sol`). Verifying it required working around a real gap:
Foundry's `--fork-url` replays cached state through its own local EVM, which has no knowledge of
Monad's custom precompiles, so a naive fork test reports `false` for a perfectly valid signature.
The tests instead send `eth_call` to the real node.

In the proof-of-personhood flow, however, the passkey signature is verified **once, off-chain,
during the WebAuthn ceremony**, and `JudgesVerifier.verify()` then checks a ZK proof that the
credential's secret produces the presented commitment and nullifier. The precompile is not on
that path. This is the Mode A choice described in §8, and it is deliberate — see §8.1 for the
measured reasoning.

The honest framing: Monad's native P-256 support is what makes an on-chain passkey trust
primitive *practical at all*, and Judges ships a tested adapter for it. The proof-of-personhood
flow reaches for ZK instead because of a privacy constraint, not a technical limitation.

---

## 6. Product Architecture

```text
                         ┌──────────────────────┐
                         │      dApps / AI      │
                         │ DAO / Game / DeFi    │
                         └──────────┬───────────┘
                                    │
                              Judges SDK
                                    │
                         ┌──────────▼───────────┐
                         │   Judges API Layer    │
                         │ policy + challenge    │
                         │ registry + sessions   │
                         └──────────┬───────────┘
                                    │
                           WebAuthn assertion
                                    │
                    ┌───────────────▼──────────────┐
                    │       User Device             │
                    │ passkey / platform auth       │
                    │ local user verification       │
                    └───────────────┬──────────────┘
                                    │
                          P-256 signature
                                    │
                    ┌───────────────▼──────────────┐
                    │       Proof Layer             │
                    │ commitment + nullifier       │
                    │ optional ZK hiding            │
                    └───────────────┬──────────────┘
                                    │
                              proof / attestation
                                    │
                    ┌───────────────▼──────────────┐
                    │     JudgesVerifier.sol        │
                    │ Groth16 proof verification    │
                    │ wallet/action binding         │
                    │ nullifier / replay protection │
                    └───────────────┬──────────────┘
                                    │
                                  Monad
```

The P-256 signature itself is verified during the WebAuthn ceremony in the API layer, not by
`JudgesVerifier` — see §5 and §8.1. `MonadP256Adapter.sol` exposes Monad's native `P256VERIFY`
as a separate, deployed primitive for flows that need a live signature check per transaction
(a passkey-controlled smart account being the obvious one).

---

## 7. End-to-End Flow

### 7.1 Enrollment

The user chooses **Register with passkey**.

1. Judges backend creates a random registration challenge.
2. Browser/mobile requests WebAuthn credential creation.
3. The platform authenticator creates a credential.
4. Judges receives the public credential information required for future verification.
5. Judges associates the credential with a wallet commitment.
6. The credential becomes eligible for verification under the application's selected policy.

Conceptually:

```text
random challenge
      |
      v
navigator.credentials.create()
      |
      v
platform authenticator
      |
      +---- private key stays with credential provider/authenticator
      |
      +---- public credential data -> Judges
```

WebAuthn credentials are scoped to the relying party and are designed around public-key authentication rather than shared passwords. citeturn822650search1turn822650search4

---

### 7.2 Authentication / Proof Request

The application asks Judges to verify a wallet.

```text
Application
    |
    | verify(wallet, policy)
    v
Judges API
    |
    | create challenge
    v
WebAuthn client
    |
    | user unlocks device / authenticator
    v
signed assertion
```

The challenge must be bound to the exact action being authorized.

For example:

```text
challenge = H(
    judgesDomain ||
    appId ||
    wallet ||
    action ||
    nonce ||
    expiry
)
```

This prevents an attacker from replaying a valid authentication response in another application or for another action.

---

### 7.3 WebAuthn Validation

The server validates the complete WebAuthn ceremony, including the relying-party context and the challenge.

The implementation should reject:

- wrong challenge
- wrong RP ID / origin
- invalid client data type
- invalid authenticator data
- invalid signature
- unexpected user-verification state
- stale challenge
- replayed challenge
- malformed credential data

Do **not** treat a raw P-256 signature as sufficient proof. The signed WebAuthn context matters.

---

### 7.4 Commitment

Judges derives a privacy-preserving credential commitment.

Example conceptual form:

```text
commitment = Poseidon(
    credential_secret,
    credential_public_key,
    domain_separator
)
```

The exact commitment construction must be frozen before production and covered by tests.

The important property is that the application should not need the user's real-world identity.

---

### 7.5 Domain-Separated Nullifier

To prevent duplicate registration or repeated use inside a chosen application domain, Judges derives a nullifier.

Conceptually:

```text
nullifier = H(
    secret |
    applicationId |
    epoch
)
```

This provides a configurable privacy boundary.

Example:

```text
DAO A      -> nullifier A
DAO B      -> nullifier B
Game X     -> nullifier X
```

The intention is to avoid giving every application one universal public identifier that would trivially enable cross-application correlation.

**Important:** a nullifier prevents reuse of the same underlying secret within the chosen domain. It does not prove that a person cannot create multiple independent credentials.

---

## 8. Zero-Knowledge Layer

Judges uses ZK where it creates a real privacy benefit:

> prove that a valid credential satisfies a set of constraints without publishing the underlying credential/key material.

### Public inputs

A possible MVP circuit exposes only:

```text
applicationId
wallet commitment
nullifier
policy hash
```

### Private witness

```text
credential public key
WebAuthn challenge
assertion fields
credential secret / derived secret
signature
credential metadata
```

### Circuit statement

Conceptually:

```text
I know a credential and a valid WebAuthn assertion
such that:

1. the assertion signs the correct challenge;
2. the challenge is bound to this application;
3. the credential satisfies the configured policy;
4. the nullifier is correctly derived;
5. the resulting commitment matches the public commitment.
```

### Practical implementation strategy

There are two implementation modes.

#### Mode A - Hackathon MVP

Use direct WebAuthn verification plus onchain P256 verification for the critical signature path, while using ZK for the privacy-sensitive relationship between credential material, commitment, and nullifier.

Advantages:

- much easier to demo reliably;
- directly demonstrates Monad P256VERIFY;
- keeps the cryptographic architecture understandable;
- avoids making the entire WebAuthn stack depend on a very heavy ZK circuit.

#### Mode B - Full private WebAuthn proof

Move P-256 / WebAuthn signature verification itself into the ZK circuit.

A proof-of-concept project exists for WebAuthn P-256 Circom verification, demonstrating that this is technically possible, but it explicitly warns that the circuits are unaudited and not intended as a production-grade library. citeturn919558search2turn919558search5

This makes Mode B suitable as an experimental / advanced layer, not as the only security-critical dependency for a hackathon MVP.

### 8.1 Why the signature check stays off the onchain path — with numbers

The obvious objection to Mode A is that it leaves Monad's `P256VERIFY` off the hot path. There is
a third option between A and B: keep the ZK proof, and *additionally* verify the raw WebAuthn
assertion on-chain via the precompile. We built a measurement spike for exactly that question
(`contracts/experiments/WebAuthnOnchainSpike.sol`) rather than arguing about it.

On-chain WebAuthn verification is not one precompile call. The signature covers
`sha256(authenticatorData ‖ sha256(clientDataJSON))`, and none of the surrounding checks are
optional: `rpIdHash` must match or a signature from another site is accepted, the UV flag must be
set or "user verified" means nothing, and the challenge embedded in `clientDataJSON` must match
or any past assertion replays — which is why base64url encoding ends up on-chain.

Measured, with a 37-byte `authenticatorData` and a 138-byte `clientDataJSON`:

| | Gas on Monad |
|---|---:|
| Current `JudgesVerifier.verify()` (ZK, signature checked off-chain) | ~1,130,000 |
| Adding on-chain WebAuthn + `P256VERIFY` on top | ~1,166,000 (**+3.5%**) |
| No ZK at all — passkey verified purely on-chain | ~88,000 |

Two things fall out of this:

**Gas is not the argument.** Adding the precompile costs about 39,000 gas — under 4%. What
dominates is Groth16 verification, because Monad reprices `ecPairing` and `ecMul` at **5×**
Ethereum: the 5 `ecMul` + 5 `ecAdd` + one 4-pair pairing in the generated verifier come to
1,056,500 gas on Monad versus 211,750 on Ethereum. Anyone benchmarking a ZK verifier on a local
Foundry EVM is reading Ethereum prices and will be surprised on deployment.

**The real cost is privacy.** `P256VERIFY` needs the credential's public key as raw coordinates,
so the public key must appear in calldata. That key is a stable, unique, permanent identifier for
the passkey — putting it on-chain makes every action by that credential linkable across every
domain, which is precisely the "one universal public identifier" §7.5 exists to avoid. The
authenticator's monotonic `signCount` links actions on its own, even without the key. There is no
partial mitigation: you cannot hide a value from a precompile that requires it. Keeping
unlinkability while verifying on-chain would mean a separate passkey per application, giving up
"one credential, many apps".

Stated plainly: **the ZK layer charges roughly 1.04M gas per action, and what it buys is hiding
the credential public key.** That is a deliberate trade, not an oversight — and the middle option
is the worst of the three, paying the full ZK cost while forfeiting the property the ZK is there
to provide.

---

## 9. Smart Contract Design

### 9.1 JudgesVerifier

Responsibilities:

- verify the Groth16 membership proof;
- derive and enforce the wallet/action binding (the circuit's `policyHash` public input);
- enforce nullifier uniqueness via `NullifierRegistry`;
- expose verification result to consuming applications.

The P-256 signature is not re-verified here — see §5 and §8.1.

As shipped:

```solidity
interface IJudgesVerifier {
    /// @param proof        ABI-encoded (uint256[2], uint256[2][2], uint256[2]) Groth16 calldata.
    /// @param contextHash  App-defined action binding. A DAO folds in (proposalId, support); a
    ///                     faucet its claim tag. The consuming contract recomputes this from its
    ///                     own call arguments, so a stolen proof can't be redirected.
    /// @param wallet       The wallet the proof is bound to. Consumers must credit *this*
    ///                     address, not msg.sender.
    function verify(
        bytes calldata proof,
        bytes32 walletCommitment,
        bytes32 domain,
        bytes32 nullifier,
        bytes32 contextHash,
        address wallet
    ) external returns (bool valid);

    function isNullifierUsed(bytes32 domain, bytes32 nullifier)
        external
        view
        returns (bool);

    /// The policyHash `verify` will require for this binding:
    /// sha256(contextHash ‖ wallet) mod FIELD_PRIME.
    function policyHashFor(bytes32 contextHash, address wallet)
        external
        pure
        returns (bytes32);
}
```

Two deviations from the original sketch, both deliberate:

`policyHash` is **derived inside the contract** from `contextHash` and `wallet` rather than
accepted as a parameter. Accepting it would let a caller assert any binding they liked, which
defeats the point — see §7.2 and §19.

`VerificationPolicy` is not implemented. There is no policy engine yet (§26 is the roadmap for
one), so an assurance level stands in as the `contextHash` default. Shipping a struct that
nothing enforces would be worse than leaving it out.

---

### 9.2 P256 Precompile Adapter

Keep Monad-specific code isolated. As shipped:

```text
contracts/src/
  libraries/P256Verifier.sol      # staticcall + EIP-7951 calldata layout, chain-agnostic
  interfaces/IP256Verifier.sol
  MonadP256Adapter.sol            # the one file holding Monad's 0x0100 address
```

The adapter encapsulates the precompile call so the rest of the system does not depend directly
on low-level calldata encoding — and so porting to another EIP-7951 chain touches one file.

`JudgesRegistry.sol` was **not built**: its apparent job — credential, application and binding
records — is served by the Postgres tables in §13, which is where that data has to live anyway
because it is queried off-chain. Nothing was deployed in its place.

Confirmed at implementation time: address `0x0100`, 6,900 gas, 160-byte input of
`hash ‖ r ‖ s ‖ qx ‖ qy`, output 32 bytes of `1` on success and empty bytes otherwise.

The Monad documentation currently records P256VERIFY as an enabled protocol feature. citeturn211832search0

---

### 9.3 Nullifier Registry

```solidity
mapping(bytes32 => mapping(bytes32 => bool)) public usedNullifier;
```

Conceptually:

```text
usedNullifier[domain][nullifier] == true
```

prevents the same proof identity from being reused in the same domain.

Emit an event:

```solidity
event HumanVerified(
    bytes32 indexed domain,
    bytes32 indexed nullifier,
    address indexed wallet
);
```

Be careful with the event design: do not accidentally emit the sensitive credential identifier you were trying to hide.

---

## 10. Wallet Binding

Judges should not assume that the WebAuthn credential itself is an Ethereum account.

Instead, explicitly bind:

```text
WebAuthn credential
        |
        v
Judges commitment
        |
        v
wallet address / smart account
```

A binding ceremony can be:

1. user signs wallet-binding challenge with wallet;
2. user completes WebAuthn ceremony;
3. server/client constructs a binding statement;
4. Judges records the resulting commitment.

Conceptual statement:

```text
I control wallet W
and I control credential C
and I am authorizing this binding
for application domain D.
```

The exact binding protocol must prevent replay and cross-domain reuse.

---

## 11. SDK

The SDK is a major part of the product because the rubric evaluates developer usability and explicitly emphasizes clear interfaces/API design. fileciteturn0file0L29-L33

### Example

```ts
import { Judges } from "@judges/sdk";

const judges = new Judges({
  network: "monad-testnet",
  appId: "my-dapp" // domain-separates your nullifiers from every other app
});

// Runs the passkey ceremony in the browser, then has the backend turn it into a ZK proof.
// `wallet` is required: the proof is bound to it, so a proof lifted from the mempool is
// useless to anyone else (§7.2).
const proof = await judges.prove({
  assurance: "user_verified",
  wallet: account
});

// Submits to JudgesVerifier on Monad with the caller's own wallet client — the SDK never
// holds a signer.
const result = await judges.verify(proof, {
  walletClient,
  verifierAddress,
  chain: monadTestnet
});

console.log(result); // { valid: true, txHash: "0x...", domain: "0x...", nullifier: "0x..." }
```

Binding a specific action is one extra argument, and the binding is defined by the consuming
contract so there is no TypeScript copy of the hashing to drift:

```ts
const contextHash = await dao.read.contextHashFor([proposalId, support]);
const proof = await judges.prove({ assurance: "user_verified", wallet: account, contextHash });
```

The SDK hides:

- challenge creation;
- WebAuthn browser calls;
- serialization/parsing;
- proof preparation (server-side — the credential secret never reaches the client);
- the wallet/action binding derivation;
- RPC interaction;
- retry handling (transient 5xx/429 only — never a consumed WebAuthn challenge);
- verification result normalization.

`getPolicy()` is not implemented: there is no policy engine to query yet (§26).

---

## 12. API Design

As shipped, these are Next.js route handlers under `apps/web/src/app/api/**`, deployed as
serverless functions — there is no standalone API server (§13).

### Passkey registration

```http
POST /api/webauthn/register/options    -> { sessionId, options }
POST /api/webauthn/register/verify     -> { verified, credentialId, userId }
```

### Passkey authentication

```http
POST /api/webauthn/auth/options        -> { sessionId, options }
POST /api/webauthn/auth/verify         -> { verified, credentialId, userId, userVerified }
```

### Wallet binding

Two steps by necessity: the client needs the binding statement before it can sign it.

```http
POST /api/bindings/challenge           -> { sessionId, options, message }
POST /api/bindings/verify              -> { verified, wallet, credentialId, domain }
```

### Generate a membership proof

```http
POST /api/prove
```

Request:

```json
{
  "sessionId": "...",
  "response": { "...": "WebAuthn assertion" },
  "appId": "my-dapp",
  "assurance": "user_verified",
  "wallet": "0x...",
  "contextHash": "0x..."
}
```

Response:

```json
{
  "verified": true,
  "proof": "0x...",
  "walletCommitment": "0x...",
  "nullifier": "0x...",
  "domain": "0x...",
  "contextHash": "0x...",
  "wallet": "0x..."
}
```

Two design points worth stating:

This endpoint takes a **live WebAuthn assertion, never a bare `credentialId`**. It consumes the
same single-use challenge as `/api/webauthn/auth/verify`, so a caller cannot request a proof for
a credential they do not control.

It returns the **binding inputs, not the derived `policyHash`**. The contract derives that
itself; handing it back would invite a caller to pass it along as though it were authoritative.

Verification itself has no API endpoint — it happens on-chain, via
`JudgesVerifier.verify()` from the caller's own wallet (§11).

---

## 13. Backend

### Stack as shipped

- **TypeScript**
- **Next.js route handlers** deployed as serverless functions on Vercel — not a standalone
  Fastify/Express process. Frontend and backend are one deployable unit, which is what makes the
  whole thing fit on free tiers with no server to keep alive.
- **Neon** (serverless Postgres) via its HTTP driver, using the pooled connection string
- **Upstash** (Redis over REST) for challenges — a connection-per-invocation TCP Redis client is
  the wrong shape for serverless
- `@simplewebauthn/server` for ceremony validation
- `snarkjs` for proof generation, `viem` for EVM RPC
- Docker Compose for local Postgres/Redis only

One consequence of serverless worth stating: anything that waits on a Monad transaction
confirmation happens client-side via the SDK, not inside a function, because functions have an
execution time cap. That is also the correct shape for a dApp — the user's wallet signs, not the
backend.

### Responsibilities

```text
Backend
├── session management
├── random challenge generation
├── replay protection
├── WebAuthn validation
├── credential registry
├── application policies
├── proof orchestration
├── Monad RPC integration
└── SDK/API responses
```

### Data model

#### credentials

```text
id
credential_id
credential_public_key
rp_id
sign_count
transports
created_at
status
```

#### applications

```text
id
name
domain
policy_hash
created_at
```

#### bindings

```text
id
credential_id      -> credentials(id)
wallet_address
domain
created_at
revoked_at
```

Two partial unique indexes on `(domain, credential_id)` and `(domain, wallet_address)`, both
`where revoked_at is null`, make "one active binding per domain" a database invariant rather than
an application-level check that a concurrent request could slip past.

Verification sessions are **not** a Postgres table: they are short-TTL Redis keys, consumed with
`GETDEL` so a challenge is single-use atomically. Storing them in Postgres would mean writing a
row per ceremony and then needing to expire it.

Do not store raw biometric information.

Do not store private credential keys.

Do not store unnecessary identity information.

One secret does need care: `JUDGES_DOMAIN_SECRET`, from which every credential secret,
commitment, and nullifier is derived. It is effectively permanent — rotating it invalidates every
registered passkey and orphans every nullifier already consumed on-chain.

---

## 14. Frontend / Demo App

Recommended stack:

- Next.js
- TypeScript
- Tailwind CSS
- wagmi
- viem
- WebAuthn browser API
- optional RainbowKit / wallet connector

The demo should show the product as **infrastructure**, not as a beautiful dashboard with no technical substance.

Pages as shipped:

```text
/demo
  register a passkey, bind a wallet, prove membership via the SDK

/demo/dao
  one credential, one vote per proposal

/demo/agent
  register an AI agent only under a verified credential

/demo/faucet
  one claim per credential
```

Each demo page reads its action binding from its own contract's `contextHashFor(...)` view
function rather than recomputing the hash in TypeScript, and links the resulting transaction on
the Monad explorer. A landing page and a `/developers` page are not built; `docs/integration.md`
serves the developer-facing role for now.

---

## 15. Three Applications for the Demo

The strongest demo is not a single "verify" button.

### A. Sybil-resistant DAO

```text
Connect wallet
       |
       v
Verify with Judges
       |
       v
Vote
       |
       v
Nullifier checked
       |
       v
Vote accepted
```

A second attempt using the same domain nullifier is rejected.

---

### B. AI Agent Registry

An AI agent creator must prove that a real user-controlled credential authorized the registration.

```text
Create AI Agent
       |
       v
Judges verification
       |
       v
AgentRegistry.sol
       |
       v
Agent registered
```

This makes Judges directly relevant to the AI-native trust layer in the track.

---

### C. Sybil-resistant Faucet / Airdrop

```text
Claim
  |
  v
Judges proof
  |
  v
nullifier check
  |
  +---- used -> reject
  |
  +---- unused -> claim
```

This provides the clearest visual demonstration of why the primitive matters.

---

## 16. Repository Structure

As shipped:

```text
judges/
├── apps/
│   └── web/                       # Next.js: demo pages AND the backend, as API routes
│       ├── src/app/api/           #   webauthn/*, bindings/*, prove — Vercel Functions
│       ├── src/app/demo/          #   /demo plus dao, agent, faucet
│       ├── src/lib/               #   stores, prove orchestration, chain/address config
│       └── migrations/
│
├── packages/
│   ├── sdk/                       # @judges/sdk — browser-facing
│   ├── webauthn/                  # ceremony helpers (server-only)
│   ├── crypto/                    # field, commitment, nullifier, policy binding
│   └── types/
│
├── contracts/
│   ├── src/
│   │   ├── JudgesVerifier.sol
│   │   ├── JudgesGroth16Verifier.sol   # generated from the trusted setup, committed
│   │   ├── NullifierRegistry.sol
│   │   ├── MonadP256Adapter.sol
│   │   ├── libraries/                  # P256Verifier, JudgesField
│   │   ├── interfaces/
│   │   └── demos/                      # the three §15 integrations
│   ├── script/DeployJudges.s.sol
│   ├── experiments/                    # measurement spikes, not deployed
│   └── test/
│
├── prover/
│   ├── circuits/judges_membership.circom
│   ├── scripts/                        # build, trusted setup, fixture generators
│   └── build/                          # frozen zkey + wasm committed; ceremony files ignored
│
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── integration.md
│   ├── protocol.md
│   └── security.md
│
├── docker/                        # local Postgres/Redis only
├── scripts/
├── IMPLEMENTATION.md              # phase-by-phase build log and open items
└── package.json                   # pnpm workspace root
```

Differences from the original plan, each deliberate: there is no `server/` (the backend is
`apps/web`'s API routes, §13), no `apps/playground` (the `/demo` routes cover it), and no
`JudgesRegistry.sol` (§9.2).

A note on what is committed under `prover/build/`: the final proving key and wasm are checked in
on purpose, because `JudgesGroth16Verifier.sol` has that exact key's verification data baked in.
A fresh clone must be able to produce proofs the deployed verifier accepts; re-running the
trusted setup would generate a different, incompatible key. The ceremony intermediates are
gitignored.

---

## 17. Technology Choices

| Layer | Shipped choice | Why |
|---|---|---|
| Frontend | Next.js 16 + TypeScript | Fast demo + ecosystem |
| Wallet | raw EIP-1193 + viem | One account, one chain — a connector library would be a large dependency for that. The SDK accepts any viem `WalletClient`, so integrators bring their own stack. |
| WebAuthn | `@simplewebauthn/server` + `/browser`, discoverable credentials | Standards-based; resident keys mean authentication needs no username lookup |
| Backend | Next.js API routes (Vercel Functions) | Same deployable unit as the frontend — no server to keep alive, fits free tiers |
| DB | Neon (serverless Postgres, HTTP driver) | Credential/app/binding records; pooled string for serverless |
| Cache | Upstash (Redis over REST) | Challenge expiry + single-use via `GETDEL`; a TCP client is the wrong shape per-invocation |
| ZK | Circom 2.2.3 + snarkjs (Groth16) | Practical hackathon path; `poseidon-lite` matches circomlib in TS |
| Contract | Solidity 0.8.26 + Foundry | Monad EVM environment |
| Chain | Monad Testnet (`10143`) | Fast live demo; chain definitions from viem |
| RPC | viem | Typed EVM client |
| Tests | Foundry + Vitest | 53 Foundry, 22 Vitest, 4 ZK acceptance checks |
| Infra | Vercel + Docker (local only) | Reproducible local setup, zero-ops deploy |

### ZK technology note

P-256 inside ZK is significantly more expensive than native P-256 verification. Existing Circom P-256/WebAuthn proof-of-concepts demonstrate feasibility but also show substantial resource costs and lack of production audit. citeturn919558search2turn919558search5

Therefore the hackathon architecture should prioritize a reliable P256 + privacy-proof MVP over an oversized all-in-ZK circuit that cannot be demonstrated live.

---

## 18. Implementation Plan

> **Status**: Phases 1–8 are built, with the acceptance test for each one recorded against actual
> runs. See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the phase-by-phase log — including the
> things that turned out differently from this plan, and the deviations' reasoning — and
> [`docs/deployment.md`](docs/deployment.md) for what remains: the deploy itself, the datastores,
> the demo video, and an external integrator. The plan below is kept as written for comparison.

### Phase 1 - WebAuthn foundation

Goal: a working passkey login.

Implement:

```text
registration
   -> credential storage
   -> authentication
   -> userVerification enforcement
```

Acceptance test:

```text
Phone biometric/PIN
        |
        v
WebAuthn assertion
        |
        v
server: valid
```

---

### Phase 2 - Wallet binding

Implement:

```text
wallet challenge
+
WebAuthn challenge
+
anti-replay nonce
```

Acceptance test:

```text
wallet A + credential A = valid
wallet B + credential A = rejected unless explicitly re-bound
```

---

### Phase 3 - Monad P256 verification

Implement the Solidity adapter for the native P256 verification primitive.

Acceptance test:

```text
valid P256 signature -> true
modified message      -> false
modified r/s          -> false
wrong key             -> false
```

Monad officially records P256VERIFY as an active protocol feature. citeturn211832search0

---

### Phase 4 - Nullifier layer

Implement:

```text
secret
  |
  + app/domain
  |
  + epoch
  v
nullifier
```

Acceptance test:

```text
same domain + same credential -> same nullifier
same domain + used nullifier  -> rejected
other domain                  -> different nullifier
```

---

### Phase 5 - ZK privacy layer

Start with:

```text
commitment
nullifier derivation
policy constraints
```

Do not begin by building a full WebAuthn P-256 circuit unless the baseline architecture is already stable.

Acceptance test:

```text
correct witness -> proof verifies
changed secret  -> proof fails
changed domain  -> proof fails
changed policy  -> proof fails
```

---

### Phase 6 - SDK

Ship:

```ts
Judges.register()
Judges.prove()
Judges.verify()
Judges.getPolicy()
```

The developer experience should be demonstrably easier than implementing WebAuthn + P256 + replay protection + nullifiers independently.

---

### Phase 7 - Demo integrations

Build three small integrations:

```text
DAO voting
AI agent registry
Sybil-resistant faucet
```

Each should use the same Judges SDK.

---

### Phase 8 - Testnet deployment

Deploy:

```text
JudgesVerifier
JudgesRegistry
NullifierRegistry
```

to Monad Testnet.

The hackathon deliverables require a live product link on Monad Mainnet or Testnet with clear access instructions. fileciteturn0file0L41-L53

---

## 19. Security Requirements

### Challenge security

Every authentication session needs:

- cryptographically random challenge;
- short expiration;
- one-time consumption;
- exact application/domain binding;
- wallet/action binding where applicable.

### WebAuthn validation

Must validate:

```text
origin
rpId
challenge
clientDataJSON
authenticatorData
signature
user verification flags
signature counter where applicable
```

Do not accept a browser-provided `verified: true` flag without independently validating the underlying assertion.

### Nullifier security

Nullifiers must be:

- domain separated;
- deterministic for the intended privacy domain;
- unlinkable across domains when unlinkability is a stated goal;
- stored onchain only when necessary;
- impossible to choose arbitrarily by the user.

### Secret handling

Never log:

```text
private credential keys
raw authentication secrets
unnecessary identity data
```

Use secret-safe logging and redact authentication payloads in production logs.

---

## 20. What the MVP should NOT build

Avoid scope explosion.

Do **not** build:

- your own biometric system;
- face-recognition backend;
- KYC provider;
- custom cryptographic curve;
- proprietary authentication standard;
- a full social network;
- a full DAO;
- a full AI platform.

Judges wins as infrastructure.

---

## 21. The Killer Demo

The technical demo should fit into approximately three minutes because the official deliverable limits the technical demo video to three minutes and requires a live working product rather than slides/code walkthrough. fileciteturn0file0L43-L48

### Scene 1 - 0:00-0:20

Show:

```text
Connect Wallet
        |
        v
Verify with Passkey
```

User completes device verification.

### Scene 2 - 0:20-0:50

Show:

```text
WebAuthn ✓
P-256 ✓
User Verified ✓
Nullifier ✓
Proof ✓
```

### Scene 3 - 0:50-1:20

Vote in a DAO.

### Scene 4 - 1:20-1:45

Attempt a duplicate action.

```text
Rejected
Reason: nullifier already used
```

### Scene 5 - 1:45-2:15

Open the SDK example:

```ts
const proof = await judges.prove();
await judges.verify(proof);
```

### Scene 6 - 2:15-2:40

Show the Monad explorer / transaction result.

### Scene 7 - 2:40-3:00

End on:

> **One simple verification API. Zero biometric database. Privacy-preserving by design. Built around native P-256 verification on Monad.**

---

## 22. Product Positioning

### One-liner

> **Judges is the trust layer that lets Web3 applications verify user-controlled passkeys without requiring identity disclosure.**

### Developer pitch

> **Don't build WebAuthn, P-256 verification, replay protection, nullifiers, and privacy logic from scratch. Plug into Judges.**

### User pitch

> **Prove you're verified without giving every app your identity.**

### Protocol pitch

> **Judges turns device-native authentication into a composable trust primitive for the AI-native internet.**

---

## 23. Why Judges Is Different

| Traditional approach | Judges |
|---|---|
| Password / OTP | WebAuthn passkey |
| Identity database | Credential-based verification |
| KYC upload | No KYC required for core flow |
| Biometrics sent to server | Local device verification |
| One centralized issuer | Application-level verification |
| Wallet address as identity | Privacy-preserving commitment |
| Same identifier everywhere | Domain-separated nullifiers |
| Standalone app | SDK / protocol primitive |

FIDO's standards explicitly emphasize that biometric information used for passkeys remains on the user's device, and WebAuthn is built around scoped public-key credentials. citeturn822650search1turn822650search4

---

## 24. Track Fit

The official track asks for trust/identity/data infrastructure that is privacy-preserving and cannot be captured by one platform. It also evaluates technical execution, developer experience, originality, market readiness, and traction. fileciteturn0file0L16-L40

Judges maps to the rubric as follows:

| Rubric | Judges strategy |
|---|---|
| Technical Execution 20% | real WebAuthn + P256 verification + proof + nullifier |
| Design & Craft 20% | simple SDK/API and clear docs |
| Originality 15% | device-native trust primitive instead of centralized identity |
| Founder & Market Readiness 25% | DAO / AI agent / faucet integrations |
| Traction 20% | external developer integration during hackathon |

The single most valuable traction milestone is:

> **At least one developer or hackathon team integrates Judges into their own application.**

The official rubric explicitly cites developer interest, including another team integrating the primitive during the hackathon, as evidence for traction. fileciteturn0file0L37-L40

---

## 25. Roadmap After the Hackathon

### V1

```text
WebAuthn
P256
wallet binding
nullifiers
Monad verifier
TypeScript SDK
```

### V2

```text
ZK credential privacy
policy engine
multiple assurance levels
cross-device support
smart account integration
```

### V3

```text
Human uniqueness adapters
reputation credentials
AI-agent authorization
cross-chain verification
portable trust policies
```

The important product principle is that **uniqueness should be an explicit policy/adapter**, not an unsupported claim hidden inside the passkey implementation.

---

## 26. Future: Programmable Trust Policies

The long-term version of Judges is not simply:

```text
human = yes/no
```

It becomes:

```ts
await judges.verify({
  userVerification: true,
  hardwareBacked: true,
  unique: true,
  domain: "my-dapp",
  maxAge: 86400
});
```

Applications can define their own trust requirements.

Possible policies:

```text
DAO:
  userVerified + unique

AI Agent Registry:
  userVerified + walletBinding

High-value DeFi action:
  userVerified + hardwareBacked

Game:
  userVerified

Public faucet:
  userVerified + unique + cooldown
```

That turns Judges into **programmable trust infrastructure** rather than a single-purpose proof-of-personhood product.

---

## 27. Limitations and Honest Claims

Judges should explicitly acknowledge:

1. WebAuthn proves control of a credential, not a government-certified real-world identity.
2. User verification does not inherently prove a unique human.
3. Synced passkeys are not equivalent to device-bound hardware credentials. citeturn822650search0turn822650search6
4. Stronger hardware-backed assurance depends on the authenticator and platform capabilities.
5. The full P-256-inside-ZK path is technically possible but substantially heavier than native P256 verification and should not be presented as audited production cryptography during the hackathon. citeturn919558search2turn919558search5

### Additional limitations found while building, not designing

6. **The trusted setup is single-contributor and local.** Fine for a demo; not production-safe —
   whoever ran that one contribution could in principle forge proofs. A real deployment needs a
   multi-party ceremony, or a public Powers-of-Tau file plus an independent phase-2
   contribution. (Both documented public `.ptau` mirrors returned `AccessDenied` at build time,
   so the MVP generates its own.) See `prover/README.md`.
7. **A nullifier can be griefed, though not stolen.** Proofs are bound to a wallet and an action
   (§7.2), so a proof lifted from the mempool cannot be redirected — but an observer can still
   submit it *for its rightful wallet*, which merely makes the owner's own action land a moment
   early while consuming the nullifier. Closing that needs a per-submission nonce inside the
   circuit; out of MVP scope.
8. **The credential secret is server-derived, not authenticator-derived.** A WebAuthn private key
   is non-extractable by design, so the value playing the role of `credential_secret` in §7.4 is
   `HMAC(JUDGES_DOMAIN_SECRET, credentialId ‖ publicKey)`. This means the Judges backend *can*
   compute any registered credential's nullifiers. It cannot forge a WebAuthn assertion, so it
   cannot impersonate a user to a relying party — but a fully trust-minimised design would not
   hand the backend that capability. Named here rather than buried.
9. **`unique` assurance is still a policy label, not an enforced property**, exactly as §3 warns.
   No policy engine exists yet (§26); the assurance level currently feeds the action binding.
10. **Groth16 verification costs ~1.13M gas on Monad**, because `ecPairing` and `ecMul` are
    repriced at 5× Ethereum. Benchmarks taken on a local Foundry EVM read Ethereum prices and
    understate this by roughly 845,000 gas. See §8.1.

Being explicit about these limitations is a feature, not a weakness: it gives judges confidence that the security model is understood.

---

## 28. Definition of Done

The hackathon MVP is complete when all of the following work end-to-end:

```text
[ ] User registers a passkey
[ ] User binds passkey to a wallet
[ ] User performs WebAuthn verification
[ ] User verification is enforced
[ ] Challenge replay is rejected
[ ] Wallet/action mismatch is rejected
[ ] P256 verification works on Monad
[ ] Nullifier is generated deterministically
[ ] Duplicate nullifier is rejected in the selected domain
[ ] Proof/verification result is consumable by Solidity
[ ] TypeScript SDK works from another app
[ ] DAO demo works
[ ] AI agent demo works
[ ] Faucet/airdrop demo works
[ ] Contracts deployed to Monad Testnet
[ ] Public GitHub repository works
[ ] Documentation works from a clean machine
[ ] Technical demo video shows the live product
[ ] One external developer/team integrates Judges
```

The official submission also requires a public GitHub repository and a live product link on Monad Mainnet or Testnet with access instructions. fileciteturn0file0L41-L53

---

## 29. References

### Hackathon

- Monad Hackathon - Trust, Identity & AI Infrastructure
- Track deadline: **October 14, 2026 at 10:59 GMT+7**. fileciteturn0file0L3-L18

### WebAuthn / Passkeys

- W3C Web Authentication Level 3: https://www.w3.org/TR/webauthn/
- FIDO Passkeys: https://fidoalliance.org/passkeys/
- FIDO Authentication Specifications: https://fidoalliance.org/specifications/

### Monad

- Monad developer documentation: https://docs.monad.xyz/
- Monad changelog / protocol revisions: https://docs.monad.xyz/developer-essentials/changelog

### ZK / P-256 references

- WebAuthn Circom verifier PoC: https://github.com/privacy-ethereum/webauth-circom
- Circom P-256 ECDSA PoC: https://github.com/privacy-ethereum/circom-ecdsa-p256
- gnark cryptographic library: https://github.com/Consensys/gnark

---

## 30. Final Vision

```text
Today

Wallet address
     |
     v
"Trust me, I am a user"


With Judges

Passkey
   |
   v
User verification
   |
   v
Privacy-preserving proof
   |
   v
Monad
   |
   v
Composable trust
```

Judges is trying to make one primitive available everywhere:

> **A user can prove control of a user-verified credential without handing every application a copy of their identity.**

That is the foundation for a more private, composable trust layer for wallets, applications, and AI-native services.
