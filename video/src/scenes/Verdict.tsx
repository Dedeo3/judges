import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Label, Scene } from "./Scene";

/**
 * Mirrors apps/web/src/components/Verdict.tsx: ACCEPTED in plain ink, REJECTED is the only place
 * the red accent appears, stamped in with a little overshoot.
 *
 * TODO: this is the scene to replace with a real screen-recording of a double-claim on
 * /demo/faucet (or /demo/dao) once an identity + root exist on-chain — same NullifierAlreadyUsed
 * verdict the live demo shows, just captured instead of re-animated.
 */
export function Verdict({ status, reason }: { status: "accepted" | "rejected"; reason?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, fps * 0.25, fps * 0.4], [1.4, 0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  const rejected = status === "rejected";

  return (
    <Scene>
      <Label>Verdict requested</Label>
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          fontSize: 96,
          fontWeight: 600,
          color: rejected ? colors.accent : colors.ink,
          border: `3px solid ${rejected ? colors.accent : colors.ink}`,
          display: "inline-block",
          padding: "16px 48px",
          alignSelf: "flex-start",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {rejected ? "Rejected" : "Accepted"}
      </div>
      {reason && (
        <div style={{ fontFamily: fonts.mono, fontSize: 24, color: colors.muted, marginTop: 24 }}>{reason}</div>
      )}
    </Scene>
  );
}
