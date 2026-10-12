import { Sequence, useVideoConfig } from "remotion";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";

/**
 * Submission pitch video (cap 2:00). Pitch is narration-led (founder/market story), not a product
 * walkthrough — Procedure/Verdict scenes belong in JudgesDemo.tsx, not here. Fill in the middle
 * once the market doc (STATUS.md item F) exists: team, traction, why-now.
 */
export function JudgesPitch() {
  const { fps } = useVideoConfig();

  return (
    <>
      <Sequence from={0} durationInFrames={fps * 5}>
        <Intro />
      </Sequence>
      <Sequence from={fps * 5} durationInFrames={fps * 12}>
        <Problem />
      </Sequence>
      {/* TODO: team / traction / ask scene — depends on STATUS.md item F (market doc). */}
      <Sequence from={fps * 17} durationInFrames={fps * 75 - fps * 17}>
        <Outro />
      </Sequence>
    </>
  );
}
