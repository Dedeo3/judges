# Judges — Project Status

_Last updated: 2026-09-19. Submission deadline: **14 Oct 2026, 10:59 WIB** (internal target: submit **13 Oct**)._

Judges is a privacy-preserving passkey (WebAuthn) verification layer for Web3, built for the Monad
"Trust, Identity & AI Infrastructure" track. A user proves they hold a user-verified passkey via a
ZK proof, and a contract on Monad blocks reuse of the same credential within an app (nullifier).
See `Judges_README.md` for the product and `IMPLEMENTATION.md` for the phase-by-phase build log.

---

## 1. Where we are, in one paragraph

All code is written and tested locally, **the contracts are live on Monad Testnet**, Neon Postgres
is provisioned and migrated, and **the frontend is built** (landing page, developers page, restyled
demos, committed in three commits). What is **not** done: the web app is not deployed (no live URL
yet), nothing has been tested with a real passkey on a real device (a local run is the next step),
and none of the non-code submission assets exist (videos, logo, traction, market doc).

---

## 2. Done

### Code (Phases 0–8c, see `IMPLEMENTATION.md`)
- WebAuthn registration and authentication, wallet binding, ZK membership circuit (Groth16),
  nullifier registry, `JudgesVerifier`, `MonadP256Adapter`, TypeScript SDK, three demo contracts
  (DAO, agent registry, faucet), demo UIs, and the cross-origin popup flow for third-party sites.
- Tests: 22 crypto + 52 SDK (vitest), 52 Foundry, 4 ZK acceptance checks, 15 popup E2E checks.

### Done in this session (2026-09-19)
| Item | Result |
|---|---|
| `forge-std` added | `contracts/lib/forge-std` (git submodule) |
| `fs_permissions` added to `contracts/foundry.toml` | lets the deploy script write `deployments/10143.env` |
| **Contracts deployed to Monad Testnet (chain 10143)** | addresses below |
| Faucet funded | 0.5 MON at the faucet contract |
| DAO proposal created | `proposalCount` = 1 |
| Neon Postgres provisioned, migrations applied | tables: `applications`, `bindings`, `credentials`, `ephemeral_state` |
| **Redis / Upstash removed** | challenges and pending bindings now live in Neon (`ephemeral_state`) |
| Docs cleaned of Upstash mentions | plus unused `@upstash/redis` dependency removed |
| Codebase knowledge graph generated | `graphify-out/` (`graph.html`, `GRAPH_REPORT.md`, `graph.json`) |
| **Frontend built** per `DESIGN-FE.md` (phases 1 to 3) | commits `d042c51`, `e42cef9`, `e0e7e72`; details below |

### Deployed contracts (Monad Testnet, chain id 10143)
| Contract | Address |
|---|---|
| JudgesVerifier | `0xfb4FfdA8A0A7D18b5Ec111222099a334B5275b56` |
| SybilResistantDAO | `0x5CD5a860A2c36D4Be1e47F6ab23Ce013f1a902fa` |
| AgentRegistry | `0x02aaC9D715e962e9CCc4FEaD022DdC7f42D77779` |
| SybilResistantFaucet | `0xb341d3108ddC579f7fa3D55B658523dcfb7A4ce1` |
| NullifierRegistry | `0x3f73be8C30Ce340BAAA4ea2E6E89F3CeC5FE228e` |
| Groth16Verifier | `0xc84D2b27527193700C111e6AB08E7505F52DA484` |
| MonadP256Adapter | `0xaB41ce2D37c2EB50594416e89657443096b458bB` |

Deployer: `0x6d92a650aa91a42e0abb3ff36fc6d2c5051e864b`. Deploy cost about 0.39 MON. The same
addresses are in `contracts/deployments/10143.env`.

### Frontend (`apps/web`, spec in `DESIGN-FE.md`)
The site is designed as a court slip opinion: paper and ink, hairline rules, one red accent used only
for a REJECTED verdict and for errors. Fonts are Newsreader and IBM Plex Mono via `next/font`.

| Page | What it is |
|---|---|
| `/` | Landing page. Hero with the SDK snippet and a Verdict panel, a two-attempt ledger with the REJECTED stamp, then sections numbered from `src/lib/sections.ts`: Holding, Evidence (gas table), Procedure (diagram), Docket (three apps, live contract state), Dissent (limitations 6 to 10 in full) |
| `/developers` | Quickstart taken from `docs/integration.md`, plus the deployed contract addresses |
| `/demo`, `/demo/dao`, `/demo/agent`, `/demo/faucet` | Existing flows, restyled. A demo that receives `NullifierAlreadyUsed` shows the REJECTED stamp |
| `/connect` | Popup consent screen. **Not restyled** (outside the spec) |

- **Real data only.** The Docket lines are read live from the deployed contracts. The Verdict panel
  reads one real transaction receipt named by `NEXT_PUBLIC_JUDGES_SAMPLE_TX` and shows an honest
  empty state until that is set. Nothing on the page is invented.
