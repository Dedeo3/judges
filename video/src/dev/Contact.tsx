import type { ComponentType } from "react";
import { AbsoluteFill, Freeze } from "remotion";
import { JudgesDemo } from "../JudgesDemo";
import { Agent, Dao, Faucet } from "../scenes/Claims";
import { Holding } from "../scenes/Holding";
import { Intro } from "../scenes/Intro";
import { Outro } from "../scenes/Outro";
import { Problem } from "../scenes/Problem";
import { Procedure } from "../scenes/Procedure";
import { Developers, Evidence, Limits, Live, Register } from "../scenes/Site";

// `demo` is the whole video, so its frames are on the video's clock; the rest are one scene each.
const SCENES: Record<string, ComponentType> = {
  demo: JudgesDemo,
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

export type ContactProps = { scene: string; frames: number[]; cols: number };

/**
 * Review aid, not part of either video: one still showing a scene frozen at several frames, so
 * timing and layout can be checked at a glance. See README "Checking a scene".
 */
export function Contact({ scene, frames, cols }: ContactProps) {
  const Scene = SCENES[scene];
  if (!Scene) throw new Error(`Unknown scene "${scene}". One of: ${Object.keys(SCENES).join(", ")}`);
  const scale = 1 / cols;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {frames.map((frame, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (i % cols) * 1920 * scale,
            top: Math.floor(i / cols) * 1080 * scale,
            width: 1920,
            height: 1080,
            overflow: "hidden",
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          <Freeze frame={frame}>
            <Scene />
          </Freeze>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              padding: "4px 14px",
              background: "rgba(0, 0, 0, 0.75)",
              color: "#fff",
              font: "700 40px monospace",
            }}
          >
            {frame}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
}
