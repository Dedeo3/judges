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

### 1.2 Confirm the trusted setup you're deploying against

`contracts/src/JudgesGroth16Verifier.sol` has a verification key baked in from
`prover/build/judges_membership_final.zkey`. Both are committed and must stay a matched pair. If
you re-ran `prover`'s trusted setup at any point, re-export the verifier and the test fixture
before deploying, or every proof will fail on-chain:

```bash
cd prover && pnpm run build && pnpm run setup
pnpm exec tsx scripts/export_verifier_fixture.ts
npx snarkjs zkey export solidityverifier build/judges_membership_final.zkey ../contracts/src/JudgesGroth16Verifier.sol
```

Reminder: that setup is **single-contributor and MVP-only** — see `prover/README.md` before
treating a deployment as production.

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

The script deploys in dependency order and calls `nullifierRegistry.setVerifier(...)` itself:

```
Groth16Verifier → NullifierRegistry → MonadP256Adapter → JudgesVerifier
  → nullifierRegistry.setVerifier(judgesVerifier)
  → SybilResistantDAO / AgentRegistry / SybilResistantFaucet
```

`setVerifier` is deployer-only and callable exactly once, so the address that runs this script is
the only one that could ever have set it — and the script spends it immediately. There is nothing
left to configure afterwards, and a second deploy produces a fresh, independent registry rather
than repointing the old one.

Optional: `FAUCET_CLAIM_AMOUNT` (wei) overrides the 0.01 MON default.

### 1.5 After deploying

- The script writes `contracts/deployments/<chainId>.env` — a paste-ready block of
  `NEXT_PUBLIC_*` addresses. Public addresses only, safe to commit.
- Fund the faucet: send some MON to the `SybilResistantFaucet` address (it has a `receive`).
- Create a DAO proposal so the DAO demo has something to vote on:
  ```bash
  cast send <dao-address> "createProposal(string)" "Fund the thing" --rpc-url monad_testnet --keystore <...>
  ```
- Record every address in `docs/architecture.md`.

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

The wasm + proving key that `/api/prove` reads are pulled into the function bundle by
`outputFileTracingRoot`/`outputFileTracingIncludes` in `apps/web/next.config.ts`. Verified by
building with the gitignored prover artifacts moved aside: the two committed files are traced, and
nothing required is missing from a fresh clone.

---

## 4. Verify end to end **(you)**

In a browser on the deployed URL, with a real platform authenticator (Touch ID / Windows Hello /
a phone) — none of this can be exercised by an automated browser:

1. `/demo` → Register with passkey → Sign in with passkey.
2. `/demo` → Connect wallet → Bind wallet to passkey.
3. `/demo` → Prove membership (ZK) via SDK.
4. `/demo/faucet` → claim. Then claim again: expect a revert naming `NullifierAlreadyUsed`.
5. `/demo/dao` → vote. Then vote again: same revert. Note the tally only moved once.
6. `/demo/agent` → register an agent. Confirm `agents(1).owner` is your wallet.

Step 4 or 5 failing with `InvalidProof` rather than a nullifier error usually means one of:
the deployed `JudgesGroth16Verifier` doesn't match the `zkey` the server is proving with (§1.2),
or `appId` in the frontend doesn't match the app-id string the contract was deployed with.

---

## 5. Still outstanding after this

- The 3-minute technical demo video (README §21 has the scene-by-scene script).
- At least one external developer integrating the SDK — the traction criterion in README §24.
  `docs/integration.md` is what you hand them.
- Mainnet promotion is deliberately a separate phase; see `IMPLEMENTATION.md` §10.
