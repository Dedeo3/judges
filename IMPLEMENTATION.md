# Judges — Implementation Plan

> Companion to [Judges_README.md](Judges_README.md). This document is the execution plan: what to build, in what order, with what acceptance criteria, from empty repo to a deployed, demoable product on Monad Testnet — and the gate for promoting to Monad Mainnet afterward.

Target track deadline: **October 14, 2026, 10:59 GMT+7**.

Deployment policy: **Monad Testnet is the only target until every Definition-of-Done item passes end-to-end.** Mainnet is a separate, explicit phase (Phase 9) done only after the testnet product is stable and demoed.

---

## 0. Ground Rules

- Build Mode A from the README (§8): native P256 + onchain verification for the security-critical signature path, ZK only for the privacy-sensitive commitment/nullifier relationship. Do not attempt Mode B (WebAuthn-in-circuit) during the hackathon.
- Every phase ends with a runnable acceptance test before moving to the next. Do not start Phase N+1 with Phase N failing.
- No raw biometric data, no private keys, no unnecessary identity data ever touches the backend or logs.
- Keep Monad-specific code isolated behind an adapter (`MonadP256Adapter.sol`) so the rest of the system doesn't hardcode precompile calldata.

---

## 1. Repository Bootstrap

Create the structure from README §16:

```text
judges/
├── apps/
│   ├── web/            # Next.js demo app (landing, /demo, /developers, /playground, /transactions)
│   └── demo-agent/      # AI agent registry demo integration
├── packages/
│   ├── sdk/             # @judges/sdk — TypeScript SDK
│   ├── webauthn/        # WebAuthn client/server helpers
│   ├── crypto/          # commitment + nullifier derivation
│   └── types/           # shared TS types (proof, policy, session)
├── contracts/
│   ├── JudgesVerifier.sol
│   ├── JudgesRegistry.sol
│   ├── NullifierRegistry.sol
│   ├── P256Verifier.sol
│   ├── MonadP256Adapter.sol
│   └── interfaces/
├── prover/
│   ├── circuits/
│   ├── scripts/
│   └── tests/
├── server/
│   ├── src/
│   ├── migrations/
│   └── tests/
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── protocol.md
│   └── integration.md
├── docker/
├── scripts/
├── README.md
└── package.json           # pnpm workspace root
```

**Tasks**

- [ ] `pnpm init` monorepo with workspaces (`apps/*`, `packages/*`, `server`, `contracts` as a Foundry project, `prover`).
- [ ] Foundry project in `contracts/` (`forge init`), Hardhat not needed unless Foundry can't reach Monad Testnet cleanly — verify RPC compatibility first.
- [ ] Docker Compose for Postgres + Redis in `docker/`.
- [ ] Root `.env.example` covering: `MONAD_TESTNET_RPC_URL`, `MONAD_MAINNET_RPC_URL`, `DATABASE_URL`, `REDIS_URL`, `JUDGES_DOMAIN_SECRET`, `RP_ID`, `RP_ORIGIN`.
- [ ] CI skeleton (GitHub Actions): lint + typecheck + `forge test` + `vitest`/`jest` on every PR.

**Acceptance**: `pnpm install && pnpm build` succeeds from a clean clone; `docker compose up` brings up Postgres + Redis.

---

## 2. Phase 1 — WebAuthn Foundation

Goal: working passkey registration + authentication, server-validated, no wallet/chain involved yet.

**Backend (`server/`)**

- [ ] Choose WebAuthn library (`@simplewebauthn/server` recommended over hand-rolled parsing).
- [ ] `credentials` table (README §13 schema): `id, credential_id, credential_public_key, rp_id, sign_count, transports, created_at, status`.
- [ ] `POST /v1/webauthn/register/options` — generate registration challenge, store in Redis with short TTL.
- [ ] `POST /v1/webauthn/register/verify` — verify attestation, persist credential.
- [ ] `POST /v1/webauthn/auth/options` — generate auth challenge.
- [ ] `POST /v1/webauthn/auth/verify` — full validation: origin, rpId, challenge match, one-time consumption, signature, user-verification flag, signature counter.
- [ ] Reject list implemented exactly per README §7.3 and §19 (wrong challenge, wrong RP/origin, invalid client data type, invalid authenticator data, invalid signature, unexpected UV state, stale/replayed challenge, malformed credential).

**Frontend (`apps/web`)**

- [ ] Minimal page calling `navigator.credentials.create()` / `.get()` against the above endpoints.

**Acceptance test** (README §18 Phase 1): phone biometric/PIN → WebAuthn assertion → server returns valid, and a replayed assertion is rejected.

---

## 3. Phase 2 — Wallet Binding

