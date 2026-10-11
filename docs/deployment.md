# Deployment Runbook (Phase 8)

Everything here that can be automated is automated and tested. What's left needs credentials and
accounts that only you can hold — a funded key, a Neon project, a Vercel project. Those steps are marked **(you)**.

Order matters: the contracts can go up independently, but the web app needs both the contract
addresses and the datastores before any flow works end to end.

---

## 1. Contracts → Monad Testnet

### 1.1 Prerequisites **(you)**

- A funded Monad Testnet account (chain id `10143`, currency MON). Faucet: see
  https://docs.monad.xyz/developer-essentials/testnet
- `MONAD_TESTNET_RPC_URL` in your environment (defaults to the public
  `https://testnet-rpc.monad.xyz`).

### 1.2 Build the Redesign B circuit, trusted setup, and verifier

`contracts/src/JudgesGroth16Verifier.sol` still holds the **pre-B** verifying key. Redesign B uses
a new circuit (`judges_membership_v2.circom`), so you must build it, run its own trusted setup, and
re-export the verifier + fixture before deploying — otherwise every proof fails on-chain. Needs
`circom` 2.x installed.

```bash
cd prover
pnpm run build       # compiles judges_membership_v2.circom -> build/
pnpm run setup       # single-contributor trusted setup (ptau 2^14) -> judges_membership_v2_final.zkey
npx snarkjs zkey export solidityverifier build/judges_membership_v2_final.zkey ../contracts/src/JudgesGroth16Verifier.sol
pnpm exec tsx scripts/export_verifier_fixture_v2.ts   # regenerates contracts/test/JudgesVerifier.t.sol

# Serve the artifacts to the browser prover (committed; Vercel serves public/ from git):
mkdir -p ../apps/web/public/prover/judges_membership_v2_js
cp build/judges_membership_v2_js/judges_membership_v2.wasm ../apps/web/public/prover/judges_membership_v2_js/
cp build/judges_membership_v2_final.zkey ../apps/web/public/prover/
git add ../apps/web/public/prover ../contracts/src/JudgesGroth16Verifier.sol ../contracts/test/JudgesVerifier.t.sol
```

Then `cd ../contracts && SKIP_FORK_TESTS=1 forge test` must pass.

Reminder: that setup is **single-contributor and MVP-only** — see `prover/README.md` before
treating a deployment as production. The `.zkey` and the on-chain verifying key are a matched pair;
re-running the setup means redoing all of the above.

### 1.3 Dry run (no key needed)

The deploy script's logic is covered by `contracts/test/DeployJudges.t.sol`, which runs the whole
sequence locally and asserts the wiring (registry pointing at the verifier, each demo carrying
the domain derived from its own app id, the one-shot `setVerifier` already spent). Run it first:

```bash
cd contracts && forge test --match-contract DeployJudgesTest -vv
```

### 1.4 Deploy **(you)**

```bash
cd contracts
forge script script/DeployJudges.s.sol:DeployJudges \
  --rpc-url monad_testnet \
  --broadcast \
  --verify \
  --keystore <path-to-your-keystore>   # or --ledger, or --private-key
```

The script deploys in dependency order and wires everything itself:

```
Groth16Verifier → NullifierRegistry → CommitmentTree (setRootPoster) → MonadP256Adapter
  → JudgesVerifier(zk, nullifierRegistry, commitmentTree)
  → nullifierRegistry.setVerifier(judgesVerifier)
  → SybilResistantDAO / AgentRegistry / SybilResistantFaucet
```

`setVerifier` is deployer-only and callable exactly once, so the address that runs this script is
the only one that could ever have set it — and the script spends it immediately. `CommitmentTree`'s
`rootPoster` is set to `JUDGES_ROOT_POSTER` (defaults to the deployer) and is rotatable by the
deployer later. A second deploy produces a fresh, independent stack rather than repointing the old
one.

Optional env: `FAUCET_CLAIM_AMOUNT` (wei) overrides the 0.01 MON default; `JUDGES_ROOT_POSTER`
(address) sets who may publish Merkle roots (default: the deployer).

### 1.5 After deploying

- The script writes `contracts/deployments/<chainId>.env` — a paste-ready block of
  `NEXT_PUBLIC_*` addresses. Public addresses only, safe to commit.
- Fund the faucet: send some MON to the `SybilResistantFaucet` address (it has a `receive`).
- Create a DAO proposal so the DAO demo has something to vote on:
  ```bash
  cast send <dao-address> "createProposal(string)" "Fund the thing" --rpc-url monad_testnet --keystore <...>
  ```
