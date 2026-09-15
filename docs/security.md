# Security Model

See [Judges_README.md](../Judges_README.md) §3, §19, §27 for the authoritative product security
model and honest limitations. This file tracks implementation-specific audit findings and the
Redesign B security model.

## Audit findings (2026-09)

### C1 — CRITICAL (pre-B): on-chain proof forgery / total sybil bypass — FIXED by Redesign B

The pre-B circuit (`prover/circuits/judges_membership.circom`) took `credentialSecret` and
`credentialPublicKeyHash` as **free private inputs** and only proved that they hash to the public
`walletCommitment` and `nullifier`. Nothing — not the circuit, not `JudgesVerifier`, not any demo —
checked `walletCommitment` against a set of server-registered commitments. So anyone could pick an
arbitrary `credentialSecret`, compute a matching commitment/nullifier off the public
`judges_membership.wasm`/`.zkey`, and submit a valid proof for any wallet/action — minting unlimited
distinct "verified human" proofs with no passkey and no server domain secret.

This was **confirmed empirically**: a Groth16 proof over entirely invented inputs verifies against
the committed verification key. The README §27.8 claim that "credentialSecret is only derivable
server-side … it cannot impersonate a user" did not hold, because the circuit never bound the secret
to the server HMAC and no membership check existed on-chain.

**Fix (Redesign B):** the circuit now proves LeanIMT membership of `leaf = Poseidon(secret)` under a
public `merkleRoot`, and `JudgesVerifier.verify` reverts (`UnknownRoot`) unless that root was
published by `CommitmentTree` — whose `postRoot` is restricted to the server's `rootPoster`. An
outsider cannot forge a commitment that is a leaf under a server-published root without the ability
to insert it. The secret is derived client-side from a wallet signature, so the server never learns
it (also closes §27.8's privacy concern).

### M1 — MEDIUM (pre-B): wallet binding built but never enforced

`apps/web/src/lib/binding.ts`, `/api/bindings/*`, and the `bindings` table proved wallet↔credential
control, but `proveMembership` never consulted them: a proof was minted for whatever `wallet` the
caller passed. Under Redesign B the identity secret is itself derived from the wallet signature, so
the wallet is bound into the identity by construction; the separate binding subsystem should be
removed or repurposed when the pre-B server-proving path is retired.

### L1 — LOW: P-256 verifier does not enforce low-s

`P256Verifier`/`MonadP256Adapter` accept malleable signatures (both `s` and `n−s`). Not on the
`verify` path today, but before any reuse in a per-transaction smart-account flow, enforce low-s so a
malleable signature cannot bypass a signature-hash replay guard.

### L2 — LOW: `/api/prove` has no rate limit (pre-B)

The pre-B server-proving endpoint runs a full Groth16 proof per request, gated only by one live
WebAuthn assertion. Redesign B removes server-side proving (proving moves to the browser); until
then, rate-limit it.

## Redesign B — security model and remaining limitations

What B fixes: on-chain forgeability (C1) and server knowledge of secrets (§27.8).

What B deliberately does **not** change (must stay in README §27):

- **The server can still censor or add leaves.** It controls which commitments enter the tree and
  which roots are posted. B removes the server's ability to compute a user's secret/nullifiers, not
  its gatekeeping role. A trust-minimised version needs permissionless or multi-party root updates.
- **B does not add sybil resistance.** Registration is still `attestationType: "none"` with no rate
  limit, so one person can hold many passkeys and many wallets. Judges proves "a user-verified
  passkey holder stands behind this action", not "unique human".
- **Identity secret determinism depends on the wallet.** Standard EOAs sign deterministically
  (RFC 6979); some smart-contract/MPC wallets may not, and would fail to reproduce their registered
  commitment. This must be measured per supported wallet (README task 2).
- **New single-contributor trusted setup.** The v2 circuit needs its own ceremony
  (`prover/scripts/trusted_setup_v2.sh`, ptau 2^14); the same MVP-only caveat as before applies until
  a multi-party ceremony is run.
