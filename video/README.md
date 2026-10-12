# Judges — submission videos (Remotion)

Two compositions, one project:

- **JudgesDemo** — product walkthrough, 2:23 (cap 3:00). Built: animated opening, real screen
  recordings of the three demo apps, narration, music and sound effects.
- **JudgesPitch** — founder/market pitch, cap 2:00. Still a scaffold.

Both share the scenes in `src/scenes/` and the live site's visual language: paper/ink colours,
Newsreader + IBM Plex Mono, red reserved for what gets rejected (`src/theme.ts`, mirroring
`apps/web/src/app/globals.css` and `DESIGN-FE.md`). The script, the design rules and the
reasoning behind each scene are in [`SCRIPT.md`](./SCRIPT.md) — read it before editing a scene.

## Setup

```bash
pnpm install   # from the repo root; this is a normal pnpm workspace package
```

`ffmpeg` has to be on `PATH`: the audio scripts and the final loudness pass use it.

## Assets

The video needs three kinds of file in `public/` that are not in the repository.

| What | Where | How to get it |
|---|---|---|
| Screen recordings | `public/*.mp4` | Recorded by hand, see [`RECORDING.md`](./RECORDING.md). Too large to commit. |
| Music and sound effects | `public/music/`, `public/sfx/` | `pnpm --filter @judges/video audio` downloads them from Mixkit and prepares them. Free to use in a video, not ours to redistribute. |
| Narration | `public/vo/*.mp3` | Committed. Regenerate with `pnpm --filter @judges/video voice` (below). |

The recordings the scenes expect, by file name: `A2-landing.mp4` (site walkthrough),
`B-faucet-accepted-rejected.mp4`, `C-dao-accepted-rejected.mp4`, `D-agent-accepted.mp4`. Each
scene addresses its recording by the second and by pixel position, so a re-recorded take needs
those numbers checked again (`src/scenes/Claims.tsx`, `src/scenes/Site.tsx`).

## Preview

```bash
pnpm --filter @judges/video start
```

Opens Remotion Studio, where both compositions can be scrubbed frame by frame. The recordings
step rather than play smoothly in the Studio, because each frame is looked up by time; the
render is unaffected.

## Render

```bash
pnpm --filter @judges/video build   # -> out/judges-demo.mp4
```

This renders to `out/judges-demo.raw.mp4` and then runs `scripts/finish.mjs`, which sets the
loudness to -16 LUFS and writes `out/judges-demo.mp4`. Upload that one.

```bash
pnpm --filter @judges/video exec remotion render src/index.ts JudgesPitch out/judges-pitch.mp4
```

Add `--frames=0-839` to render only part of a composition (that range is the title, problem
and mechanism scenes).

## Narration

The words are in `src/voiceover/script.json`, one entry per line. To change the narration, edit
a line and run:

```bash
pnpm --filter @judges/video voice
```

It needs `ELEVENLABS_API_KEY` in `video/.env` (never committed). Only lines whose text or voice
settings changed are generated again, so a one-line edit costs that line's characters. The
script writes `public/vo/<id>.mp3` and updates `src/voiceover/timing.json` with when each word
is spoken; captions and several on-screen moments are timed from that file.

To use another voice, change `voice` in `script.json` and run `voice` again; every line is
regenerated. To compare voices first, this writes one sentence in four built-in voices to
`out/voice-samples/`:

```bash
pnpm --filter @judges/video voice -- --samples
```

A free ElevenLabs plan can only use the built-in voices through the API. If a new take of a
line is longer than its slot, the build stops with a message naming the line; see
`src/timeline.ts`.

## Checking a scene

`src/dev/` holds a contact sheet: one still showing a scene frozen at several frames, which is
quicker than scrubbing when adjusting timing. Put the frames in a JSON file and pass it in:

```json
{ "scene": "faucet", "frames": [12, 175, 360, 668, 906], "cols": 3 }
```

```bash
pnpm --filter @judges/video contact --props=path/to/frames.json   # -> out/contact.png
```

`scene` is one of `intro`, `problem`, `procedure`, `live`, `register`, `faucet`, `dao`,
`agent`, `developers`, `evidence`, `limits`, `holding`, `outro`, with frames counted from the
start of that scene. Use `demo` for the whole video, with frames on the video's clock.

## Where things are

| File | What it holds |
|---|---|
| `src/timeline.ts` | Running order, scene lengths, and every narration and sound cue on the video's clock |
| `src/scenes/Intro.tsx`, `Problem.tsx`, `Procedure.tsx` | The animated opening (0:00–0:28) |
| `src/scenes/Site.tsx` | Shots of the site: landing page, registration, SDK, gas table, limits |
| `src/scenes/Claims.tsx` | The three demo apps: faucet, DAO, agent registry |
| `src/scenes/Holding.tsx`, `Outro.tsx` | Closing statement and end card |
| `src/scenes/exhibit.tsx` | How a recording is framed: sheet, wallet sheet, notes, marks, speed chip |
| `src/footage/Footage.tsx` | Showing part of a recording at a given second; camera moves and time remapping |
| `src/audio/Soundtrack.tsx` | Narration, music ducking and effects |

## Status

`JudgesDemo` is complete. `JudgesPitch` still has only the title and problem scenes: its
middle depends on the market doc (`STATUS.md` item F), which does not exist yet.

Credits to keep with the video wherever it is posted: narration generated with ElevenLabs
(required on their free plan); music "Your Breath" by Eugenio Mininni and sound effects, both
from Mixkit under the Mixkit free licences.
