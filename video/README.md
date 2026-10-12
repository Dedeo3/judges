# Judges — submission videos (Remotion)

Two compositions, one project:

- **JudgesDemo** — product walkthrough, cap 3:00 (hackathon submission rule).
- **JudgesPitch** — founder/market pitch, cap 2:00.

Both share the scenes in `src/scenes/` and the live site's visual language: paper/ink colours,
Newsreader + IBM Plex Mono, red reserved for what gets rejected (`src/theme.ts`, mirroring
`apps/web/src/app/globals.css` and `DESIGN-FE.md`). The script, the design rules and the
reasoning behind each scene are in [`SCRIPT.md`](./SCRIPT.md) — read it before editing a scene.

## Setup

```bash
pnpm install   # from the repo root; this is a normal pnpm workspace package
```

## Preview

```bash
pnpm --filter @judges/video start
```

Opens Remotion Studio, where both compositions can be scrubbed frame by frame.

## Render

```bash
pnpm --filter @judges/video build          # JudgesDemo -> out/judges-demo.mp4
pnpm --filter @judges/video exec remotion render src/index.ts JudgesPitch out/judges-pitch.mp4
```

Add `--frames=0-839` to render only part of a composition (that range is the title, problem
and mechanism scenes).

## Checking a scene

`src/dev/` holds a contact sheet: one still showing a scene frozen at several frames, which is
quicker than scrubbing when adjusting timing. Put the frames in a JSON file and pass it in:

```json
{ "scene": "problem", "frames": [4, 32, 66, 100, 140, 170, 200, 256, 296], "cols": 3 }
```

```bash
pnpm --filter @judges/video contact --props=path/to/frames.json   # -> out/contact.png
```

`scene` is `intro`, `problem` or `procedure`; frames are relative to the start of that scene.

## Status

The first 28 seconds of `JudgesDemo` (title, problem, mechanism) are built. The rest is
placeholder:

- `scenes/Verdict.tsx` — to be replaced or backed by real screen recordings of `/demo`
  (register → post root → prove → verify → second claim rejected) once that flow has been run
  end to end on the deployed site (see the root `STATUS.md`).
- `JudgesPitch.tsx` — the team/traction/ask scenes depend on the market doc (`STATUS.md`
  item F), which does not exist yet.
- `scenes/Outro.tsx` — add the live site URL once the Vercel redeploy is confirmed.

How to capture that footage, take by take, is in [`RECORDING.md`](./RECORDING.md).

To add a screen recording: drop the file in `public/`, reference it with Remotion's
`<OffthreadVideo src={staticFile("name.mp4")} />` inside a scene, and wrap that scene in a
`<Sequence>` in `JudgesDemo.tsx` sized to the recording's real length.
