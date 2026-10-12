import { Composition } from "remotion";
import { JudgesDemo } from "./JudgesDemo";
import { JudgesPitch } from "./JudgesPitch";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Submission demo video, cap 3:00. Scaffolded at 1:30 — extend scene durations in
          JudgesDemo.tsx as real footage/screen-recordings replace the placeholder scenes. */}
      <Composition
        id="JudgesDemo"
        component={JudgesDemo}
        durationInFrames={90 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Submission pitch video, cap 2:00. Scaffolded at 1:15. */}
      <Composition
        id="JudgesPitch"
        component={JudgesPitch}
        durationInFrames={75 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