- **Verified:** typecheck, lint and build pass. No horizontal overflow on `/`, `/developers`, `/demo`,
  `/demo/dao`, `/demo/agent`, `/demo/faucet` at 390, 768 and 1280px (measured in Chrome).
- **Not verified:** any real wallet or passkey flow, so the stamp after a genuine on-chain rejection is
  untested. Not reviewed by eye: `/developers` on mobile, `/demo/dao`, `/demo/agent`, keyboard focus.

---

## 3. Remaining

Ordered by what blocks what. Target dates come from the handover doc (`sisa gawean.txt`).

### A. Get the product live (was due 18 Sep — now overdue)
- [ ] **Run it locally first** (see section 5, "Run locally"). Needs three more lines in
  `apps/web/.env.local`: `RP_ID=localhost`, `RP_ORIGIN=http://localhost:3000`, `JUDGES_DOMAIN_SECRET`.
- [ ] **Commit the remaining uncommitted work** (the frontend is already committed, see section 5).
- [ ] **Deploy `apps/web` to Vercel** (root directory `apps/web`). Env vars needed:
  `DATABASE_URL` (Neon pooled), `JUDGES_DOMAIN_SECRET`, `RP_ID`, `RP_ORIGIN`,
  `NEXT_PUBLIC_JUDGES_NETWORK=monad-testnet`, and the four `NEXT_PUBLIC_JUDGES_*_ADDRESS`
  values from `contracts/deployments/10143.env`. Optional, both used by the frontend:
  `NEXT_PUBLIC_REPO_URL` (footer source link, omitted if unset) and `NEXT_PUBLIC_JUDGES_SAMPLE_TX`
  (see the next item).
  - `JUDGES_DOMAIN_SECRET`: generate once (`openssl rand -hex 32`), back it up, **never rotate**.
    Rotating it invalidates every registered passkey and every consumed nullifier.
  - `RP_ID` is the bare hostname users visit (e.g. `judges.vercel.app`). Vercel preview URLs
    cannot be used for real passkeys.
- [ ] **Record the deployed addresses in `docs/architecture.md`** (its address table still says
  `_pending_`).
- [ ] **Manual end-to-end test on a real device** (Touch ID / Windows Hello / phone), per
  `docs/deployment.md` section 4: register passkey, bind wallet, prove, claim from the faucet twice
  (second claim must revert `NullifierAlreadyUsed`), vote twice (same), register an agent.
  No automated browser can do the passkey step.
- [ ] **Fill the landing page's Verdict panel.** After the first successful on-chain
  `JudgesVerifier.verify()` (from the faucet or DAO demo), set `NEXT_PUBLIC_JUDGES_SAMPLE_TX` to that
  transaction hash in Vercel. The panel then shows the real `valid`, `txHash`, `domain` and
  `nullifier`.
- [ ] **Clean the local test data before the real deploy.** Passkeys registered locally are tied to the
  local `JUDGES_DOMAIN_SECRET`. Production uses a different one, so clear the `credentials` and
  `bindings` tables first, or use a separate Neon branch for local testing.

### A2. Frontend follow-ups
- [ ] Restyle `/connect` (the popup consent screen) to match, if time allows.
- [ ] Review `/developers`, `/demo/dao`, `/demo/agent` on a phone, and check keyboard focus.
- [ ] Add the logo to the header once it exists (the spec deliberately has no icon logo for now).
- [ ] Set `NEXT_PUBLIC_REPO_URL` in Vercel to the public repository URL (`origin` is
  `https://github.com/Dedeo3/judges`; confirm that is the one to show, and that it is public).

### B. SDK on npm (target 20 Sep)
- [ ] Check the `@judges` npm scope is free (rename and update `docs/integration.md` if not).
- [ ] Publish `0.x` and confirm the `docs/integration.md` example works from the published package.

### C. Redesign B — take the backend out of the trust path (target 26 Sep, 6-day timebox)
Today the credential secret is derived on the server from `JUDGES_DOMAIN_SECRET`, so the backend can
compute anyone's nullifier and link their activity. Design B moves the secret client-side and proves
Merkle membership in-browser. Full spec is in `sisa gawean.txt`, Task 2.
- [ ] If it slips past the timebox: **stop, submit the current version**, keep the disclosure in
  `Judges_README.md` §27 item 8.
- [ ] If done: new circuit, new trusted setup, re-export verifier and fixtures, redeploy contracts and
  web, re-run all tests and the popup E2E.
- [ ] Measure and report on real phones (Android mid-range + iPhone): proving time, root-posting gas,
  whether the deterministic wallet signature works across the wallets we support.

### D. Traction — at least one other team integrates (live by 4 Oct)
- [ ] List 10–15 candidate teams/projects, pitch them, offer a pairing call.
- [ ] Collect proof (repo/PR, live URL, tx hash, testimonial) in one tracking sheet.

