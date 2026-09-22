# Judges — Project Status

_Last updated: 2026-09-22, on branch `redesign-b`. Submission deadline: **14 Oct 2026, 10:59 WIB**
(internal target: submit **13 Oct**)._

Judges is a privacy-preserving passkey (WebAuthn) verification layer for Web3, built for the Monad
"Trust, Identity & AI Infrastructure" track. A user proves they hold a user-verified passkey via a
ZK proof, and a contract on Monad blocks reuse of the same identity within an app (nullifier).
See `Judges_README.md` for the product, `docs/security.md` for the audit finding and Redesign B's
fix, and `PENJELASAN-APLIKASI.md` for a plain-language (Indonesian) walkthrough of the whole flow.

---

## 1. Where we are, in one paragraph

**Redesign B is built, redeployed to Monad Testnet, and fully tested — but not yet exercised
end-to-end by a real user.** An audit found a critical bug in the original design (any invented
secret produced a valid proof — total sybil bypass, see `docs/security.md` C1). Redesign B fixes it:
the identity secret is now derived client-side from a wallet signature and never reaches the
server; the circuit proves Merkle-tree membership under a server-published root; `JudgesVerifier`
rejects unknown roots. All of this is built, the full test suite passes (68 Foundry + 30 crypto +
52 SDK, all real, no mocks on the critical path), and 8 fresh contracts are live on-chain. What's
missing is the first real registration: **zero identities are registered and zero roots are posted**,
so no proof can verify yet — that's the next concrete step, not a "someday" item. Also still open:
Vercel deploy (no live URL), merging this branch to `main`, and every non-code task (npm, traction,
market doc, logo, videos).

---

## 2. Done

### Code (Phases 0–8c, pre-Redesign-B — see `IMPLEMENTATION.md`)
WebAuthn registration/authentication, wallet binding, the original ZK circuit, nullifier registry,
`JudgesVerifier`, `MonadP256Adapter`, the SDK, three demo contracts, demo UIs, the cross-origin
popup flow. This layer is superseded by Redesign B below wherever they overlap.

### Redesign B (this branch, `redesign-b` — 17 commits ahead of `main`)

**What changed and why** (full detail: `docs/security.md`):
- Identity secret is derived **client-side** from a wallet signature (`packages/crypto/src/identity.ts`).
  The server never sees it — closes both the audit finding and the README §27.8 privacy gap.
- New circuit (`judges_membership_v2.circom`) proves LeanIMT membership of `Poseidon(secret)` under
  a public root, instead of taking the secret as a free input.
- New `CommitmentTree` contract holds root history; only its `rootPoster` can `postRoot`.
  `JudgesVerifier` reverts `UnknownRoot` unless the proof's root was actually published.
- Proving moved from server to **browser** (`apps/web/src/lib/proveBrowser.ts`); `/api/prove` and
  the old server-secret path are removed entirely.
- Registration is now passkey-gated (`/api/commitments/register`): a fresh WebAuthn assertion is
  required before a commitment is accepted.

**Built and verified today (2026-09-22):**
| Step | Result |
|---|---|
| `circom` installed (was missing) | v2.2.3, native Windows |
| v2 circuit compiled | `prover/build/judges_membership_v2.r1cs` etc. |
| Trusted setup run (ptau 2^14) | `judges_membership_v2_final.zkey` — **single-contributor, MVP-only**, see `prover/README.md` |
| On-chain verifier re-exported | `contracts/src/JudgesGroth16Verifier.sol` regenerated from the new zkey |
| Test fixture regenerated | `contracts/test/JudgesVerifier.t.sol` — a real proof, not a mock |
| Browser-prover artifacts committed | `apps/web/public/prover/` (~7 MB wasm+zkey; Vercel serves `public/` from git) |
| Migration 0004 applied to Neon | tables `identity_commitments`, `posted_roots` (found and fixed a comment-parsing bug in `migrate.ts` along the way) |
| **Full test suite** | **68/68 Foundry** (`--network monad --no-match-contract WebAuthnOnchainSpike`, then the spike separately — no single command runs all of it on Foundry 1.8.3), **30 crypto + 52 SDK vitest**, web `tsc`/build all pass |
| **Redeployed to Monad Testnet** | fresh, independent 8-contract stack — see addresses below |
| Faucet funded, DAO seeded | 0.5 MON; 2 proposals |
| `docs/architecture.md` updated | new addresses recorded; pre-B set kept collapsed for reference |
| Everything committed | 4 commits today, see §5 |

