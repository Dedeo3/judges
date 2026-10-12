import { Composition } from "remotion";
import { JudgesDemo } from "./JudgesDemo";
import { JudgesPitch } from "./JudgesPitch";
import { DEMO } from "./timeline";
import { FPS } from "./voiceover";

const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Submission demo video, cap 3:00. Its length is the sum of its scenes (timeline.ts). */}
      <Composition id="JudgesDemo" component={JudgesDemo} durationInFrames={DEMO.frames} fps={FPS} width={WIDTH} height={HEIGHT} />

      {/* Submission pitch video, cap 2:00. Scaffolded at 1:15. */}
      <Composition id="JudgesPitch" component={JudgesPitch} durationInFrames={75 * FPS} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
};
