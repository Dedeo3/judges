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
**2026-09-19 change — Redis removed**: challenges and pending bindings now live in Neon (`apps/web/migrations/0003_ephemeral_state.sql`, `src/lib/ephemeralState.ts`) instead of Upstash. Single-use is still atomic: `delete ... where key = $1 and expires_at > now() returning value`, so a second consume finds nothing and an expired entry is never returned. Checked against the real Neon database (store → take returns the value, second take returns null, expired take returns null). The entries above describing Upstash/`GETDEL` are kept as the original build log.
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

- [x] **Fixed a real dependency bug found while starting this phase**: `packages/sdk` was declared depending on `@judges/webauthn` (the *server-only* package, itself depending on `@simplewebauthn/server`) — wrong for a package meant to run in the browser. Swapped for `@simplewebauthn/browser` directly.
- [x] `packages/sdk` wraps: challenge creation + the browser WebAuthn ceremony (`prove()` calls `/api/webauthn/auth/options` then `startAuthentication`), proof preparation (delegated server-side — see the new `/api/prove` endpoint below, since proof generation needs the credential secret, which never leaves the server), Monad RPC calls (`verify()`/`isNullifierUsed()` via `viem`, using the *caller's* wallet client — the SDK never holds a signer), retries on transient failures (`postJson` — 5xx/429 retried with backoff, 4xx and WebAuthn ceremony failures are not, since a consumed challenge can't be resubmitted), and verification-result normalization (`{ valid, txHash, domain, nullifier }`).
- [x] Shipped the exact example shape from README §11/§26 (see `docs/integration.md`) — `getPolicy()` not implemented (no real policy engine exists yet, README §26/V2 roadmap; nothing to fetch).
- [x] **New: `/api/prove`** (`apps/web/src/lib/prove.ts`) — the piece that makes the SDK's `prove()` call meaningful. Verifies a *fresh* WebAuthn assertion (same single-use-challenge path as `/api/webauthn/auth/verify` — this endpoint does not accept a bare `credentialId`, only a live ceremony result, so a caller can't request a proof for a credential they don't control), derives the credential secret server-side, builds the Phase 5 membership witness, and runs `snarkjs.groth16.fullProve` against the *committed* frozen `prover/build/judges_membership_final.zkey`/`.wasm` (resolved via a relative path from `apps/web`, since Vercel's file tracing for a cross-package binary dependency hasn't been configured yet — flagged for Phase 8). Uses `snarkjs.groth16.exportSolidityCallData` to get the correctly-ordered G2 point before ABI-encoding, rather than re-deriving that ordering by hand (a well-known Groth16 footgun).
- [x] Dogfooded in `/demo`: a "Prove membership (ZK) via SDK" button imports `@judges/sdk` exactly as an external integrator would (not a direct `fetch`) and calls `judges.prove(...)`.
- [x] Wrote `docs/integration.md`.
- [x] **Found and fixed while wiring this up**: `apps/web/tsconfig.json`'s `target: "ES2017"` (create-next-app's default) doesn't support BigInt literals, which `packages/crypto` uses — bumped to `ES2020`. Also hit a stale `tsconfig.tsbuildinfo` incremental-cache file masking the fix (deleting it, already gitignored, resolved it) — worth knowing if a target/lib bump ever seems to silently not take effect again.

**Acceptance test** (as originally written): a throwaway script outside the monorepo (or a fresh `apps/demo-agent`) can `npm install` the SDK package and complete a full prove/verify round trip against the deployed testnet contracts.

**Verified**: full workspace `typecheck`/`lint`/`build` pass. Live in a local dev server: `/demo`'s new button calls the SDK, which calls the real `/api/webauthn/auth/options` endpoint, retries 3 times (default `maxRetries: 2`) against the expected `Missing required env var: UPSTASH_REDIS_REST_URL` failure, and surfaces a clean error — confirming the SDK's call chain, retry logic, and error propagation are wired correctly up to where real infrastructure is needed. `apps/web` can resolve `prover/build`'s committed wasm/zkey via its relative path (confirmed via a direct filesystem check).
**Not yet verified** (same blockers as every earlier phase, now compounded): a full `prove()` → `verify()` round trip needs real Neon/Upstash credentials (Phase 1/2), `JudgesVerifier` actually deployed to Monad Testnet (Phase 8), and a real platform authenticator to complete the WebAuthn ceremony (Phase 1). The acceptance test as written can't be satisfied until Phase 8 exists — this phase gets the SDK and its backend as far as they can honestly go before that.

