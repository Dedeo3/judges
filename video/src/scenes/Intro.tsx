import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Scene } from "./Scene";

/** Title card. TODO: swap tagline once the market doc settles on final wording. */
export function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subOpacity = interpolate(frame, [fps * 0.6, fps * 1.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Scene dark>
      <div style={{ opacity, fontSize: 104, fontWeight: 600 }}>Judges</div>
      <div
        style={{
          opacity: subOpacity,
          fontFamily: fonts.mono,
          fontSize: 28,
          color: colors.paper,
          marginTop: 24,
          maxWidth: 1100,
        }}
      >
        Prove a wallet is backed by a passkey that passed user verification — without disclosing
        anything else. Verified on Monad.
      </div>
    </Scene>
  );
}
