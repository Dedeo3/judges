# Graph Report - D:/judges  (2026-09-19)

## Corpus Check
- Corpus is ~40,808 words - fits in a single context window. You may not need a graph.

## Summary
- 733 nodes · 1003 edges · 64 communities (37 shown, 27 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Popup Connect Flow (SDK↔frontend)
- Next.js API Routes (webauthn/bindings/prove)
- Crypto: Commitment/Nullifier Derivation
- Onchain Contracts & Nullifier Domains
- apps/web package deps
- apps/web devDependencies (lint/tailwind)
- apps/web tsconfig compilerOptions
- Deployment & Popup Integration Docs
- Demo Pages (DAO/Agent/Faucet)
- apps/web workspace deps (@judges/*)
- prover package (circom/snarkjs)
- external-dapp example package
- @judges/crypto package deps
- package.json boilerplate (misc)
- @judges/webauthn package deps
- tsconfig.base.json root config
- tsconfig.build.json config
- tsconfig.json strict/module config
- tsconfig.json module resolution config
- tsconfig.json DOM lib config
- package.json misc (typescript-only)
- E2E popup test (popup.e2e.mjs)
- tsconfig.json node types config
- tsconfig.json node types config (dup)
- tsconfig.json extends base config
- package.json scripts (misc)
- export-abis.ts script
- Repo Bootstrap (Phase 0, docker/CI/workspace)
- WebAuthn spike fixture export script
- Caveman Mode config duplication
- apps/web root layout.tsx
- SDK public types (index.ts)
- static file server script (serve.mjs)
- Next.js 16 agent-rules boilerplate
- DB migration runner (migrate.ts)
- Connect page route (/connect)
- Definition of Done checklist
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- snarkjs type declarations
- Foundry CI job
- Killer Demo script & submission assets
- Post-hackathon roadmap (V1/V2/V3)
- SDK dist extension build script
- circuit build script
- trusted setup script
- snarkjs type declarations (dup)
- local dev-up script
- Hackathon deadline & schedule
- file.svg icon (Next.js boilerplate)
- globe.svg icon (Next.js boilerplate)
- next.svg icon (Next.js boilerplate)
- vercel.svg icon (Next.js boilerplate)
- window.svg icon (Next.js boilerplate)
- Deployed contract addresses (pending)
- Deployment policy (testnet-first gate)
- Track deadline reference
- Judges core idea statement
- 1-wallet-1-user Sybil problem statement
- Mandatory security rules (handover doc)
- Judging rubric weights

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `compilerOptions` - 14 edges
3. `deriveCredentialSecret()` - 12 edges
4. `proveMembership()` - 11 edges
5. `deriveMembershipWitness()` - 11 edges
6. `Judges` - 11 edges
7. `hashToField()` - 10 edges
8. `derivePolicyHashFromHex()` - 10 edges
9. `normalizeOrigin()` - 10 edges
10. `namespacedAppId()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `@judges/sdk package README` --semantically_similar_to--> `JudgesPopupError codes`  [INFERRED] [semantically similar]
  packages/sdk/README.md → docs/integration.md
- `@judges/sdk package README` --semantically_similar_to--> `SDK install and popup flow`  [INFERRED] [semantically similar]
  packages/sdk/README.md → docs/integration.md
- `@judges/sdk package README` --semantically_similar_to--> `App-id namespacing under requesting origin`  [INFERRED] [semantically similar]
  packages/sdk/README.md → docs/integration.md
- `Limitations and Honest Claims (§27)` --conceptually_related_to--> `MVP-only single-contributor trusted setup`  [INFERRED]
  Judges_README.md → IMPLEMENTATION.md
- `POST()` --calls--> `verifyAuthentication()`  [EXTRACTED]
  apps/web/src/app/api/webauthn/auth/verify/route.ts → packages/webauthn/src/authentication.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Caveman-mode instruction duplicated across agent config files** — clinerules_caveman_caveman_mode, github_copilot_instructions_caveman_mode, opencode_agents_caveman_mode, windsurf_rules_caveman_caveman_mode, agents_caveman_mode [INFERRED 0.85]
- **Judges end-to-end trust flow: passkey to on-chain proof** — judges_readme_webauthn, judges_readme_commitment, judges_readme_nullifier, judges_readme_judgesverifier, judges_readme_monad_p256verify [INFERRED 0.85]
- **Hackathon submission gate: Definition of Done plus handover tasks** — judges_readme_definition_of_done, implementation_definition_of_done, sisa_gawean_tugas7_submission_assets, sisa_gawean_final_checklist [INFERRED 0.80]

## Communities (64 total, 27 thin omitted)

### Community 0 - "Popup Connect Flow (SDK↔frontend)"
Cohesion: 0.07
Nodes (47): POST(), ConnectFlow(), initialState(), PageState, shortAddress(), Status, appIdInput, Eip1193 (+39 more)

### Community 1 - "Next.js API Routes (webauthn/bindings/prove)"
Cohesion: 0.07
Nodes (41): POST(), POST(), POST(), POST(), POST(), POST(), BindingRejectReason, BindingResult (+33 more)

### Community 2 - "Crypto: Commitment/Nullifier Derivation"
Cohesion: 0.09
Nodes (38): proveMembership(), toHex32(), deriveCommitment(), deriveCredentialSecret(), hashToField(), toBytes32Hex(), toField(), deriveMembershipWitness() (+30 more)

### Community 3 - "Onchain Contracts & Nullifier Domains"
Cohesion: 0.05
Nodes (49): SybilResistantDAO / AgentRegistry / SybilResistantFaucet, Groth16Verifier (generated contract), JudgesField library, JudgesVerifier (architecture role), MonadP256Adapter (architecture role), Nullifier domains (judges-dao, judges-agent-registry, judges-faucet, judges-demo), NullifierRegistry (architecture role), Binding a proof to a specific action via contextHash (+41 more)

### Community 4 - "apps/web package deps"
Cohesion: 0.06
Nodes (33): dependencies, @simplewebauthn/browser, viem, description, devDependencies, typescript, vitest, . (+25 more)

### Community 5 - "apps/web devDependencies (lint/tailwind)"
Cohesion: 0.06
Nodes (30): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/react (+22 more)

### Community 6 - "apps/web tsconfig compilerOptions"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+22 more)

### Community 7 - "Deployment & Popup Integration Docs"
Cohesion: 0.10
Nodes (28): Hosting architecture (Vercel + Neon + Upstash + Foundry/Monad), Contracts → Monad Testnet deploy runbook, Datastores provisioning (Neon + Upstash), Web app → Vercel deployment, End-to-end verification checklist (manual, real authenticator), JudgesPopupError codes, SDK install and popup flow, App-id namespacing under requesting origin (+20 more)

### Community 8 - "Demo Pages (DAO/Agent/Faucet)"
Cohesion: 0.18
Nodes (19): AgentDemoPage(), DaoDemoPage(), FaucetDemoPage(), DemoShell(), DemoStatus, agentRegistryAbi, daoAbi, faucetAbi (+11 more)

### Community 9 - "apps/web workspace deps (@judges/*)"
Cohesion: 0.08
Nodes (25): dependencies, @judges/crypto, @judges/sdk, @judges/types, @judges/webauthn, @neondatabase/serverless, next, react (+17 more)

### Community 10 - "prover package (circom/snarkjs)"
Cohesion: 0.09
Nodes (22): circomlib, dependencies, @judges/crypto, snarkjs, devDependencies, circomlib, tsx, @types/node (+14 more)

### Community 11 - "external-dapp example package"
Cohesion: 0.09
Nodes (21): esbuild, dependencies, @judges/sdk, description, devDependencies, esbuild, puppeteer-core, typescript (+13 more)

### Community 12 - "@judges/crypto package deps"
Cohesion: 0.10
Nodes (20): dependencies, @judges/types, poseidon-lite, devDependencies, @types/node, typescript, vitest, @judges/types (+12 more)

### Community 13 - "package.json boilerplate (misc)"
Cohesion: 0.10
Nodes (19): description, devDependencies, typescript, engines, node, typescript, name, packageManager (+11 more)

### Community 14 - "@judges/webauthn package deps"
Cohesion: 0.10
Nodes (19): dependencies, @judges/types, @simplewebauthn/server, @simplewebauthn/types, devDependencies, @types/node, typescript, @judges/types (+11 more)

### Community 15 - "tsconfig.base.json root config"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+7 more)

### Community 16 - "tsconfig.build.json config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, declarationMap, noEmit, outDir, rootDir, sourceMap, exclude (+5 more)

### Community 17 - "tsconfig.json strict/module config"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 18 - "tsconfig.json module resolution config"
Cohesion: 0.17
Nodes (11): compilerOptions, module, moduleResolution, noEmit, types, extends, include, node (+3 more)

### Community 19 - "tsconfig.json DOM lib config"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, outDir, rootDir, extends, include, DOM, ES2022 (+2 more)

### Community 20 - "package.json misc (typescript-only)"
Cohesion: 0.18
Nodes (10): devDependencies, typescript, typescript, main, name, private, scripts, typecheck (+2 more)

### Community 21 - "E2E popup test (popup.e2e.mjs)"
Cohesion: 0.24
Nodes (6): failed, results, resultText(), sleep(), userDataDir, waitForResult()

### Community 22 - "tsconfig.json node types config"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 23 - "tsconfig.json node types config (dup)"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, extends, include, node, src (+1 more)

### Community 24 - "tsconfig.json extends base config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, src, ../../tsconfig.base.json

### Community 25 - "package.json scripts (misc)"
Cohesion: 0.33
Nodes (5): name, private, scripts, dev, version

### Community 26 - "export-abis.ts script"
Cohesion: 0.33
Nodes (4): blocks, CONTRACTS, OUT_DIR, TARGET

### Community 27 - "Repo Bootstrap (Phase 0, docker/CI/workspace)"
Cohesion: 0.40
Nodes (6): docker-compose postgres service, docker-compose redis service, CI: node job (typecheck/lint/test), Phase 0 — Repository Bootstrap, Backend stack: Next.js API routes on Vercel + Neon + Upstash, pnpm workspace definition (apps/*, packages/*, prover)

### Community 28 - "WebAuthn spike fixture export script"
Cohesion: 0.53
Nodes (5): b64url(), hex(), main(), OUT_FILE, solBytes()

### Community 29 - "Caveman Mode config duplication"
Cohesion: 0.40
Nodes (5): Caveman Mode (communication style), Caveman Mode (communication style), Caveman Mode (communication style), Caveman Mode (communication style), Caveman Mode (communication style)

### Community 30 - "apps/web root layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 31 - "SDK public types (index.ts)"
Cohesion: 0.40
Nodes (4): AssuranceLevel, ProveRequest, VerificationPolicy, VerifyResult

### Community 32 - "static file server script (serve.mjs)"
Cohesion: 0.50
Nodes (3): port, root, types

### Community 33 - "Next.js 16 agent-rules boilerplate"
Cohesion: 0.67
Nodes (3): Next.js 16 Agent Rules Block, apps/web/CLAUDE.md @AGENTS.md reference, apps/web create-next-app boilerplate README

### Community 36 - "Definition of Done checklist"
Cohesion: 0.67
Nodes (3): Definition of Done (hackathon submission gate), Definition of Done (§28), Final checklist before submit

## Knowledge Gaps
- **329 isolated node(s):** `name`, `version`, `private`, `dev`, `eslintConfig` (+324 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `proveMembership()` connect `Crypto: Commitment/Nullifier Derivation` to `Popup Connect Flow (SDK↔frontend)`, `Next.js API Routes (webauthn/bindings/prove)`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `deriveCredentialSecret()` connect `Crypto: Commitment/Nullifier Derivation` to `Next.js API Routes (webauthn/bindings/prove)`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `deriveMembershipWitness()` connect `Crypto: Commitment/Nullifier Derivation` to `Next.js API Routes (webauthn/bindings/prove)`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _329 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Popup Connect Flow (SDK↔frontend)` be split into smaller, more focused modules?**
  _Cohesion score 0.06768388106416276 - nodes in this community are weakly interconnected._
- **Should `Next.js API Routes (webauthn/bindings/prove)` be split into smaller, more focused modules?**
  _Cohesion score 0.0662004662004662 - nodes in this community are weakly interconnected._
- **Should `Crypto: Commitment/Nullifier Derivation` be split into smaller, more focused modules?**
  _Cohesion score 0.08974358974358974 - nodes in this community are weakly interconnected._