---

## 8. Phase 7 — Demo Integrations

Build all three using the same SDK, no bespoke logic per app:

### 7a. Prerequisite fix — proofs were bearer tokens (README §7.2)

Found while thinking through what a demo's `vote()` call would actually look like, and fixed before building on top of it: nothing bound a proof to the wallet or to the action. A proof sits in the mempool as public calldata, so anyone could lift it, submit it as themselves, and **pick the action parameters freely** — vote the opposite way on someone else's proof, or send a faucet claim wherever they liked. README §7.2 specifies exactly this binding (`challenge = H(judgesDomain ‖ appId ‖ wallet ‖ action ‖ nonce ‖ expiry)`); the implementation had drifted from it.

The fix cost no circuit change, because `policyHash` was already an opaque public input — only *how it's computed* changed:

- [x] `packages/crypto/src/policy.ts` — `policyHash = toField(sha256(contextHash ‖ wallet))`. Byte-oriented on purpose (32-byte context ‖ 20-byte address): hashing display strings ("0xAbC…" vs "0xabc…") is exactly where a TS and a Solidity half silently diverge. 8 new vitest tests.
- [x] `JudgesVerifier.verify()` now takes `contextHash` + `wallet` and **derives** `policyHash` itself via `policyHashFor()` — accepting it as a parameter would let a caller assert whatever binding they liked.
- [x] The SDK's `prove()` requires `wallet` and accepts an optional `contextHash`; `verify()` refuses to submit a proof whose bound wallet isn't the submitting account.
- [x] **Cross-language check** in `JudgesVerifier.t.sol`: Solidity's `policyHashFor` must equal the value TS's `derivePolicyHash` produced when the proof was generated. If those two ever drift, every proof silently stops verifying on-chain — this catches it in CI instead of at deploy time.
- [x] Two new real-proof tests: a proof submitted for a different wallet is rejected, and a proof redirected to a different action is rejected.

Residual, documented: an attacker can still *burn* a nullifier they've seen (submitting it for its rightful wallet, which merely does what the owner intended a moment early) — a griefing/DoS nuisance, not theft. Fully closing that needs a per-submission nonce in the circuit; out of MVP scope.

### 7b. The three demos

