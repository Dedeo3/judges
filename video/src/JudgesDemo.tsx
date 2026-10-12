import type { ComponentType } from "react";
import { Sequence } from "remotion";
import { Soundtrack } from "./audio/Soundtrack";
import { Agent, Dao, Faucet } from "./scenes/Claims";
import { Holding } from "./scenes/Holding";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { Procedure } from "./scenes/Procedure";
import { Developers, Evidence, Limits, Live, Register } from "./scenes/Site";
import { DEMO, type SceneKey } from "./timeline";

const SCENES: Record<SceneKey, ComponentType> = {
  intro: Intro,
  problem: Problem,
  procedure: Procedure,
  live: Live,
  register: Register,
  faucet: Faucet,
  dao: Dao,
  agent: Agent,
  developers: Developers,
  evidence: Evidence,
  limits: Limits,
  holding: Holding,
  outro: Outro,
};

/**
 * Submission demo video (cap 3:00). The running order, lengths and sound cues are in
 * timeline.ts; SCRIPT.md §3 has the beat sheet and the narration.
 */
export function JudgesDemo() {
  return (
    <>
      {(Object.keys(SCENES) as SceneKey[]).map((key) => {
        const Scene = SCENES[key];
        const { from, frames } = DEMO.scenes[key];
        return (
          <Sequence key={key} name={key} from={from} durationInFrames={frames}>
            <Scene />
          </Sequence>
        );
      })}
      <Soundtrack voice={DEMO.voice} sfx={DEMO.sfx} frames={DEMO.frames} />
    </>
  );
}
