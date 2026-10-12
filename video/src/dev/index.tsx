import { Composition, registerRoot } from "remotion";
import { Contact, type ContactProps } from "./Contact";

const defaults: ContactProps = { scene: "intro", frames: [0, 10, 20, 30, 40, 50, 60, 75, 89], cols: 3 };

// Freeze clamps to the composition's length, so this has to be at least as long as the longest scene.
function DevRoot() {
  return <Composition id="Contact" component={Contact} width={1920} height={1080} fps={30} durationInFrames={3000} defaultProps={defaults} />;
}

registerRoot(DevRoot);