### E. Founder & market (target 1 Oct)
- [ ] Named prospective adopters with concrete needs.
- [ ] Comparison table vs World ID, Human Passport, BrightID.
- [ ] Post-event plan (mainnet, multi-party trusted setup, policy engine, business model).
- [ ] Team profile.

### F. Submission assets (target 11 Oct)
- [ ] Logo (target 25 Sep).
- [ ] Demo video, 3 minutes max, live product. Record **after** the final deploy.
- [ ] Pitch video, 2 minutes max.
- [ ] Judge access instructions (URL, supported browsers, add Monad testnet, testnet faucet link,
  demo steps, note that a passkey needs Touch ID / Windows Hello / a phone).
- [ ] Optional: ERC-8004 in the demo agent, only if everything above is safe.

### Schedule (from the handover doc)
| Window | Target |
|---|---|
| 13–20 Sep | Live deploy, start Design B, npm SDK, outreach list |
| 21–27 Sep | Design B done, logo, outreach running |
| 28 Sep – 4 Oct | Redeploy on Design B, other team live, market doc |
| 5–11 Oct | Videos, judge instructions, feature freeze |
| 12–13 Oct | Buffer, **submit 13 Oct** |

---

## 4. Known limitations (be honest about these in the submission)
- Judges proves "a user-verified passkey holder is present", **not** "one unique human". Registration
  uses `attestationType: "none"` with no rate limit, so one person can hold many passkeys.
- The trusted setup is single-contributor and local. Fine for a demo, not production-safe.
- The credential secret is server-derived (see Design B above).
- A nullifier can be griefed (burned early by an observer) but not stolen.
- Groth16 verification costs about 1.13M gas per action on Monad.
- Nothing has been exercised with a real authenticator yet.

Full list: `Judges_README.md` §27.

---

## 5. Working notes

**Committed:** the frontend, in three commits (`d042c51` landing page, `e42cef9` `/developers`,
`e0e7e72` demo restyle).

**Not committed yet:** the Redis-to-Postgres change (`apps/web/src/lib/challengeStore.ts`,
`bindingStore.ts`, `ephemeralState.ts`, the `webauthn` route imports, `prove.ts`,
`migrations/0003_ephemeral_state.sql`), the doc edits, the `@upstash/redis` removal
(`package.json`, `pnpm-lock.yaml`), the `forge-std` submodule, `contracts/foundry.toml`, and the
untracked `contracts/deployments/`, `contracts/broadcast/`, `contracts/foundry.lock`,
`graphify-out/`, `DESIGN-FE.md`, `STATUS.md` and `sisa gawean.txt`.

**`.gitignore` was audited (2026-09-19).** `contracts/cache/` (forge "sensitive values") and every `.env`
are ignored. `graphify-out/` now shares only `graph.json`, `graph.html`, `GRAPH_REPORT.md` and
`manifest.json`; its cache, interpreter path and scan root are ignored. Timestamped
`contracts/broadcast/**/run-<n>.json` copies are ignored (`run-latest.json` is the shared record).
`contracts/lib/` is no longer ignored, because `forge-std` is a tracked submodule, staged at `v1.16.2`.
`contracts/deployments/10143.env` is meant to be committed: it holds public addresses only.

**Secrets.** Never put a private key in `.env`, chat, or the repo. Deploy with a Foundry keystore
(`--account <name>`) or a hardware wallet. Database URLs live in gitignored `.env` files only.

**Commands**
```bash
# Foundry needs the Monad network flag for the fork test:
cd contracts && forge test --network monad
# Offline: SKIP_FORK_TESTS=1 forge test

# Vitest (run per package; the root `pnpm test` script's quoted filter matches nothing on PowerShell):
pnpm --filter @judges/crypto run test
pnpm --filter @judges/sdk run test

# Apply migrations (migrate.ts does not auto-load env files):
cd apps/web && pnpm exec tsx --env-file=../../.env scripts/migrate.ts
```

**Run locally** (from the repo root, in PowerShell):
```bash
pnpm --filter @judges/web dev      # then open http://localhost:3000
```
The pages render as soon as `apps/web/.env.local` has `DATABASE_URL`, `NEXT_PUBLIC_JUDGES_NETWORK` and the
four `NEXT_PUBLIC_JUDGES_*_ADDRESS` values. Passkey register, bind and prove also need `RP_ID=localhost`,
`RP_ORIGIN=http://localhost:3000` and `JUDGES_DOMAIN_SECRET` (generate with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). A wallet extension on Monad
Testnet with some testnet MON is needed for the demo transactions. Suggested order: `/demo` (register,
connect, bind), then `/demo/faucet` twice; the second claim should show the REJECTED stamp.

**Env note.** Foundry reads `.env` from the project root that contains `foundry.toml`, so RPC
variables for `forge` belong in `contracts/.env`, not the repo-root `.env`.

**Codebase map.** `graphify-out/graph.html` (interactive) and `GRAPH_REPORT.md` describe the codebase
structure for anyone joining.