### Deployed contracts — Redesign B (Monad Testnet, chain id 10143, deployed 2026-09-22)
| Contract | Address |
|---|---|
| JudgesVerifier | `0xBF4A95EcF027c8691D32BCbbDF836c7010D3c1bD` |
| Groth16Verifier | `0x28045186dA5cde567F13a4C7D28A874E9E27CF16` |
| NullifierRegistry | `0x971439E9aAe7E10B4B63f3511ca54664aC5b83bA` |
| CommitmentTree | `0x58CC9E5BbEe44D143905e34307D361f621826e8a` |
| MonadP256Adapter | `0xf0C7A30040aef1B200D24aAb88E9F8Db4dbb0928` |
| SybilResistantDAO | `0x79dCf1b9b4f8B69262779d802186590f2B9C97c7` |
| AgentRegistry | `0xDc5Fe613d740B0Db00Ff92d8248ac55b31870BE5` |
| SybilResistantFaucet | `0xd2B7F9E87C23A4f4CBa5Cf50E4e0A2A33374f899` |

Deployer: `0x6d92a650aa91a42e0abb3ff36fc6d2c5051e864b` (`rootPoster` defaults to this same address —
no separate `JUDGES_ROOT_POSTER` was set). Same addresses in `contracts/deployments/10143.env`.
**The pre-B addresses (2026-09-19) are still on-chain but forgeable** (audit finding C1) — do not
use them; kept in `docs/architecture.md` only as a collapsed reference.

### Frontend (`apps/web`, spec in `DESIGN-FE.md`)
Built earlier as a "court slip opinion" design (paper/ink, hairline rules, one red accent for
REJECTED/errors). Pages: `/` (landing, live contract data), `/developers` (quickstart),
`/demo` + 3 demo pages (restyled), `/connect` (not restyled). **Not yet touched for Redesign B's
field rename** (`walletCommitment` → `merkleRoot`) beyond what your friend already did on this
branch (`ConnectFlow.tsx`, `demo/page.tsx` rewritten for browser proving — see `git log
main..HEAD -- apps/web/src/app`). Your friend is expected to continue frontend work from here.

---

## 3. Remaining

Ordered by what actually blocks what — not by the original calendar, which several items have
already passed.

### A. Prove Redesign B works end-to-end (blocks everything after it)
- [ ] **Register the first identity.** Open `http://localhost:3000/demo` (dev server env is ready —
  see §5), register a passkey, connect a wallet, sign. This calls
  `/api/commitments/register`. Right now `identity_commitments` has **0 rows** — nothing has been
  registered yet on this fresh deployment.
- [ ] **Post the resulting root on-chain.** Read it from `GET /api/commitments/root`, then:
  ```bash
  cast send 0x58CC9E5BbEe44D143905e34307D361f621826e8a "postRoot(bytes32)" <rootHex> \
    --rpc-url https://testnet-rpc.monad.xyz --account deployer-dio
  ```
  Re-post whenever new identities register (each changes the root). No proof verifies against an
  unposted root (`UnknownRoot`) — this is the one remaining step before the demo is provable.
- [ ] **Run the three demos end-to-end** with a real passkey + wallet: DAO vote, agent registry,
  faucet claim, and claim/vote **twice** to see `NullifierAlreadyUsed` fire for real.
- [ ] Measure real device proving time (Android mid-range + iPhone) and root-posting gas — not yet
  measured on this v2 circuit specifically.

### B. Deploy to Vercel (blocks demo video + judge access)
- [ ] Root directory `apps/web`. Env vars: `DATABASE_URL` (Neon pooled), `RP_ID`, `RP_ORIGIN`,
  `NEXT_PUBLIC_JUDGES_NETWORK=monad-testnet`, and the **five** `NEXT_PUBLIC_JUDGES_*_ADDRESS`
  values (four demos + `COMMITMENT_TREE`, new in Redesign B) from `contracts/deployments/10143.env`.
  - **`JUDGES_DOMAIN_SECRET` is no longer read anywhere in the code** — Redesign B removed the
    server-secret path entirely. Confirmed by search; don't bother setting it for this branch.
  - `RP_ID` must be the real hostname users visit — Vercel preview URLs get their own `RP_ID` and
    can't share passkeys with production.
- [ ] Clear local test data (`credentials`, `identity_commitments`, `posted_roots`) before/after the
  local test above, if it would confuse the production dataset — or use a separate Neon branch.

### C. Merge to `main`
- [ ] Once A and B are proven, merge `redesign-b` → `main`. Nothing here conflicts with frontend
  work happening in parallel unless it touches the same files (see §2 frontend note).

### D. SDK on npm
- [ ] Check the `@judges` npm scope is free; publish `0.x`. Note: the SDK's public field renamed
  `walletCommitment` → `merkleRoot` on this branch — republish after B lands, not before.

### E. Traction — at least one other team/adopter conversation
**This is the highest-priority item overall, not just one item on a list.** Founder & Market
(25%) and Traction (20%) outweigh Technical (20%) in the rubric, and this is currently at zero.
Nothing technical left on this list matters as much as one real conversation this week.
- [ ] List candidates, pitch, offer a pairing call, collect proof (repo/PR, tx hash, testimonial).

### F. Founder & market
- [ ] Named prospective adopters, comparison table (World ID, Human Passport, BrightID),
  post-event plan, team profile.

### G. Submission assets
- [ ] Logo, demo video (≤3 min, **record after** the Vercel deploy + a real device test), pitch
  video (≤2 min), judge access instructions.