Goal: bind a WebAuthn credential to an EVM wallet address, replay- and cross-domain-safe.

- [ ] Define binding statement (README §10): `wallet W + credential C + domain D`, signed by both the wallet (EIP-191/712 signature) and proven via a fresh WebAuthn ceremony.
- [ ] `applications` table: `id, name, domain, policy_hash, created_at`.
- [ ] `POST /v1/bindings` — accepts wallet signature + WebAuthn assertion over the same binding challenge (anti-replay nonce, short expiry).
- [ ] Enforce: one active credential-to-wallet binding per domain unless explicit re-bind flow is invoked.
- [ ] Use `viem` for wallet signature verification.

**Acceptance test**: wallet A + credential A → valid; wallet B + credential A → rejected unless explicitly re-bound.

---

## 4. Phase 3 — Monad P256 Verification (onchain)

Goal: verify a real P-256 signature onchain using Monad's native `P256VERIFY` (EIP-7951).

- [ ] `contracts/P256Verifier.sol` — thin wrapper matching the precompile's expected calldata/return format.
- [ ] `contracts/MonadP256Adapter.sol` — isolates the raw precompile address/calldata encoding so `JudgesVerifier.sol` never touches it directly.
- [ ] Foundry tests against a forked Monad Testnet RPC (`forge test --fork-url $MONAD_TESTNET_RPC_URL`).
- [ ] Confirm current `P256VERIFY` precompile address/gas cost from Monad's changelog before hardcoding it — don't trust a stale value from this doc; it must be re-checked at implementation time.

**Acceptance test** (README §18 Phase 3):

```text
valid P256 signature -> true
modified message      -> false
modified r/s          -> false
wrong key             -> false
```

---

## 5. Phase 4 — Nullifier Layer

Goal: deterministic, domain-separated nullifiers; duplicate use rejected onchain.

- [ ] `packages/crypto` — implement `nullifier = H(secret || applicationId || epoch)` and `commitment = Poseidon(credential_secret, credential_public_key, domain_separator)`. Freeze the exact hash/curve choice and cover with unit tests before anything depends on it (README §7.4 flags this explicitly).
- [ ] `contracts/NullifierRegistry.sol` — `mapping(bytes32 domain => mapping(bytes32 nullifier => bool used))`.
- [ ] Emit `HumanVerified(domain, nullifier, wallet)` — audit the event for accidental leakage of credential material before merging.

**Acceptance test**:

```text
same domain + same credential -> same nullifier
same domain + used nullifier  -> rejected
other domain                  -> different nullifier
```

---

## 6. Phase 5 — ZK Privacy Layer (Mode A scope only)

Goal: hide the credential/commitment/nullifier relationship, not the WebAuthn signature itself.

- [ ] Pick proving stack: Circom + snarkjs (per README §17) unless a spike shows a better fit.
- [ ] Circuit public inputs: `applicationId, walletCommitment, nullifier, policyHash`.
- [ ] Circuit private witness: `credential public key, WebAuthn challenge, assertion fields, credential secret, signature, credential metadata`.
- [ ] Circuit statement exactly as README §8: assertion signs correct challenge; challenge bound to application; credential satisfies policy; nullifier correctly derived; commitment matches public commitment.
- [ ] Do **not** start a full WebAuthn-in-circuit (Mode B) build — out of scope per README §20.

**Acceptance test**:

```text
correct witness -> proof verifies
changed secret  -> proof fails
changed domain  -> proof fails
changed policy  -> proof fails
```

---

## 7. Phase 6 — SDK

Goal: `@judges/sdk` hides WebAuthn + P256 + replay protection + nullifiers behind `register()` / `prove()` / `verify()` / `getPolicy()`.

- [ ] `packages/sdk` wraps: challenge creation, browser WebAuthn calls, serialization, proof prep, Monad RPC calls (via `viem`), retries, verification-result normalization.
- [ ] Ship the exact example shape from README §11/§26:

```ts
const judges = new Judges({ network: "monad-testnet", appId: "my-dapp" });
const proof = await judges.prove({ assurance: "user_verified" });
const result = await judges.verify(proof);
```

- [ ] Publish as an installable local package (`pnpm link` or workspace `file:` dependency) so demo apps consume it exactly the way an external integrator would — this is the traction/DX story for the rubric.
- [ ] Write `docs/integration.md` — must work by itself on a clean machine (Definition of Done requirement).

**Acceptance test**: a throwaway script outside the monorepo (or a fresh `apps/demo-agent`) can `npm install` the SDK package and complete a full prove/verify round trip against the deployed testnet contracts.

---

## 8. Phase 7 — Demo Integrations

