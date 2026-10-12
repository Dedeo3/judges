import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { CLAMP, HEADER_TEXT, RedactBar, Rise, Stage, Stamp, pop } from "./stage";

const STAMP_AT = 62;
const REDACTIONS = [
  { at: 42, width: 220 },
  { at: 45, width: 140 },
  { at: 48, width: 180 },
];

/**
 * Title — 3s. The site's own cover page (header strip, "Opinion" margin note, wordmark) as a
 * sheet dropped on a desk, then filed with a stamp. The redaction bars are the product claim
 * shown instead of said: everything except the verdict is blacked out.
 */
export function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drop = spring({ frame, fps, config: { damping: 15, stiffness: 95, mass: 0.9 } });
  const under = spring({ frame: frame + 4, fps, config: { damping: 16, stiffness: 90, mass: 1 } });
  const sinceStamp = frame - STAMP_AT;
  const shake = sinceStamp >= 0 && sinceStamp < 8 ? Math.sin(sinceStamp * 2.4) * (8 - sinceStamp) * 0.9 : 0;

  return (
    <Stage tone="desk" push={0.0007}>
      <div
        style={{
          position: "absolute",
          left: 392,
          top: 170,
          width: 1180,
          height: 780,
          background: "#D9D2C1",
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.5)",
          transform: `translateY(${interpolate(under, [0, 1], [-1100, 0])}px) rotate(${interpolate(under, [0, 1], [10, 3.4])}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 370,
          top: 150,
          width: 1180,
          height: 780,
          background: colors.paper,
          color: colors.ink,
          boxShadow: "0 40px 90px rgba(0, 0, 0, 0.55), 0 4px 10px rgba(0, 0, 0, 0.35)",
          transform: `translate(${shake}px, ${interpolate(drop, [0, 1], [-1100, 0]) + shake * 0.4}px) rotate(${interpolate(drop, [0, 1], [-11, -2.2])}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            top: 46,
            paddingBottom: 14,
            borderBottom: `1px solid ${colors.ink}`,
            fontFamily: fonts.mono,
            fontSize: 17,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {HEADER_TEXT}
        </div>

        <div
          style={{
            position: "absolute",
            left: 72,
            top: 150,
            width: 150,
            fontFamily: fonts.mono,
            opacity: interpolate(frame, [24, 34], [0, 1], CLAMP),
          }}
        >
          <div style={{ fontSize: 19 }}>Opinion</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: colors.muted, marginTop: 10 }}>
            Filed on Monad Testnet, chain 10143.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 258,
            top: 112,
            height: 270,
            display: "flex",
            overflow: "hidden",
            fontSize: 200,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {"Judges".split("").map((letter, i) => {
            const rise = pop(frame, fps, 12 + i * 2, { damping: 14, stiffness: 150, mass: 0.7 });
            return (
              <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - rise) * 260}px)` }}>
                {letter}
              </span>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: 262,
            top: 398,
            width: 560,
            height: 2,
            background: colors.ink,
            transformOrigin: "left",
            transform: `scaleX(${interpolate(frame, [28, 42], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) })})`,
          }}
        />

        <Rise at={34} style={{ position: "absolute", left: 262, top: 428, fontSize: 46 }}>
          A wallet, backed by a passkey.
        </Rise>
        <div style={{ position: "absolute", left: 262, top: 506, display: "flex", gap: 14 }}>
          {REDACTIONS.map((bar) => (
            <div key={bar.at} style={{ position: "relative", width: bar.width, height: 42 }}>
              <RedactBar at={bar.at} width={bar.width} height={42} style={{ left: 0, top: 0 }} />
            </div>
          ))}
        </div>
        <Rise at={52} style={{ position: "absolute", left: 262, top: 570, fontSize: 46 }}>
          Nothing else disclosed.
        </Rise>

        <Seal />

        <Stamp
          text="Filed"
          sub="Monad Testnet · 10143"
          color={colors.ink}
          at={STAMP_AT}
          size={58}
          rotate={8}
          style={{ right: 56, top: 150 }}
        />
      </div>
    </Stage>
  );
}

function Seal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(frame, [36, 62], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const ring = interpolate(frame, [46, 60], [0, 1], CLAMP);
  const icon = pop(frame, fps, 56);

  return (
    <svg width={200} height={200} viewBox="0 0 200 200" style={{ position: "absolute", right: 60, bottom: 48, overflow: "visible" }}>
      <defs>
        <path id="seal-ring" d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
      </defs>
      <circle
        cx={100}
        cy={100}
        r={97}
        fill="none"
        stroke={colors.ink}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
        transform="rotate(-90 100 100)"
      />
      <circle
        cx={100}
        cy={100}
        r={62}
        fill="none"
        stroke={colors.ink}
        strokeWidth={1.5}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
        transform="rotate(90 100 100)"
      />
      <g opacity={ring} transform={`rotate(${frame * 0.35} 100 100)`}>
        <text fontFamily={fonts.mono} fontSize={13} fontWeight={500} letterSpacing={2.1} fill={colors.ink}>
          <textPath href="#seal-ring">JUDGES PROTOCOL · SLIP OPINION · MONAD TESTNET · </textPath>
        </text>
      </g>
      {/* The site's own section mark, not scales or a gavel: DESIGN-FE.md §6 rules those out. */}
      <text
        x={100}
        y={126}
        textAnchor="middle"
        fontFamily={fonts.serif}
        fontSize={84}
        fontWeight={500}
        fill={colors.ink}
        transform={`translate(100 100) scale(${icon}) translate(-100 -100)`}
      >
        §
      </text>
    </svg>
  );
}
