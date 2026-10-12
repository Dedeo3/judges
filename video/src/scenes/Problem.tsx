import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Label, Rule, Scene } from "./Scene";

const POINTS = [
  "One real person can still spin up 10,000 wallets.",
  "DAO votes, airdrops, agent registries — all sybil-able today.",
  "KYC fixes sybils but leaks identity. Judges fixes sybils and discloses nothing.",
];

/** TODO: replace with real screen-recording b-roll of a sybil attack / fake-airdrop headline if available. */
export function Problem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Scene>
      <Label>The problem</Label>
      <Rule />
      {POINTS.map((point, i) => {
        const start = i * fps * 0.8;
        const opacity = interpolate(frame, [start, start + fps * 0.5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div key={point} style={{ opacity, fontSize: 40, marginBottom: 20, maxWidth: 1300 }}>
            {point}
          </div>
        );
      })}
    </Scene>
  );
}
