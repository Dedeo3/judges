# External dApp example

A separate site, on its own origin, integrating Judges the way a real third party would: it
installs `@judges/sdk` as a package (from a locally packed tarball, until it's on npm) and is not
part of the Judges monorepo's workspace.

## Run it

```bash
# 1. Judges itself, on http://localhost:3000
pnpm --filter @judges/web dev

# 2. This example, on http://localhost:4000
cd examples/external-dapp
npm run setup     # packs the SDK into a tarball and installs it
npm run build
npm run serve
```

Open http://localhost:4000, enter a wallet address, and press **Verify with Judges**. The popup
opens on :3000 — a different origin — runs the passkey ceremony there, and posts only the proof
back.

A full proof needs the Judges backend configured (Neon, see `docs/deployment.md`) and a
passkey on a real device. Without them the flow still works up to the ceremony, which is enough to
see the cross-origin handshake.

## Security regression test

```bash
npm run e2e
```

Drives both origins in an isolated headless Chrome profile and checks the attacks, not just the
happy path: a forged requesting origin, a message targeted at the wrong origin, a proof message
from a window other than the opened popup, and a proof for another app's namespace. It needs both
servers from above running. See the header of `e2e/popup.e2e.mjs` for exactly what it does and
does not cover.