- [ ] Optional: ERC-8004 in the demo agent — only if A–F are done with time to spare.

---

## 4. Known limitations — state these plainly, they are a credibility asset, not a weakness

- Judges proves "a user-verified passkey holder stands behind this action", **not** "one unique
  human". No rate limit on registration; one person can hold many passkeys.
- **The server still gatekeeps.** It decides which commitments enter the tree and controls
  `rootPoster` (when a root becomes usable on-chain). Redesign B removes the server's ability to
  *compute* a user's secret — it does not remove its *gatekeeping* role. Full discussion:
  `docs/security.md` → "Redesign B — security model and remaining limitations". This is not solved
  and is not being solved before the deadline — say so proactively in the pitch.
  See also `PENJELASAN-APLIKASI.md` §"is this decentralized?" for the plain-language version.
- Trusted setup is single-contributor and local (both v1 and v2). Fine for a demo, not for
  production. A real deployment needs a multi-party ceremony.
- A nullifier can be griefed (submitted early by an observer) but not stolen.
- Identity-secret determinism depends on the wallet: standard EOAs sign deterministically (RFC
  6979); some smart-contract/MPC wallets may not, and would fail to reproduce their commitment.
  Not yet measured against Judges' actually-supported wallets.
- Groth16 verification costs roughly 1.1M gas per action on Monad (pre-B measurement; v2's cost has
  not been separately measured yet).

Full list: `Judges_README.md` §27.

---

## 5. Working notes

**Committed today, on `redesign-b`, in order:**
1. `11609c9` — fix migration runner's `--` comment handling
2. `ed1d7db` — v2 circuit build, trusted setup, re-exported verifier + test fixture, browser-prover
   artifacts
3. `3785faf` — Redesign B redeploy record (addresses, broadcast log, `docs/architecture.md`)
4. `b032bd3` — `PENJELASAN-APLIKASI.md` (Indonesian walkthrough)

Working tree is clean. Nothing pushed — review before pushing.

**Secrets.** Never put a private key in `.env`, chat, or the repo. Deploy with a Foundry keystore
(`--account <name>`) or a hardware wallet. Database URLs live in gitignored `.env`/`.env.local`
files only. One earlier mistake this session: a `cat` of `apps/web/.env.local` briefly printed the
Neon connection string (with password) into a chat transcript — rotate that Neon password if you
consider it sensitive.

**Local dev server is already running and configured for this deployment** (as of 2026-09-22):
```bash
pnpm --filter @judges/web dev      # http://localhost:3000
```
`apps/web/.env.local` has `DATABASE_URL`, all five `NEXT_PUBLIC_JUDGES_*_ADDRESS` values (including
`COMMITMENT_TREE`), `NEXT_PUBLIC_JUDGES_NETWORK`, and `RP_ID`/`RP_ORIGIN`/`RP_NAME` for `localhost`.
Ready for the §3-A registration step with no further setup.

**Commands**
```bash
# Foundry: no single command runs the full suite on 1.8.3 — two commands do:
cd contracts
forge test --network monad --no-match-contract WebAuthnOnchainSpike   # 64/64
forge test --match-contract WebAuthnOnchainSpike                       # 4/4 (needs default/ethereum EVM)
# Offline (skips both fork-dependent suites): SKIP_FORK_TESTS=1 forge test

# Vitest (run per package; the root `pnpm test` script's quoted filter matches nothing on PowerShell):
pnpm --filter @judges/crypto run test   # 30 tests
pnpm --filter @judges/sdk run test      # 52 tests

# Apply migrations (migrate.ts does not auto-load env files):
cd apps/web && pnpm exec tsx --env-file=.env.local scripts/migrate.ts

# Rebuild the v2 prover from scratch (only if the circuit or trusted setup changes):
cd prover
pnpm run build   # needs circom on PATH
pnpm run setup   # several minutes; if it hangs at ~0% CPU for a while, kill and retry —
                 # looked like Windows Defender scanning the freshly-written 5MB zkey mid-read
npx snarkjs zkey export solidityverifier build/judges_membership_v2_final.zkey ../contracts/src/JudgesGroth16Verifier.sol
pnpm exec tsx scripts/export_verifier_fixture_v2.ts
```

**Env note.** Foundry reads `.env` from the project root that contains `foundry.toml`
(`contracts/.env`), not the repo-root `.env`. Next.js reads `apps/web/.env.local`, not the
repo-root `.env` either — the repo-root `.env` is effectively unused by any running code right now.

**`NEXT_PUBLIC_JUDGES_COMMITMENT_TREE_ADDRESS`** is documentation-only as of this branch — no
frontend code reads it yet (root posting is a manual `cast send`; root computation is server-side
from Postgres, not read from chain). Confirmed by search, not a bug — just worth knowing before
"fixing" it.

**Codebase map.** `graphify-out/graph.html` (interactive) and `GRAPH_REPORT.md` describe the
pre-Redesign-B codebase structure; not regenerated since B landed.
