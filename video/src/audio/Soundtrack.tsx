import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { type Cue, clipFrames, spoken } from "../voiceover";
import type { Sfx } from "./cues";

/**
 * Narration, music and effects for a whole video.
 *
 * Levels, relative to the narration (about -24 LUFS as generated): the music sits 15 dB under it
 * while someone is speaking, comes up 7 dB in the gaps, and a little more before the first line
 * and after the last. Everything is mixed 6 dB down to leave headroom for the stamps;
 * `scripts/finish.mjs` brings the finished file up to -16 LUFS.
 */

const MASTER = 0.5;
const db = (value: number) => 10 ** (value / 20);

/** The prepared track is about -16 LUFS; these put it at -39, -32 and -29. */
const MUSIC = { under: db(-23), between: db(-16), open: db(-13) };
const VOICE = 1;
const SFX_GAIN: Record<Sfx["name"], number> = { stamp: 0.6, tick: 0.4, paper: 0.55, marker: 0.3, click: 0.5, whoosh: 0.5 };

const RAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function Soundtrack({ voice, sfx, frames }: { voice: Cue[]; sfx: Sfx[]; frames: number }) {
  const spans = voice.map((cue) => [cue.at, cue.at + spoken(cue.id)] as const);
  const first = spans[0]?.[0] ?? frames;
  const last = spans.at(-1)?.[1] ?? 0;

  const music = (frame: number) => {
    // 1 while a line is spoken, easing down ahead of it and back up after it.
    let speaking = 0;
    for (const [from, to] of spans) {
      speaking = Math.max(speaking, interpolate(frame, [from - 10, from - 2, to + 4, to + 22], [0, 1, 1, 0], RAMP));
    }
    const resting = frame < first || frame > last ? MUSIC.open : MUSIC.between;
    const level = resting + (MUSIC.under - resting) * speaking;
    const fade = interpolate(frame, [0, 8, frames - 70, frames - 4], [0, 1, 1, 0], RAMP);
    return level * fade * MASTER;
  };

  return (
    <>
      <Audio src={staticFile("music/your-breath.mp3")} volume={music} />
      {voice.map((cue) => (
        <Sequence key={cue.id} from={cue.at} durationInFrames={clipFrames(cue.id)} layout="none">
          <Audio src={staticFile(`vo/${cue.id}.mp3`)} volume={VOICE * MASTER} />
        </Sequence>
      ))}
      {sfx.map((cue, i) => (
        <Sequence key={`${cue.name}-${cue.at}-${i}`} from={cue.at} durationInFrames={36} layout="none">
          <Audio src={staticFile(`sfx/${cue.name}.mp3`)} volume={SFX_GAIN[cue.name] * (cue.gain ?? 1) * MASTER} />
        </Sequence>
      ))}
    </>
  );
}
