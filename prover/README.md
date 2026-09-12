# Judges ZK Prover (Phase 5, Mode A)

Circom + snarkjs (Groth16) circuit proving the privacy-sensitive credential-secret →
commitment/nullifier relationship (README §7.4/§7.5/§8), **not** the WebAuthn/P-256 signature
itself — that's verified directly onchain via Monad's native `P256VERIFY` precompile (Phase 3).
See the `@dev` comment at the top of `circuits/judges_membership.circom` for the full scoping
rationale.

> Offline note: `contracts`' `MonadP256Adapter` suite talks to a live Monad RPC (the only way to
> reach the custom P256VERIFY precompile). Run `SKIP_FORK_TESTS=1 forge test` with no network.

## Setup (once per machine)

1. Install `circom` (v2.1.6+): https://docs.circom.io/getting-started/installation/
2. `pnpm install` (pulls in `circomlib` and `snarkjs`)

## Build

```bash
pnpm run build   # compiles circuits/judges_membership.circom -> build/
pnpm run setup   # generates a LOCAL, single-contributor trusted setup -> build/*.zkey, build/verification_key.json
pnpm run test    # runs the Phase 5 acceptance checks
```

`build/` is gitignored (`.ptau`/`.zkey`/`.r1cs`/`.wasm` are large, regeneratable binary
artifacts) — every clone must run `build` + `setup` locally before `test` will work.

## ⚠️ Trusted setup is MVP-only

`pnpm run setup` runs a **single-contributor, local** Powers-of-Tau + Groth16 phase-2 ceremony
(see `scripts/trusted_setup.sh`). This is standard practice for local development and demoing,
but it is **not** production-safe: whoever ran that one contribution could, in principle,
forge proofs. Before any real (mainnet, real-funds/real-identity) deployment, this needs either:

- a proper multi-party ceremony with several independent contributors, or
- reuse of a well-known public ceremony's Powers-of-Tau file (e.g. a Perpetual Powers of Tau
  mirror) combined with an independent phase-2 contribution.

This mirrors the same "MVP-scoped, explicitly flagged" pattern used elsewhere in this repo (see
`NullifierRegistry.sol`'s single-settable `verifier` address, and the P256 test vector notes in
`contracts/test/MonadP256Adapter.t.sol`).

## Why the public inputs are what they are

Circuit public inputs: `walletCommitment`, `nullifier`, `applicationIdHash`, `policyHash`.

`policyHash` isn't constrained against any real policy logic yet (no policy engine exists —
that's README §26/V2 roadmap), but it's still a genuine public input: Groth16 soundness binds
*every* public signal into the verification equation, so a proof generated for one `policyHash`
fails to verify if the caller substitutes a different one, even though the circuit body never
reads it. That's what makes the "changed policy → proof fails" acceptance check meaningful today,
ahead of an actual policy engine.

`applicationIdHash` is reused for *both* the wallet commitment's domain separator and the
nullifier's application id, which narrows `packages/crypto`'s more general TS API (its
`deriveCommitment`/`deriveNullifier` take separately-named `domainSeparator`/`applicationId`
parameters that could in principle differ). Always build circuit witnesses through
`@judges/crypto`'s `deriveMembershipWitness` helper, which enforces "same domain for both" — it's
the only way to guarantee a witness the circuit can actually satisfy.