- **Publish the first Merkle root (Redesign B).** A proof only verifies against a root the
  `CommitmentTree` has posted, so after at least one identity is registered (via `/demo`), read the
  current root and post it:
  ```bash
  # rootHex from the deployment's own /api/commitments/root, or from the app after a registration
  cast send <commitmentTree-address> "postRoot(bytes32)" <rootHex> --rpc-url monad_testnet --keystore <...>
  ```
  Re-post whenever new identities are registered (each changes the root). The `rootPoster` key is
  the only one allowed to call this.
- Record every address (including `CommitmentTree`) in `docs/architecture.md`.

---

## 2. Datastores **(you)**

Neon's free tier covers this workload. It stores credentials and bindings, and also the short-lived
single-use challenges, so there is no separate Redis to provision.

1. **Neon** (Postgres) — create a project, take the **pooled** connection string.
2. Apply the migrations:
   ```bash
   DATABASE_URL='<neon-pooled-url>' pnpm --filter @judges/web run db:migrate
   ```

---

## 3. Web app → Vercel **(you)**

Import the repo in Vercel with **root directory `apps/web`**.

Environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `JUDGES_DOMAIN_SECRET` | a fresh 32-byte random secret (`openssl rand -hex 32`) |
| `RP_ID` | your deployed hostname, e.g. `judges.vercel.app` — **no scheme, no port** |
| `RP_ORIGIN` | `https://<that hostname>` |
| `NEXT_PUBLIC_JUDGES_NETWORK` | `monad-testnet` |
| `NEXT_PUBLIC_JUDGES_*_ADDRESS` | from `contracts/deployments/<chainId>.env` |

Two things that will bite otherwise:

- **`JUDGES_DOMAIN_SECRET` is load-bearing and permanent.** Every credential's secret, commitment,
  and nullifier is derived from it. Rotating it silently invalidates every registered passkey and
  every nullifier already consumed on-chain. Set it once, keep it backed up, never rotate casually.
- **`RP_ID` must match the hostname users visit.** WebAuthn is origin-scoped; a mismatch makes
  every ceremony fail with an opaque browser error. Preview deployments get different hostnames,
  so passkeys registered on one won't work on another.

Third-party sites reach Judges through the `/connect` popup on this same deployment, so no extra
configuration is needed for them: `RP_ID`/`RP_ORIGIN` stay Judges' own hostname, and integrators set
`judgesOrigin` to it in the SDK. Give integrators the **production** hostname — a Vercel preview
URL is a different origin with a different `RP_ID`, so passkeys registered on one won't work on
the other.

`NEXT_PUBLIC_JUDGES_*_ADDRESS` now includes `NEXT_PUBLIC_JUDGES_COMMITMENT_TREE_ADDRESS`
(from `contracts/deployments/<chainId>.env`).

Redesign B proves in the **browser**, so there is no `/api/prove` server route reading the wasm/zkey
anymore. The v2 `judges_membership_v2.wasm` + `judges_membership_v2_final.zkey` are served as static
assets from `apps/web/public/prover/` (committed — see §1.2 and `public/prover/README.md`), which
Vercel serves straight from git. If they are missing, browser proving fails with a fetch error.

---

## 4. Verify end to end **(you)**

In a browser on the deployed URL, with a real platform authenticator (Touch ID / Windows Hello /
a phone) — none of this can be exercised by an automated browser:

1. `/demo` → Register with passkey.
2. `/demo` → Connect wallet → Sign identity message and register (passkey-gated).
3. **Post the new root** (§1.5) — the just-registered identity's root must be on-chain first.
4. `/demo` → Generate a proof (ZK, in-browser) to confirm proving works.
5. `/demo/faucet` → claim. Then claim again: expect a revert naming `NullifierAlreadyUsed`.
6. `/demo/dao` → vote. Then vote again: same revert. Note the tally only moved once.
7. `/demo/agent` → register an agent. Confirm `agents(1).owner` is your wallet.

Troubleshooting a revert instead of a nullifier error:
- `UnknownRoot` → the current membership root hasn't been posted on-chain (step 3), or a new
  identity registered after the last `postRoot`.
- `InvalidProof` → the deployed `JudgesGroth16Verifier` doesn't match the v2 `zkey` (§1.2), or the
  frontend `appId` doesn't match the app-id string the contract was deployed with.

---

## 5. Still outstanding after this

- The 3-minute technical demo video (README §21 has the scene-by-scene script).
- At least one external developer integrating the SDK — the traction criterion in README §24.
  `docs/integration.md` is what you hand them.
- Mainnet promotion is deliberately a separate phase; see `IMPLEMENTATION.md` §10.
