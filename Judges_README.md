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
const result = await judges.verify({
  wallet,
  assurance: "user_verified"
});

if (result.valid) {
  // allow action
}
```

An onchain application can consume the resulting proof:

```solidity
bool valid = judgesVerifier.verify(proof);
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
                    │ P256VERIFY + policy checks    │
                    │ nullifier / replay protection │
                    └───────────────┬──────────────┘
                                    │
                                  Monad
```

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

---

## 9. Smart Contract Design

### 9.1 JudgesVerifier

Responsibilities:

- verify proof / authentication result;
- verify P-256 signature where the selected mode requires it;
- validate policy hash;
- enforce nullifier uniqueness;
- expose verification result to consuming applications.

Conceptual interface:

```solidity
interface IJudgesVerifier {
    struct VerificationPolicy {
        bool requireUserVerification;
        bool requireHardwareBacked;
        bool requireUnique;
        bytes32 domain;
    }

    function verify(
        bytes calldata proof,
        bytes32 walletCommitment,
        bytes32 domain,
        bytes32 nullifier
    ) external returns (bool valid);

    function isNullifierUsed(bytes32 domain, bytes32 nullifier)
        external
        view
        returns (bool);
}
```

The final ABI should be simplified before release; the interface above is an architectural target, not a final audited contract.

---

### 9.2 P256 Precompile Adapter

Keep Monad-specific code isolated:

```text
contracts/
  P256Verifier.sol
  MonadP256Adapter.sol
  JudgesRegistry.sol
```

The adapter should encapsulate the precompile call so the rest of the system does not depend directly on low-level calldata encoding.

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
  appId: "my-dapp"
});

const proof = await judges.prove({
  assurance: "user_verified"
});

const result = await judges.verify(proof);

console.log(result);
```

Expected response:

```ts
{
  valid: true,
  assurance: "user_verified",
  nullifier: "0x...",
  domain: "my-dapp",
  expiresAt: 1790000000
}
```

The SDK should hide:

- challenge creation;
- WebAuthn browser calls;
- serialization/parsing;
- proof preparation;
- RPC interaction;
- retry handling;
- verification result normalization.

---

## 12. API Design

### Create verification session

```http
POST /v1/verify/sessions
```

Request:

```json
{
  "wallet": "0x...",
  "assurance": "user_verified",
  "domain": "my-dapp"
}
```

Response:

```json
{
  "sessionId": "sess_...",
  "challenge": "0x...",
  "expiresAt": 1790000000
}
```

### Submit WebAuthn response

```http
POST /v1/verify/sessions/:id/assertion
```

### Generate proof

```http
POST /v1/proofs
```

### Verify proof

```http
POST /v1/verify
```

Response:

```json
{
  "valid": true,
  "assurance": {
    "userVerified": true,
    "hardwareBacked": false,
    "unique": false
  },
  "nullifier": "0x..."
}
```

For a hackathon, the API can be simplified to a single session endpoint plus SDK helpers.

---

## 13. Backend

### Recommended stack

- **TypeScript**
- **Node.js**
- Fastify or Express
- PostgreSQL
- Redis
- WebAuthn library or native WebAuthn APIs
- viem for EVM RPC
- Docker

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

#### verification_sessions

```text
id
application_id
wallet
challenge_hash
expires_at
status
```

Do not store raw biometric information.

Do not store private credential keys.

Do not store unnecessary identity information.

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

Recommended pages:

```text
/
  Landing / explanation

/demo
  live verification demo

/developers
  SDK examples

/playground
  choose policy -> generate proof -> verify

/transactions
  Monad transaction activity
```

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

## 16. Recommended Repository Structure

```text
judges/
├── apps/
│   ├── web/
│   ├── playground/
│   └── demo-agent/
│
├── packages/
│   ├── sdk/
│   ├── webauthn/
│   ├── crypto/
│   └── types/
│
├── contracts/
│   ├── JudgesVerifier.sol
│   ├── JudgesRegistry.sol
│   ├── NullifierRegistry.sol
│   └── interfaces/
│
├── prover/
│   ├── circuits/
│   ├── scripts/
│   └── tests/
│
├── server/
│   ├── src/
│   ├── migrations/
│   └── tests/
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── protocol.md
│   └── integration.md
│
├── docker/
├── scripts/
├── README.md
└── package.json
```

---

## 17. Technology Choices

| Layer | MVP choice | Why |
|---|---|---|
| Frontend | Next.js + TypeScript | Fast demo + ecosystem |
| Wallet | wagmi + viem | EVM-native integration |
| WebAuthn | Native WebAuthn API or SimpleWebAuthn | Standards-based implementation |
| Backend | Node.js + TypeScript | Fast iteration + SDK sharing |
| DB | PostgreSQL | Credential/app/session metadata |
| Cache | Redis | Challenge expiry and replay protection |
| ZK | Circom/snarkjs or another mature proving stack | Practical hackathon path |
| Contract | Solidity | Monad EVM environment |
| Chain | Monad Testnet | Fast live demo |
| RPC | viem | Typed EVM client |
| Tests | Foundry + Vitest/Jest | Contract + backend coverage |
| Infra | Docker | Reproducible local setup |

### ZK technology note

P-256 inside ZK is significantly more expensive than native P-256 verification. Existing Circom P-256/WebAuthn proof-of-concepts demonstrate feasibility but also show substantial resource costs and lack of production audit. citeturn919558search2turn919558search5

Therefore the hackathon architecture should prioritize a reliable P256 + privacy-proof MVP over an oversized all-in-ZK circuit that cannot be demonstrated live.

---

## 18. Implementation Plan

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
