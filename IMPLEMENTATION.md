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
│   ├── web/             # Next.js app — demo pages (landing, /demo, /developers, /playground,
│   │   │                #   /transactions) AND the backend, as API routes under src/app/api/**
│   │   └── src/app/api/ #   deployed as Vercel Functions, no separate server process
│   └── demo-agent/      # AI agent registry demo integration
├── packages/
│   ├── sdk/             # @judges/sdk — TypeScript SDK
│   ├── webauthn/        # WebAuthn client/server helpers
│   ├── crypto/          # commitment + nullifier derivation
│   └── types/           # shared TS types (proof, policy, session)
├── contracts/
│   ├── src/
│   │   ├── JudgesVerifier.sol
│   │   ├── JudgesRegistry.sol
│   │   ├── NullifierRegistry.sol
│   │   ├── P256Verifier.sol
│   │   ├── MonadP256Adapter.sol
│   │   └── interfaces/
│   ├── script/
│   └── test/
├── prover/
│   ├── circuits/
│   ├── scripts/
│   └── tests/
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── protocol.md
│   └── integration.md
├── docker/              # optional local Postgres+Redis; prod uses Neon + Upstash
├── scripts/
├── README.md
└── package.json           # pnpm workspace root
```

> **Hosting decision**: no standalone backend process. `apps/web` is deployed to **Vercel** as one unit — frontend pages + API routes (Vercel Functions). Postgres is **Neon** (serverless HTTP driver, pooled connection string), Redis/session-challenge storage is **Upstash** (REST-based). Both have free tiers sufficient for the hackathon. Local dev can still use `docker/docker-compose.yml` for Postgres+Redis, or point straight at free-tier Neon/Upstash to match prod exactly. This keeps everything deployable on Vercel's free Hobby tier with a single `vercel deploy` — no server to keep alive, no separate host to pay for. One consequence: anything that waits on Monad transaction confirmation must happen client-side (via the SDK/viem in the browser), not inside an API route, since serverless functions have an execution time cap.

**Tasks**

- [x] `pnpm init` monorepo with workspaces (`apps/*`, `packages/*`, `contracts` as a Foundry project, `prover`).
- [x] Foundry project in `contracts/` (`forge init`).
- [x] Docker Compose for Postgres + Redis in `docker/` (optional local fallback).
- [x] Root `.env.example` covering: `MONAD_TESTNET_RPC_URL`, `MONAD_MAINNET_RPC_URL`, `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (Neon), `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, `JUDGES_DOMAIN_SECRET`, `RP_ID`, `RP_ORIGIN`.
- [x] CI skeleton (GitHub Actions): typecheck + lint + test (Node) + `forge test` (contracts) on every PR.
- [x] `apps/web` scaffolded (Next.js, TypeScript, Tailwind, App Router) with `/api/health` as the first route.

**Acceptance**: `pnpm install && pnpm build` succeeds from a clean clone; `apps/web` runs locally with `pnpm --filter @judges/web dev`; `docker compose -f docker/docker-compose.yml up` brings up Postgres + Redis for local-only dev.

---

## 2. Phase 1 — WebAuthn Foundation

Goal: working passkey registration + authentication, server-validated, no wallet/chain involved yet.

**Backend (`apps/web/src/app/api/webauthn/**`, deployed as Vercel Functions)**

- [x] Choose WebAuthn library (`@simplewebauthn/server`, discoverable/resident-key credentials so auth doesn't need a username lookup).
- [x] `credentials` table (README §13 schema) on Neon: `id, credential_public_key, user_id, rp_id, sign_count, transports, status, created_at` — migration written (`apps/web/migrations/0001_create_credentials.sql`, run via `pnpm --filter @judges/web db:migrate`), not yet applied to a real Neon instance.
- [x] `POST /api/webauthn/register/options` — generate registration challenge, store in Upstash Redis with short TTL.
- [x] `POST /api/webauthn/register/verify` — verify attestation, persist credential to Neon.
- [x] `POST /api/webauthn/auth/options` — generate auth challenge (no `allowCredentials`; relies on discoverable credentials).
- [x] `POST /api/webauthn/auth/verify` — full validation via the library (origin, rpId, challenge, signature, UV flag) plus our own checks (unknown/revoked credential, sign-counter regression).
- [x] Reject list per README §7.3/§19: wrong challenge/origin/rpId/signature → library rejects; stale/replayed challenge → Redis `GETDEL` makes the challenge single-use, so a second submission finds nothing and is rejected; unknown credential → explicit lookup check; malformed request body → explicit 400 before touching WebAuthn logic.

**Frontend (`apps/web`)**

- [x] `/demo` page (`apps/web/src/app/demo/page.tsx`) calling `startRegistration()` / `startAuthentication()` (`@simplewebauthn/browser`) against the above endpoints.

**Acceptance test** (README §18 Phase 1): phone biometric/PIN → WebAuthn assertion → server returns valid, and a replayed assertion is rejected.

**Verified so far**: full workspace `typecheck`/`build`/`lint` pass; `/demo` renders and calls the API; hitting an endpoint with no Upstash/Neon credentials configured fails loudly with a clear `Missing required env var` error instead of crashing the server — confirmed live via a local dev server.
**Not yet verified**: the actual WebAuthn ceremony end-to-end (needs a real platform authenticator — Touch ID / Windows Hello / a phone — which an automated browser can't provide) and the Neon/Upstash-backed persistence (needs real free-tier project credentials, not yet provisioned). Do this manually once those accounts exist, before checking this phase off as done.

---

## 3. Phase 2 — Wallet Binding

Goal: bind a WebAuthn credential to an EVM wallet address, replay- and cross-domain-safe.

- [x] Define binding statement (README §10): `wallet W + credential C + domain D + nonce + expiry`, signed by both the wallet (EIP-191 `personal_sign`) and proven via a fresh WebAuthn ceremony whose challenge is `sha256(bindingMessage)` — so the same assertion can't be replayed as a login or reused for a different wallet/domain/nonce.
- [x] `applications` table: `id, name, domain, policy_hash, created_at` (migration `0002_wallet_binding.sql`, seeds a `judges-demo` domain for local testing).
- [x] `bindings` table: `id, credential_id, wallet_address, domain, created_at, revoked_at`, with partial unique indexes on `(domain, credential_id)` and `(domain, wallet_address)` where `revoked_at is null` — DB-enforced one-active-binding-per-domain, not just an application-level check.
- [x] Two-step endpoint (a single `POST` can't work — the client needs the challenge/message before it can produce a signature and assertion): `POST /api/bindings/challenge` (issues the binding statement + WebAuthn options, stores pending state in Upstash keyed by `sessionId`, single-use via `GETDEL`) and `POST /api/bindings/verify` (checks wallet signature, WebAuthn assertion, and the uniqueness constraint before inserting).
- [x] Enforce: one active credential-to-wallet binding per domain — a conflicting bind returns `already_bound`; an identical repeat bind is idempotent. Explicit re-bind/revoke flow is not built (out of scope for the hackathon MVP; would need a `revoked_at` update path).
- [x] Use `viem`'s `verifyMessage` (pure EOA signature recovery, no RPC client needed) for wallet signature verification.
- Refactored `packages/webauthn`: extracted `verifyAssertion` (challenge-agnostic core) and `generateAssertionOptions` (storage-agnostic options generator) out of `verifyAuthentication`/`createAuthenticationOptions` so Phase 1 login and Phase 2 binding share identical signature/counter verification instead of duplicating it.

**Acceptance test**: wallet A + credential A → valid; wallet B + credential A → rejected unless explicitly re-bound.

**Verified so far**: full workspace `typecheck`/`lint`/`build` pass; `/demo`'s new "Wallet binding" section renders; clicking "Connect wallet" with no injected wallet fails cleanly (no crash); hitting `/api/bindings/challenge` directly reaches `createBindingChallenge` → `bindingStore` and fails loudly on the missing `UPSTASH_REDIS_REST_URL`, confirming the code path is wired correctly up to where real credentials are needed.
**Not yet verified**: the actual two-proof binding ceremony end-to-end (needs a real injected wallet extension + a real passkey + live Neon/Upstash), and the DB-level uniqueness enforcement against a real Postgres instance. Do this manually once Neon/Upstash are provisioned and the migrations are applied.

---

## 4. Phase 3 — Monad P256 Verification (onchain)

Goal: verify a real P-256 signature onchain using Monad's native `P256VERIFY` (EIP-7951).

- [x] `contracts/src/libraries/P256Verifier.sol` — pure `staticcall`-based verify library, precompile address passed in by the caller (chain-agnostic, per EIP-7951's `hash‖r‖s‖qx‖qy` 160-byte big-endian layout).
- [x] `contracts/src/interfaces/IP256Verifier.sol` — the interface `JudgesVerifier.sol` (Phase 9/§9.1) will consume, decoupled from any specific chain.
- [x] `contracts/src/MonadP256Adapter.sol` — the one Monad-specific file: hardcodes precompile address `0x0100` and calls into the library. Confirmed live against Monad's own docs (address `0x0100`, 6900 gas, exact input/output format) rather than trusting a stale guess — see sources below.
- [x] Foundry tests forked against the real Monad Testnet RPC — the test self-forks in `setUp()` via `vm.createSelectFork` (defaulting to the public `MONAD_TESTNET_RPC_URL`), so plain `forge test` works with no CLI flags or CI secrets needed. 6/6 passing.

**Important finding — fork-test limitation**: `--fork-url` replays cached remote *state* through Foundry's own local EVM (revm); it does not proxy opcode execution to the real node. Monad's `P256VERIFY` is a custom precompile revm has no built-in knowledge of, so calling `adapter.verify(...)` directly inside a forked test silently hits an "empty account" at `0x0100` and **always returns false**, regardless of whether the vector is valid — this is a testing-harness gap, not a contract bug. Confirmed by cross-checking: a direct `cast call` with identical calldata against the live RPC returns `1`. The tests instead use the `vm.rpc("eth_call", ...)` cheatcode to send the check straight to the real forked RPC endpoint, hitting the actual on-chain precompile. **This matters for Phase 9** (`JudgesVerifier.sol`, which calls into `MonadP256Adapter`): any test that needs a real true/false answer from P256 verification must either use `vm.rpc` the same way, or `vm.etch` a mock contract at `0x0100` for tests that only care about surrounding logic (nullifier checks, event emission) and shouldn't depend on network access.

**Acceptance test** (README §18 Phase 3) — verified live against Monad Testnet:

```text
valid P256 signature -> true   [PASS]
modified message      -> false [PASS]
modified r/s          -> false [PASS]
wrong key             -> false [PASS]
```

Test vector: a real secp256r1 keypair generated with Node's `crypto` module (prime256v1, SHA-256 digest, IEEE P1363 signature encoding), locally verified with `crypto.verify` before use, and emitted directly into the test file by that same script — no manual hex transcription.

Sources checked at implementation time (2026-09-12): [Monad Precompiles docs](https://docs.monad.xyz/developer-essentials/precompiles) (address `0x0100`, input layout, 6900 gas), [EIP-7951](https://eips.ethereum.org/EIPS/eip-7951).

---

## 5. Phase 4 — Nullifier Layer

Goal: deterministic, domain-separated nullifiers; duplicate use rejected onchain.

- [x] `packages/crypto` — frozen construction, covered by 11 vitest unit tests (`pnpm --filter @judges/crypto test`):
  - `credentialSecret = HMAC-SHA256(JUDGES_DOMAIN_SECRET, credentialId ‖ credentialPublicKey)` reduced into the BN254 scalar field. We never have the WebAuthn private key (non-extractable by design), so this server-held-secret-derived value stands in for README §7.4/§7.5's "credential_secret" — deterministic per credential, unforgeable without `JUDGES_DOMAIN_SECRET`.
  - `commitment = Poseidon3(credentialSecret, sha256(credentialPublicKey), sha256(domainSeparator))`.
  - `nullifier = Poseidon3(credentialSecret, sha256(applicationId), sha256(epoch))`, `epoch` defaulting to a fixed value (no rotation policy yet — that's a later policy-engine concern, not Phase 4).
  - Poseidon (via `poseidon-lite`, the same parameterization `circomlib`/Semaphore use) chosen over keccak/sha256 specifically because Phase 5's ZK circuit must prove "the nullifier is correctly derived" and "the commitment matches" — picking a circuit-unfriendly hash now would force a breaking change later.
- [x] `contracts/src/NullifierRegistry.sol` — `mapping(bytes32 domain => mapping(bytes32 nullifier => bool used))`, plus a `consume()` entry point restricted to a one-time-settable `verifier` address (an unauthenticated public `consume` would let anyone front-run and burn a nullifier before its rightful owner submits — a griefing vector the README interface sketch doesn't call out but is worth closing now). `setVerifier` is deployer-only and settable exactly once, avoiding a constructor circular dependency with `JudgesVerifier` (Phase 9, not deployed yet).
- [x] Emits `HumanVerified(domain, nullifier, wallet)` exactly as specified — audited for leakage: only the domain, the opaque nullifier, and the wallet address are emitted, never the credential ID, public key, or secret.

**Verified**: `packages/crypto` — 11/11 vitest tests (determinism, cross-domain/cross-credential/cross-epoch distinctness, field-membership). `contracts/test/NullifierRegistry.t.sol` — 7/7 Foundry tests, pure local (no fork needed, no chain dependency): consume marks used + emits event, duplicate in same domain reverts, same nullifier in a different domain succeeds, unauthorized caller rejected, verifier settable only once by the deployer.

**Acceptance test** — all confirmed by the tests above:

```text
same domain + same credential -> same nullifier   [PASS, vitest]
same domain + used nullifier  -> rejected          [PASS, forge test]
other domain                  -> different nullifier [PASS, vitest + forge test]
```

---

## 6. Phase 5 — ZK Privacy Layer (Mode A scope only)

Goal: hide the credential/commitment/nullifier relationship, not the WebAuthn signature itself.

- [x] Proving stack: Circom 2.2.3 + snarkjs 0.7.6 (Groth16), per README §17. `circom` isn't an npm package (Rust binary) — installed from the official `iden3/circom` v2.2.3 GitHub release; see `prover/README.md`.
- [x] `prover/circuits/judges_membership.circom` — public inputs `walletCommitment, nullifier, applicationIdHash, policyHash`; private witness `credentialSecret, credentialPublicKeyHash`.
- [x] **Deliberately narrowed scope vs. README §8's idealized 5-point statement** (documented in the circuit's own `@dev` comment, not a silent gap): this circuit proves points 4–5 only — "the nullifier is correctly derived" and "the resulting commitment matches the public commitment" — reusing `packages/crypto`'s exact Phase 4 Poseidon construction inside the circuit. It does **not** attempt points 1–2 (the WebAuthn assertion signs the correct challenge, bound to the application) — per README's own Mode A description, that's exactly the part that stays as direct onchain P256 verification (Phase 3), not ZK. Point 3 ("credential satisfies policy") has no real policy engine yet (README §26/V2), so `policyHash` is carried as an opaque public input rather than checked against real logic.
- [x] `epoch` is a compile-time constant (`toField(sha256("default"))`, matching `packages/crypto`'s default), not a circuit input — no rotation policy exists yet, so there was nothing to parameterize.
- [x] Added `packages/crypto`'s `deriveMembershipWitness` (+ `hashToField` helper, refactoring `deriveCommitment`/`deriveNullifier` to share it) — the single place that enforces "the same domain string feeds both the commitment and the nullifier," since the circuit unifies what the general TS API keeps as two separate parameters (`domainSeparator` vs `applicationId`). 3 new vitest tests confirm it matches the standalone functions and stays domain-separated.
- [x] Confirmed **why `policyHash` as a bare, unconstrained public input is still meaningful**: Groth16 soundness binds every public signal into the verification equation — a proof fails to verify if the caller substitutes a different `policyHash` post-hoc, even though the circuit body never reads it. This is what makes "changed policy → proof fails" a real, enforced property today, ahead of an actual policy engine, without inventing fake policy logic to make the test pass.
- [x] Did **not** start a full WebAuthn-in-circuit (Mode B) build — out of scope per README §20, and per Mode A's own definition above.

**Trusted setup — MVP-only, explicitly flagged**: `prover/scripts/trusted_setup.sh` runs a single-contributor, fully local Powers-of-Tau (bn128, power 12) + Groth16 phase-2 ceremony. This is standard for local dev/demo but is **not production-safe** — whoever ran that one contribution could in principle forge proofs. A real deployment needs either a multi-party ceremony or a well-known public Powers-of-Tau file plus an independent phase-2 contribution. (A first attempt to reuse a public Hermez/zkevm-hosted `.ptau` mirror hit `AccessDenied` on both known hosts — bucket permissions apparently changed since they were documented — so generating fresh was the pragmatic MVP choice; revisit before any real deployment.)

**Verified**: `pnpm run test:prover` (builds the circuit, runs the local trusted setup, then the acceptance script) — all 4 acceptance checks pass end-to-end against a real Groth16 proof/verify, not a mocked stand-in. `packages/crypto` — 14/14 vitest tests total (11 from Phase 4 + 3 new `deriveMembershipWitness` tests). Kept out of the default `pnpm run build`/`pnpm run test` sweep (`--filter='!@judges/prover'`) since it needs the `circom` binary and a multi-minute local trusted-setup run that CI doesn't have set up — same reasoning as `contracts` getting its own `test:contracts` script instead of joining the plain Node test sweep.

**Acceptance test** — confirmed via `pnpm run test:prover`:

```text
correct witness -> proof verifies    [PASS]
changed secret  -> proof fails       [PASS]
changed domain  -> proof fails       [PASS]
changed policy  -> proof fails       [PASS]
```

---

## 6a. Gap fill — `JudgesVerifier.sol` (README §9.1)

**Found while starting Phase 6**: the plan referenced `JudgesVerifier.sol` from Phase 3 and 4's write-ups ("Phase 9, not deployed yet") and Phase 8 lists deploying it — but no phase ever listed *writing* it as its own task. Since Phase 6's SDK has nothing meaningful to call without it, it's built now rather than left as a silent hole:

- [x] `contracts/src/JudgesGroth16Verifier.sol` — the Groth16 verifier contract exported via `snarkjs zkey export solidityverifier` from Phase 5's frozen `judges_membership_final.zkey`. Copied in verbatim (never hand-edit generated crypto code); a Judges-authored provenance comment explains where it came from and that regenerating the trusted setup means re-exporting and replacing this file. Uses only standard EVM precompiles (ecAdd/ecMul/ecPairing) — no Monad-specific dependency, so (unlike `MonadP256Adapter`) its tests run fully locally with no fork needed.
- [x] `contracts/src/interfaces/IJudgesVerifier.sol` + `contracts/src/JudgesVerifier.sol` — combines the Groth16 verifier with `NullifierRegistry`. Two deliberate deviations from README §9.1's sketch (both explicitly licensed by that section's own "architectural target, not a final audited contract" caveat): `proof` is ABI-encoded Groth16 calldata rather than a fully generic blob, and `verify()` also takes `policyHash` (a genuine circuit public input) and `wallet` (needed for the nullifier event) — README's sketch omitted both.
- [x] **Scope decision, documented in the contract itself**: `JudgesVerifier.verify()` does not take raw WebAuthn/P-256 signature bytes and does not call `MonadP256Adapter`. The signature was already checked once, off-chain, during the real WebAuthn ceremony that registered the credential (Phase 1) — the ZK proof's soundness transitively vouches for that, since `credentialSecret` is only derivable server-side for a credential that passed that ceremony. Re-checking the raw signature on every `verify()` call would mean shipping WebAuthn assertion bytes on-chain every time, defeating the point of proving the relationship in zero-knowledge. `MonadP256Adapter` stays available as a separately useful, independently tested building block (e.g. a future ERC-4337-style flow validating a live passkey signature per transaction).
- [x] **`.gitignore` fix**: the frozen `judges_membership_final.zkey`, its `.wasm`, and `verification_key.json` are now committed on purpose (previously blanket-ignored) — `JudgesGroth16Verifier.sol`'s verification key is baked in from that exact zkey, so a fresh clone must be able to generate compatible proofs without re-running the trusted setup (which would produce a different, incompatible key). Ceremony intermediates (`.ptau`, `.r1cs`, `judges_membership_0000.zkey`) stay ignored — regeneratable from the circuit source, and the `.ptau` files especially are large.
- [x] `prover/scripts/export_verifier_fixture.ts` — generates a real proof against a real witness and emits a Foundry test file directly (no manual transcription of proof/public-signal values, same reasoning as the P256 vector in Phase 3). Re-run whenever the circuit or trusted setup changes.

**Verified**: 6/6 new Foundry tests in `contracts/test/JudgesVerifier.t.sol`, using a real snarkjs-generated proof accepted by the real onchain Groth16 verifier — a genuine off-chain/on-chain consistency check, not two independently-trusted halves. Covers: valid proof verifies + consumes the nullifier, replaying the same proof hits `NullifierAlreadyUsed`, and tampering with the wallet commitment / domain / policy hash each independently causes `InvalidProof` (SNARK soundness on the public inputs, same property Phase 5's off-chain tests rely on). Full suite: 19/19 Foundry tests passing (7 NullifierRegistry + 6 MonadP256Adapter + 6 JudgesVerifier).

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
- [ ] Provision free-tier **Neon** (Postgres) and **Upstash** (Redis) projects; set their connection strings as Vercel environment variables for `apps/web`.
- [ ] `vercel deploy` (or connect the GitHub repo to Vercel for auto-deploy on push) — this is the live product link required for submission.
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