Build all three using the same SDK, no bespoke logic per app:

- [ ] **Sybil-resistant DAO** (`apps/web` route or standalone): connect wallet → verify with Judges → vote → nullifier checked → second vote attempt with same nullifier rejected.
- [ ] **AI Agent Registry** (`apps/demo-agent`): create agent → Judges verification → `AgentRegistry.sol` records agent only if verification passed.
- [ ] **Sybil-resistant Faucet/Airdrop**: claim → Judges proof → nullifier check → used → reject / unused → claim.

**Acceptance**: each flow demonstrable end-to-end in a browser against Monad Testnet, matching the "Killer Demo" script in README §21 (fits inside a 3-minute recording).

---

## 9. Phase 8 — Testnet Deployment

- [ ] Deploy `JudgesVerifier`, `JudgesRegistry`, `NullifierRegistry` (and adapters) to **Monad Testnet** (chain ID `10143`) via Foundry script (`forge script`).
- [ ] Verify contracts on the Monad Testnet explorer.
- [ ] Point `apps/web`, `apps/demo-agent`, and the SDK's default network config at the deployed testnet addresses.
- [ ] Record deployed addresses in `docs/architecture.md`.
- [ ] Push public GitHub repository; confirm docs work from a genuinely clean clone (new machine or fresh container).
- [ ] Record the 3-minute technical demo video per README §21 script.
- [ ] Get at least one external developer/team to integrate the SDK during the hackathon window (traction criterion, README §24).

**This phase's completion = the hackathon submission.** Do not proceed to Phase 9 until this is fully working and demoed.

---

## 10. Phase 9 — Mainnet Promotion (only after Testnet is proven)

Gate: **all** Definition of Done items (§12 below) pass on testnet, the demo video exists, and the team has explicitly decided to promote.

- [ ] Security pass: re-review nullifier derivation, commitment scheme, and event emissions for information leakage now that real usage patterns from testnet exist.
- [ ] Re-run the full Foundry test suite against a Monad Mainnet fork (`chain ID 143`).
- [ ] Confirm `P256VERIFY` precompile behavior/address/gas on Mainnet matches what was assumed on Testnet — do not assume parity without checking Monad's current docs at execution time.
- [ ] Deploy `JudgesVerifier`, `JudgesRegistry`, `NullifierRegistry` to Monad Mainnet via the same Foundry scripts used for testnet (parameterized by network, not duplicated).
- [ ] Verify Mainnet contracts on the explorer.
- [ ] Update SDK default network / docs to offer both `monad-testnet` and `monad-mainnet`, defaulting to whichever the product decides is canonical post-hackathon.
- [ ] Post-launch monitoring: watch nullifier registry growth, gas costs of `P256VERIFY` calls under real load, and Redis-backed challenge expiry under real traffic.

Do not skip straight here. Mainnet before testnet is fully validated repeats the exact risk this document exists to prevent.

---

## 11. Cross-Cutting Security Checklist (apply throughout, not just Phase 9)

From README §19 — verify these are true at every phase, not just at the end:

- [ ] Challenges: cryptographically random, short expiry, one-time use, exact app/domain binding, wallet/action binding where applicable.
- [ ] WebAuthn validation covers: origin, rpId, challenge, clientDataJSON, authenticatorData, signature, user-verification flags, signature counter.
- [ ] Never trust a client-supplied `verified: true` flag — always independently validate the assertion server-side.
- [ ] Nullifiers: domain-separated, deterministic within a domain, unlinkable across domains, stored onchain only when necessary, never user-choosable.
- [ ] No private credential keys, raw authentication secrets, or unnecessary identity data in logs — redact authentication payloads in all environments, not just production.

---

## 12. Definition of Done (hackathon submission gate)

Copied from README §28 — this is the actual finish line for Phase 8:

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

---

## 13. Explicit Non-Goals (do not build, per README §20)

- Custom biometric system or face-recognition backend
- KYC provider
- Proprietary/custom cryptographic curve
- Full social network, full DAO platform, or full AI platform
- Mode B (WebAuthn-in-circuit) as a hackathon dependency

---

## 14. Suggested Execution Order Summary

```text
0. Bootstrap monorepo
1. WebAuthn foundation           (Phase 1)
2. Wallet binding                (Phase 2)
3. Monad P256 verification       (Phase 3)
4. Nullifier layer               (Phase 4)
5. ZK privacy layer              (Phase 5)
6. SDK                           (Phase 6)
7. Demo integrations             (Phase 7)
8. Testnet deployment + demo     (Phase 8)  <- hackathon submission
9. Mainnet promotion             (Phase 9)  <- only after 8 is fully proven
```
