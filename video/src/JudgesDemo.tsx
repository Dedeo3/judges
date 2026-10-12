import { Sequence, useVideoConfig } from "remotion";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { Problem } from "./scenes/Problem";
import { Procedure } from "./scenes/Procedure";
import { Verdict } from "./scenes/Verdict";

/**
 * Submission demo video (cap 3:00 — see Judges_README.md §final / STATUS.md). Scene lengths below
 * are placeholders; once real /demo screen-recordings replace Procedure/Verdict, re-time against
 * actual footage rather than these placeholder durations. Record the live demo (register identity
 * → post root → prove → verify → double-claim rejected) AFTER the Vercel redeploy, per STATUS.md.
 */
export function JudgesDemo() {
  const { fps } = useVideoConfig();

  return (
    <>
      <Sequence from={0} durationInFrames={fps * 5}>
        <Intro />
      </Sequence>
      <Sequence from={fps * 5} durationInFrames={fps * 12}>
        <Problem />
      </Sequence>
      <Sequence from={fps * 17} durationInFrames={fps * 20}>
        <Procedure />
      </Sequence>
      {/* The DAO/faucet/agent demos go here as real screen-recordings — see TODO in scenes/Verdict.tsx. */}
      <Sequence from={fps * 37} durationInFrames={fps * 8}>
        <Verdict status="accepted" />
      </Sequence>
      <Sequence from={fps * 45} durationInFrames={fps * 8}>
        <Verdict status="rejected" reason="nullifier already used" />
      </Sequence>
      <Sequence from={fps * 53} durationInFrames={fps * 90 - fps * 53}>
        <Outro />
      </Sequence>
    </>
  );
}
