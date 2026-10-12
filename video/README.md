# Judges — submission videos (Remotion)

Two compositions, one project:

- **JudgesDemo** — product walkthrough, cap 3:00 (hackathon submission rule).
- **JudgesPitch** — founder/market pitch, cap 2:00.

Both share the same scenes (`src/scenes/*.tsx`) and the live site's visual language — paper/ink
colors, Newsreader + IBM Plex Mono, red accent reserved for REJECTED (see `src/theme.ts`, mirrors
`apps/web/src/app/globals.css` and `DESIGN-FE.md`).

## Setup

```bash
pnpm install   # from the repo root; this is a normal pnpm workspace package
```

## Preview

```bash
pnpm --filter @judges/video start
```

Opens Remotion Studio, where you can scrub both compositions frame-by-frame.

## Render

```bash
pnpm --filter @judges/video build          # JudgesDemo -> out/judges-demo.mp4
pnpm --filter @judges/video exec remotion render src/index.ts JudgesPitch out/judges-pitch.mp4
```

## Status

Scaffolded, not finished. Every scene with a `TODO` comment is a placeholder animation standing in
for a real screen-recording or a piece of copy that depends on other work landing first:

- `scenes/Procedure.tsx`, `scenes/Verdict.tsx` — replace with real screen-recordings of `/demo`
  (register → post root → prove → verify → double-claim rejected) once that flow has been run
  end-to-end on the redeployed site (see root `STATUS.md`).
- `JudgesPitch.tsx` — the team/traction/ask scene depends on the market doc (`STATUS.md` item F),
  which doesn't exist yet.
- `scenes/Outro.tsx` — fill in the live site URL once the Vercel redeploy with Privy + the
  Redesign B merge is confirmed.

To add a real screen-recording: drop the video file in `public/`, then reference it with
Remotion's `<OffthreadVideo src={staticFile("name.mp4")} />` inside a scene, wrapped in a
`<Sequence>` in `JudgesDemo.tsx`/`JudgesPitch.tsx` sized to the recording's actual length.
