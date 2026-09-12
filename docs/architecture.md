# Architecture

Filled in as contracts are deployed (see [IMPLEMENTATION.md](../IMPLEMENTATION.md) Phase 8/9).

## Hosting

- **Frontend + backend**: `apps/web` (Next.js) deployed as a single unit on **Vercel** — API routes under `src/app/api/**` run as Vercel Functions, no standalone server process.
- **Postgres**: **Neon** (serverless, free tier), pooled connection string for use from serverless functions.
- **Redis** (WebAuthn challenge storage, session state): **Upstash** (REST-based, free tier).
- **Contracts**: Foundry-deployed to Monad Testnet, then Monad Mainnet (Phase 9) — independent of web hosting.

## Deployed Addresses

### Monad Testnet (chain ID 10143)

| Contract | Address |
|---|---|
| JudgesVerifier | _pending_ |
| JudgesRegistry | _pending_ |
| NullifierRegistry | _pending_ |

### Monad Mainnet (chain ID 143)

| Contract | Address |
|---|---|
| JudgesVerifier | _pending_ |
| JudgesRegistry | _pending_ |
| NullifierRegistry | _pending_ |
