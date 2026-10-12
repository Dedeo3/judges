import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Scene } from "./Scene";

/** TODO: fill repo/live-site URLs once Vercel redeploy + npm publish land. */
export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.6], [0, 1], { extrapolateRight: "clamp" });

  return (
    <Scene dark>
      <div style={{ opacity, fontSize: 72, fontWeight: 600 }}>Judges</div>
      <div style={{ opacity, fontFamily: fonts.mono, fontSize: 24, color: colors.paper, marginTop: 16 }}>
        github.com/Dedeo3/judges
      </div>
      <div style={{ opacity, fontFamily: fonts.mono, fontSize: 24, color: colors.muted, marginTop: 8 }}>
        Monad Testnet · chain 10143
      </div>
    </Scene>
  );
}
