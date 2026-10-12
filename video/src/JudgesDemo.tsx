import { Sequence, useVideoConfig } from "remotion";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { Procedure } from "./scenes/Procedure";
import { Verdict } from "./scenes/Verdict";

/**
 * Submission demo video (cap 3:00 — see Judges_README.md §final / STATUS.md). Intro, Problem and
 * Procedure are animated to exactly the lengths below (SCRIPT.md §3), so changing a duration
 * means re-timing that scene. Verdict and Outro lengths are placeholders: re-time them against
 * the real /demo screen recordings (register identity → post root → prove → verify → second
 * claim rejected), which have to be captured after the Vercel redeploy, per STATUS.md.
 */
export function JudgesDemo() {
  const { fps } = useVideoConfig();

  return (
    <>
      <Sequence from={0} durationInFrames={fps * 3}>
        <Intro />
      </Sequence>
      <Sequence from={fps * 3} durationInFrames={fps * 10}>
        <Problem />
      </Sequence>
      <Sequence from={fps * 13} durationInFrames={fps * 15}>
        <Procedure />
      </Sequence>
      {/* The DAO/faucet/agent demos go here as real screen-recordings — see TODO in scenes/Verdict.tsx. */}
      <Sequence from={fps * 28} durationInFrames={fps * 8}>
        <Verdict status="accepted" />
      </Sequence>
      <Sequence from={fps * 36} durationInFrames={fps * 8}>
        <Verdict status="rejected" reason="nullifier already used" />
      </Sequence>
      <Sequence from={fps * 44} durationInFrames={fps * 90 - fps * 44}>
        <Outro />
      </Sequence>
    </>
  );
}