- [x] **Sybil-resistant DAO** — `contracts/src/demos/SybilResistantDAO.sol`: proposals with yes/no tallies; `vote()` calls `judges.verify()` with the DAO's own domain and `contextHashFor(proposalId, support)`. The sybil resistance is *entirely* Judges' — there's no per-voter bookkeeping in the contract at all, the second vote just hits `NullifierAlreadyUsed`.
- [x] **AI Agent Registry** — `contracts/src/demos/AgentRegistry.sol`: `registerAgent(name, …)` records an agent only if a verified credential authorized it, owned by the *bound* wallet rather than `msg.sender`. Context binds the agent name.
- [x] **Sybil-resistant Faucet** — `contracts/src/demos/SybilResistantFaucet.sol`: one claim per credential per domain; funds go to the bound wallet, so a third-party submitter just pays gas to deliver someone else their own claim. Nullifier is consumed before the transfer, so a reentrant claim hits `NullifierAlreadyUsed` rather than draining it.
- [x] Each contract exposes `contextHashFor(...)` as a view function so clients read the binding **off the chain** instead of reimplementing the hashing in TypeScript — one definition, nothing to drift. Documented with a worked example in `docs/integration.md`.
- [x] Each takes its `domain` as a constructor argument (computed from the app's domain string by the deploy script) rather than hardcoding a hash, and passes it to `verify()` — which is also what stops a proof minted for one demo being replayed against another.

**Verified**: 40/40 Foundry tests pass (19 new across the three demos, 8 in `JudgesVerifier.t.sol` including the real-proof theft/redirect cases, plus the existing NullifierRegistry and MonadP256Adapter suites). Workspace `typecheck`/`lint`/`build` green; 22/22 vitest. `/demo`'s SDK button now requires a connected wallet, verified live in a browser.

**Test architecture note**: the demos' own logic is tested against a `MockJudgesVerifier` that reproduces the two behaviours they depend on (reverting on a bad proof, and reverting with the real `NullifierAlreadyUsed` on reuse). Generating a real Groth16 proof takes minutes, so putting one in every demo test would make the suite unrunnable; the real cryptographic path is covered with real proofs in `JudgesVerifier.t.sol`, which is what the demos call into.

**Acceptance** (as originally written): each flow demonstrable end-to-end in a browser against Monad Testnet, matching the "Killer Demo" script in README §21.

**Not yet done**: the browser UIs for the three demos, and any end-to-end run. Both need deployed contract addresses (Phase 8) — building dead UI pages that can't call anything would be worse than leaving them for the phase that can wire them up. The contracts and their tests are the substantive deliverable here.

---

## 9. Phase 8 — Testnet Deployment

Split by who can do it: everything automatable is built and tested here; the rest needs a funded key and accounts only the team holds. `docs/deployment.md` is the runbook.

### 8a. Built and verified (no credentials needed)

- [x] `contracts/script/DeployJudges.s.sol` — deploys the whole stack in dependency order (`Groth16Verifier` → `NullifierRegistry` → `MonadP256Adapter` → `JudgesVerifier` → `setVerifier` → the three demos), derives each demo's `domain` from its app-id string on-chain so no hash is hardcoded, and writes a paste-ready `NEXT_PUBLIC_*` block to `contracts/deployments/<chainId>.env`. **Reads no private key** — the signer comes from a `forge` flag, so key handling stays outside the repo entirely.
- [x] `contracts/test/DeployJudges.t.sol` — 10 tests running the real script's logic locally: registry points at the verifier, verifier points at both dependencies, each demo carries the domain derived from its own app id, the three domains are distinct, the faucet's claim amount is configured, and the one-shot `setVerifier` is already spent. A mis-wired deployment would otherwise look fine until the first real proof failed on testnet.
- [x] `contracts/src/libraries/JudgesField.sol` — extracted the field prime, `hashToField`, and `policyHash` into one on-chain definition (they were about to be duplicated between `JudgesVerifier` and the deploy script; duplicating a cryptographic constant is exactly the drift risk worth spending a refactor on). `contracts/test/JudgesField.t.sol`, generated by `prover/scripts/export_domain_fixture.ts`, pins it against `packages/crypto` on concrete values.
- [x] Vercel file tracing (`apps/web/next.config.ts`): `outputFileTracingRoot` widened to the repo (a monorepo traces from the project dir by default) plus explicit `outputFileTracingIncludes` for the wasm and zkey, since `/api/prove` reads them via a `process.cwd()`-derived path the tracer can't see. **Verified the way it actually matters**: moved every gitignored `prover/build` artifact aside to simulate a fresh clone, rebuilt, and confirmed the two committed files are still traced and nothing required is missing. Without this the deployed function throws ENOENT on the first proof and only then.
- [x] `apps/web/src/lib/judgesConfig.ts` — addresses from `NEXT_PUBLIC_*` env vars (not committed constants, so one build serves local/testnet/mainnet), chain definitions taken from **viem's** `monadTestnet`/`monad` rather than hand-rolled, and a `missingConfigReason` guard. Verified both ways in a browser: with no addresses the demo pages explain exactly which env var is missing; with addresses set the guard disappears.
- [x] The three demo UIs — `/demo/dao`, `/demo/agent`, `/demo/faucet` — sharing a `DemoShell` that handles wallet connection, the prove step, and status/explorer links. Each reads its action binding from its own contract's `contextHashFor(...)` view function, so there's no TypeScript copy of the hashing to drift.
- [x] `apps/web/scripts/export-abis.ts` — frontend ABIs generated from Foundry's build output rather than hand-written, since a hand-written ABI drifts silently and surfaces as a revert with no useful message.
- [x] `.env.example` and `docs/architecture.md` updated, including the two things that bite hardest: `JUDGES_DOMAIN_SECRET` is effectively permanent (rotating it invalidates every registered passkey and orphans every consumed nullifier), and `RP_ID` must be the bare hostname users actually visit.
- [x] **`JudgesRegistry` resolved**: README §9.2/§16 lists it, but nothing needs it — credential, application, and binding records live in the Neon tables from Phases 1–2, which is where they have to be since they're queried off-chain. Recorded as a deliberate non-goal in `docs/architecture.md` rather than deploying a placeholder.

### 8b. Needs your credentials (see `docs/deployment.md`)

- [ ] Deploy to Monad Testnet with a funded key; verify on the explorer.
- [ ] Fund the faucet and create a DAO proposal so those demos have state to act on.
- [ ] Provision Neon; run `db:migrate`. (Upstash is no longer needed — see the 2026-09-19 note under Phase 1.)
- [ ] Import into Vercel (root `apps/web`), set the env vars, deploy — this is the live product link the submission requires.
- [ ] Record the deployed addresses in `docs/architecture.md`.
- [ ] Walk the end-to-end checklist in `docs/deployment.md` §4 on a real device — the WebAuthn ceremony needs a real platform authenticator, which no automated browser can provide.
- [ ] Record the 3-minute technical demo video per README §21 script.
- [ ] Get at least one external developer/team to integrate the SDK (traction criterion, README §24) — `docs/integration.md` is what you hand them.

**Verified**: 53/53 Foundry tests (10 new deploy-wiring, 3 new cross-language field), 22/22 vitest, workspace `typecheck`/`lint`/`build` green, all four demo pages checked in a browser in both configured and unconfigured states.

**Found while running that sweep**: `forge test` failed with a DNS error, not a code fault — `MonadP256Adapter.t.sol` self-forks against the live RPC (the only way to reach Monad's custom precompile, per Phase 3), so with no network egress its `setUp` fails in a way that looks identical to a broken contract. Added an explicit `SKIP_FORK_TESTS=1` opt-out: deliberately opt-*out* rather than auto-skip, since a test that silently stops running is worse than one that occasionally fails loudly. Offline the suite is then 47 passed / 1 skipped. CI keeps it enabled — GitHub Actions has egress, and this is the assertion that Monad's precompile really behaves as documented.

**This phase's completion = the hackathon submission.** Do not proceed to Phase 9 until §8b is done and demoed.

### 8c. Third-party integration — found against the hackathon's criteria

**Found while mapping the build against the track's judging criteria**: no site other than Judges' own could use Judges at all, and nobody outside this repo could install the SDK. That quietly blocked the two heaviest criteria — Traction (20%) explicitly counts "even one other team integrating it", and Design & Craft (20%) is developer experience — since an integrator would hit a wall on step one. Specifically: passkeys are scoped to the relying party, so another origin can't run a Judges ceremony; `/api/prove` verified a single expected origin and sent no CORS headers; the SDK was only ever exercised same-origin; and `@judges/sdk` was `"private": true`, depended on an unpublished workspace package, and pointed `main` at TypeScript source.

- [x] **Popup handshake** (`packages/sdk/src/connect.ts`, `popup.ts`; `apps/web/src/app/connect/`). The SDK opens `/connect` on the Judges origin, which runs the ceremony and posts back only the proof. No CORS was opened; the API stays same-origin.
- [x] **Threat model, designed before coding**: a malicious site can open the popup and get a user to tap. A consent screen alone relies on the user noticing, so the real guarantees are structural:
  - every app id from the popup is **namespaced under the requesting origin** — a site can only spend a user's action inside its own namespace, never inside another site's airdrop — with no allowlist, keeping integration permissionless;
  - the proof is posted with **`targetOrigin` = the claimed origin**, so lying about your origin gets you nothing;
  - the referrer must match the claimed origin, so a site can't borrow a trusted name for the consent screen;
  - the SDK accepts only the exact Judges origin, the exact popup window, and its own random request id, then checks the returned proof's app/wallet/action against the request;
  - `/connect` sends `X-Frame-Options: DENY` + `frame-ancestors 'none'` (clickjacking), and deliberately does **not** send `COOP: same-origin`, which would sever `window.opener`.
- [x] **Server-side app-id validation** in `/api/prove` (`isValidProofAppId`): only a plain first-party id or one namespaced exactly as the popup produces reaches the domain hash; wallet, assurance and context hash validated too.
- [x] **Publishable SDK**: `AssuranceLevel` inlined (dropping the unpublished `@judges/types` dependency), ESM build to `dist` with declarations, `publishConfig` swapping `main`/`types`/`exports` to `dist` at pack time, and an npm-facing `packages/sdk/README.md`.
- [x] **Found and fixed while building it**: writing `.js` extensions on the SDK's relative imports (needed by Node ESM and `NodeNext` consumers) broke the web app — Turbopack consuming the workspace source can't resolve `./x.js` to `./x.ts`. Source is back to extensionless and `scripts/add-dist-extensions.mjs` adds the extensions to the build output only.
- [x] **Found and fixed**: the consent page initially set state in an effect (`react-hooks/set-state-in-effect`). It's now a client-only component (`next/dynamic` with `ssr: false`) whose initial state is computed synchronously — there's no server render to reconcile, since the page is meaningless without `window.opener`.
- [x] **`examples/external-dapp`**: a separate project outside the pnpm workspace that installs the SDK from its packed tarball, exactly as an integrator would — also something to hand another team and to show in the demo video. `npm audit` flagged its esbuild version (a dev-server advisory it doesn't use); bumped anyway so the example ships clean.

**Verified**:
- SDK: 52 vitest tests on the security helpers (origin normalisation rejecting paths/credentials/non-web schemes/plain-http non-loopback, namespace escape attempts, every request field, referrer matching, message shape, proof shape and request matching).
- Packed tarball installed into a project outside the repo: typechecks under `NodeNext` + `strict` + `skipLibCheck: false`, and imports in Node without crashing (so SSR frameworks can load it).
- **15/15 cross-origin checks in a real Chrome engine** (`examples/external-dapp/e2e/popup.e2e.mjs`, isolated throwaway profile, Judges on :3000 and the dApp on :4000): consent names the real site/namespace/wallet; cancel and close both reject `prove()` instead of hanging; a forged origin is refused; a message targeted at the wrong origin is dropped by the browser while the correctly targeted control arrives; a proof message from a Judges window other than the opened popup is ignored; the same message from the real popup is accepted; a proof for another app's namespace is rejected; the anti-framing headers are present and no severing COOP is set.
- The in-app browser pane turned out not to support real popups (`window.open` navigated the same tab) — which did confirm the "no opener" guard, but meant the round trip needed a real Chrome.

**Not verified, stated plainly**: the E2E injects the proof message from the popup window rather than running a passkey ceremony and generating a real proof, because that needs the deployed backend (Upstash/Neon) and a real authenticator. The message shape and `postMessage` call are identical to `ConnectFlow`'s, but the post-ceremony code path itself has not run.

**Still open for Traction**: publishing to npm (needs an npm account and a decision on the `@judges` scope), and actually getting a team to integrate.

---

## 10. Phase 9 — Mainnet Promotion (only after Testnet is proven)

Gate: **all** Definition of Done items (§12 below) pass on testnet, the demo video exists, and the team has explicitly decided to promote.

- [ ] Security pass: re-review nullifier derivation, commitment scheme, and event emissions for information leakage now that real usage patterns from testnet exist.
- [ ] Re-run the full Foundry test suite against a Monad Mainnet fork (`chain ID 143`).
- [ ] Confirm `P256VERIFY` precompile behavior/address/gas on Mainnet matches what was assumed on Testnet — do not assume parity without checking Monad's current docs at execution time.
- [ ] Deploy `JudgesVerifier`, `JudgesRegistry`, `NullifierRegistry` to Monad Mainnet via the same Foundry scripts used for testnet (parameterized by network, not duplicated).
- [ ] Verify Mainnet contracts on the explorer.
- [ ] Update SDK default network / docs to offer both `monad-testnet` and `monad-mainnet`, defaulting to whichever the product decides is canonical post-hackathon.
- [ ] Post-launch monitoring: watch nullifier registry growth, gas costs of `P256VERIFY` calls under real load, and the `ephemeral_state` table's challenge expiry/cleanup under real traffic.

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
