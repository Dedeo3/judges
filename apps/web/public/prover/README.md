# Browser-proving artifacts (Redesign B)

`lib/proveBrowser.ts` fetches the v2 circuit's wasm + proving key from here at runtime:

- `judges_membership_v2_js/judges_membership_v2.wasm`
- `judges_membership_v2_final.zkey`  (~4.9 MB)

These **must be committed** — Vercel serves `public/` straight from git, so a gitignored artifact
would 404 at runtime and browser proving would fail. They are ~4.9 MB + ~1.8 MB (fine for git).
After the trusted setup, copy them from the prover build output and commit them:

```bash
pnpm --filter @judges/prover run build:v2
pnpm --filter @judges/prover run setup:v2
mkdir -p apps/web/public/prover/judges_membership_v2_js
cp prover/build/judges_membership_v2_js/judges_membership_v2.wasm \
   apps/web/public/prover/judges_membership_v2_js/
cp prover/build/judges_membership_v2_final.zkey apps/web/public/prover/
```

The `.zkey` must be the exact one the deployed `JudgesGroth16Verifier` was exported from, or every
proof fails on-chain. On Vercel, these files are served as static assets from `public/`.
