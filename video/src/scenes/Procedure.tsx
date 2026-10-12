import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { Label, Rule, Scene } from "./Scene";

// Same five steps as the landing page's §3 Procedure diagram (apps/web/src/app/page.tsx).
const STEPS = [
  { title: "Passkey", sub: "The private key stays on the device" },
  { title: "User verification", sub: "Biometric or PIN, checked by the device" },
  { title: "Proof", sub: "Groth16: membership in the set, and a nullifier" },
  { title: "JudgesVerifier on Monad", sub: "Checks the proof, consumes the nullifier" },
  { title: "Application", sub: "DAO vote, agent registry, faucet" },
];

/** TODO: replace with real screen-recording of /demo once an identity is registered end-to-end. */
export function Procedure() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene>
      <Label>How it works</Label>
      <Rule />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {STEPS.map((step, i) => {
          const start = i * fps * 0.9;
          const opacity = interpolate(frame, [start, start + fps * 0.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x = interpolate(frame, [start, start + fps * 0.4], [-40, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={step.title} style={{ opacity, transform: `translateX(${x}px)`, display: "flex", gap: 24 }}>
              <div style={{ fontFamily: fonts.mono, color: colors.muted, fontSize: 28, width: 60 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div style={{ fontSize: 36 }}>{step.title}</div>
                <div style={{ fontFamily: fonts.mono, fontSize: 20, color: colors.muted }}>{step.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}
