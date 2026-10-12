import type { Sfx } from "./audio/cues";
import { AGENT_FRAMES, AGENT_SFX, AGENT_VOICE, DAO_FRAMES, DAO_SFX, DAO_VOICE, FAUCET_FRAMES, FAUCET_SFX, FAUCET_VOICE } from "./scenes/Claims";
import { HOLDING_FRAMES, HOLDING_SFX, HOLDING_VOICE } from "./scenes/Holding";
import { OUTRO_FRAMES, OUTRO_SFX, OUTRO_VOICE } from "./scenes/Outro";
import { PROBLEM_VOICE } from "./scenes/Problem";
import { PROCEDURE_VOICE } from "./scenes/Procedure";
import {
  DEVELOPERS_FRAMES,
  DEVELOPERS_SFX,
  DEVELOPERS_VOICE,
  EVIDENCE_FRAMES,
  EVIDENCE_SFX,
  EVIDENCE_VOICE,
  LIMITS_FRAMES,
  LIMITS_SFX,
  LIMITS_VOICE,
  LIVE_FRAMES,
  LIVE_SFX,
  LIVE_VOICE,
  REGISTER_FRAMES,
  REGISTER_SFX,
  REGISTER_VOICE,
} from "./scenes/Site";
import { type Cue, FPS, spoken } from "./voiceover";

/**
 * The demo video's running order. Each scene owns its own length, narration cues and sound
 * effects (in its own frames); this file lines the scenes up end to end and turns those cues
 * into one list on the video's clock, for the soundtrack.
 *
 * Lengths are chosen against the music: it is 120 BPM, so a beat is 15 frames and a bar is 60.
 * Every scene starts on a beat, and the verdict stamps land on bar lines, several of them on the
 * track's own accents (0:62, 0:70, 0:74, 1:30). If a narration line is re-recorded and no longer
 * fits its slot, `check()` below says which one.
 */

// The stamps and pops of the first three scenes, which predate the soundtrack. Scene frames.
const INTRO_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.7 },
  { name: "marker", at: 42, gain: 0.5 },
  { name: "marker", at: 48, gain: 0.5 },
  { name: "stamp", at: 62 },
];
const PROBLEM_SFX: Sfx[] = [
  ...[12, 30, 40, 50, 60].map((at): Sfx => ({ name: "tick", at, gain: 0.7 })),
  { name: "whoosh", at: 78, gain: 0.35 },
  { name: "paper", at: 150, gain: 0.5 },
  ...[230, 240, 250].map((at): Sfx => ({ name: "marker", at, gain: 0.6 })),
  { name: "stamp", at: 258, gain: 0.8 },
];
const PROCEDURE_SFX: Sfx[] = [
  ...[14, 21, 28, 35].map((at): Sfx => ({ name: "tick", at, gain: 0.7 })),
  ...[80, 170, 260].map((at): Sfx => ({ name: "whoosh", at, gain: 0.3 })),
  { name: "marker", at: 140, gain: 0.5 },
  { name: "tick", at: 220 },
  { name: "stamp", at: 286 },
  { name: "stamp", at: 322, gain: 0.6 },
  { name: "whoosh", at: 362, gain: 0.3 },
];

const ORDER = [
  { key: "intro", frames: 3 * FPS, voice: [], sfx: INTRO_SFX },
  { key: "problem", frames: 10 * FPS, voice: PROBLEM_VOICE, sfx: PROBLEM_SFX },
  { key: "procedure", frames: 15 * FPS, voice: PROCEDURE_VOICE, sfx: PROCEDURE_SFX },
  { key: "live", frames: LIVE_FRAMES, voice: LIVE_VOICE, sfx: LIVE_SFX },
  { key: "register", frames: REGISTER_FRAMES, voice: REGISTER_VOICE, sfx: REGISTER_SFX },
  { key: "faucet", frames: FAUCET_FRAMES, voice: FAUCET_VOICE, sfx: FAUCET_SFX },
  { key: "dao", frames: DAO_FRAMES, voice: DAO_VOICE, sfx: DAO_SFX },
  { key: "agent", frames: AGENT_FRAMES, voice: AGENT_VOICE, sfx: AGENT_SFX },
  { key: "developers", frames: DEVELOPERS_FRAMES, voice: DEVELOPERS_VOICE, sfx: DEVELOPERS_SFX },
  { key: "evidence", frames: EVIDENCE_FRAMES, voice: EVIDENCE_VOICE, sfx: EVIDENCE_SFX },
  { key: "limits", frames: LIMITS_FRAMES, voice: LIMITS_VOICE, sfx: LIMITS_SFX },
  { key: "holding", frames: HOLDING_FRAMES, voice: HOLDING_VOICE, sfx: HOLDING_SFX },
  { key: "outro", frames: OUTRO_FRAMES, voice: OUTRO_VOICE, sfx: OUTRO_SFX },
] as const satisfies readonly { key: string; frames: number; voice: readonly Cue[]; sfx: readonly Sfx[] }[];

export type SceneKey = (typeof ORDER)[number]["key"];

function build() {
  const scenes = {} as Record<SceneKey, { from: number; frames: number }>;
  const voice: Cue[] = [];
  const sfx: Sfx[] = [];
  let from = 0;
  for (const scene of ORDER) {
    scenes[scene.key] = { from, frames: scene.frames };
    for (const cue of scene.voice) voice.push({ id: cue.id, at: from + cue.at });
    for (const cue of scene.sfx) sfx.push({ ...cue, at: from + cue.at });
    from += scene.frames;
  }
  return { scenes, voice, sfx, frames: from };
}

function check({ scenes, voice, frames }: ReturnType<typeof build>) {
  for (const [i, cue] of voice.entries()) {
    const ends = cue.at + spoken(cue.id);
    const next = voice[i + 1]?.at ?? frames;
    if (ends > next) throw new Error(`Narration "${cue.id}" runs ${ends - next} frames into what follows it. Re-time its scene.`);
  }
  for (const [key, scene] of Object.entries(scenes)) {
    if (scene.from % 15 !== 0) throw new Error(`Scene "${key}" starts at frame ${scene.from}, off the music's beat (every 15 frames).`);
  }
}

export const DEMO = build();
check(DEMO);
