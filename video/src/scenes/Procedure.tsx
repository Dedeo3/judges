import { CheckIcon, KeyIcon, LockKeyIcon, StampIcon } from "@phosphor-icons/react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { type Cue, captions } from "../voiceover";
import { CLAMP, Caption, HeaderStrip, RedactBar, Stage, Stamp, pop } from "./stage";

const SPACING = 1300;
const STATION_FRAMES = 90;
const OVERVIEW_AT = 362;
const VIGNETTE_X = 240;
const VIGNETTE_SCALE = 1.3;
const TRACK_Y = 350;
const EASE = { ...CLAMP, easing: Easing.inOut(Easing.cubic) };

/**
 * Narration, in frames from the start of the scene. Each line starts as the camera leaves for
 * its station (see `camX`), so the voice arrives with the picture.
 */
export const PROCEDURE_VOICE: Cue[] = [
  { id: "procedure-1", at: 5 },
  { id: "procedure-2", at: 80 },
  { id: "procedure-3", at: 186 },
  { id: "procedure-4", at: 284 },
  { id: "procedure-5", at: OVERVIEW_AT + 10 },
];
const PROCEDURE_CAPTIONS = captions(PROCEDURE_VOICE);

// Notes are the sub-lines of the landing page's §3 Procedure diagram (apps/web/src/app/page.tsx).
const STATIONS = [
  { number: "01", title: "Passkey", note: "The private key stays on the device. Biometric or PIN, checked locally.", Vignette: PasskeyVignette },
  { number: "02", title: "Proof", note: "Groth16: membership in the set, and a nullifier.", Vignette: ProofVignette },
  { number: "03", title: "Chain", note: "JudgesVerifier checks the proof and consumes the nullifier.", Vignette: ChainVignette },
  { number: "04", title: "Verdict", note: "One credential, one action per application.", Vignette: VerdictVignette },
];

/**
 * Mechanism — 15s. One wide track with four illustrated stations; the camera travels station to
 * station (3s each), then cuts to all four side by side. Replaces the row of four small icons,
 * which was the same centred composition as every other scene.
 */
export function Procedure() {
  const frame = useCurrentFrame();

  const camX = interpolate(frame, [0, 78, 102, 168, 192, 258, 282], [0, 0, 1, 1, 2, 2, 3], EASE) * SPACING;
  const zoom = interpolate(frame, [OVERVIEW_AT, OVERVIEW_AT + 12], [1, 0.9], EASE);
  const worldOpacity = interpolate(frame, [OVERVIEW_AT, OVERVIEW_AT + 10], [1, 0], CLAMP);

  const stops = STATIONS.map((_, i) => i * SPACING + VIGNETTE_X);
  const tokenX = interpolate(frame, [0, 20, 62, 98, 152, 188, 242, 278], [-560, stops[0], stops[0], stops[1], stops[1], stops[2], stops[2], stops[3]], EASE);
  const trackEnd = stops[3] + 320;

  return (
    <Stage
      push={0}
      overlay={
        <>
          <HeaderStrip tone="paper" right="§ 3 — Procedure" />
          <Caption lines={PROCEDURE_CAPTIONS} />
        </>
      }
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          opacity: worldOpacity,
          transformOrigin: "0 0",
          transform: `translate(${960 - camX * zoom}px, 540px) scale(${zoom})`,
        }}
      >
        <div style={{ position: "absolute", left: -560, top: TRACK_Y, width: trackEnd + 560, height: 1, background: colors.rule }} />
        <div style={{ position: "absolute", left: -560, top: TRACK_Y - 1, width: tokenX + 560, height: 3, background: colors.ink }} />
        {stops.map((x, i) => {
          const reached = frame >= i * STATION_FRAMES + 20 || i === 0;
          return (
            <div
              key={x}
              style={{
                position: "absolute",
                left: x - 11,
                top: TRACK_Y - 11,
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: `3px solid ${colors.ink}`,
                background: reached && tokenX >= x - 1 ? colors.ink : colors.paper,
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: tokenX - 15,
            top: TRACK_Y - 15,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: colors.ink,
            boxShadow: `0 0 0 ${8 + Math.sin(frame / 5) * 3}px rgba(21, 19, 15, 0.12)`,
          }}
        />

        {STATIONS.map((station, i) => {
          const start = i * STATION_FRAMES;
          const fadeIn = i === 0 ? 1 : interpolate(frame, [start - 14, start - 2], [0, 1], CLAMP);
          const fadeOut = i === STATIONS.length - 1 ? 1 : interpolate(frame, [start + STATION_FRAMES - 10, start + STATION_FRAMES + 8], [1, 0], CLAMP);
          return (
            <div key={station.title} style={{ position: "absolute", left: i * SPACING, top: 0, opacity: Math.min(fadeIn, fadeOut) }}>
              <div
                style={{
                  position: "absolute",
                  left: -596,
                  top: -372,
                  fontFamily: fonts.mono,
                  fontWeight: 700,
                  fontSize: 380,
                  lineHeight: 1,
                  color: colors.ink,
                  opacity: 0.055,
                }}
              >
                {station.number}
              </div>
              <div style={{ position: "absolute", left: -560, top: -200, fontFamily: fonts.mono, fontSize: 26, color: colors.muted }}>
                {station.number} / 04
              </div>
              <div style={{ position: "absolute", left: -564, top: -168, fontSize: 104, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                {station.title}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: -560,
                  top: -30,
                  width: 400,
                  fontFamily: fonts.mono,
                  fontSize: 23,
                  lineHeight: 1.5,
                  color: colors.muted,
                }}
              >
                {station.note}
              </div>
              <div style={{ position: "absolute", left: VIGNETTE_X, top: -20, transformOrigin: "0 0", transform: `scale(${VIGNETTE_SCALE})` }}>
                <station.Vignette start={start} />
              </div>
            </div>
          );
        })}
      </div>

      <Summary />
    </Stage>
  );
}

const SUMMARY_COLUMNS = [
  { x: 276, scale: 0.9 },
  { x: 738, scale: 0.7 },
  { x: 1200, scale: 0.7 },
  { x: 1640, scale: 0.66 },
];

/** The four finished vignettes side by side — the whole procedure in one frame. */
function Summary() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < OVERVIEW_AT) return null;

  const line = interpolate(frame, [OVERVIEW_AT + 6, OVERVIEW_AT + 34], [0, 1], EASE);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 705,
          width: 1620,
          height: 3,
          background: colors.ink,
          transformOrigin: "left",
          transform: `scaleX(${line})`,
        }}
      />
      {STATIONS.map((station, i) => {
        const column = SUMMARY_COLUMNS[i];
        const at = OVERVIEW_AT + 8 + i * 6;
        const enter = pop(frame, fps, at, { damping: 15, stiffness: 130, mass: 0.8 });
        return (
          <div key={station.title} style={{ opacity: interpolate(frame, [at, at + 6], [0, 1], CLAMP) }}>
            <div
              style={{
                position: "absolute",
                left: column.x,
                top: 440,
                transformOrigin: "0 0",
                transform: `translateY(${(1 - enter) * 50}px) scale(${column.scale})`,
              }}
            >
              <station.Vignette start={i * STATION_FRAMES} />
            </div>
            <div
              style={{
                position: "absolute",
                left: column.x - 12,
                top: 694,
                width: 24,
                height: 24,
                boxSizing: "border-box",
                borderRadius: "50%",
                background: colors.ink,
                border: `4px solid ${colors.paper}`,
                transform: `scale(${enter})`,
              }}
            />
            <div style={{ position: "absolute", left: column.x - 220, top: 736, width: 440, textAlign: "center" }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 22, color: colors.muted }}>{station.number}</div>
              <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.15 }}>{station.title}</div>
            </div>
          </div>
        );
      })}
    </>
  );
}

type VignetteProps = { start: number };

const PIN_AT = [14, 21, 28, 35];

/**
 * User verification shown as a PIN being entered, not a fingerprint or face: the site's design
 * brief (DESIGN-FE.md §6) keeps biometric imagery out because it suggests biometrics are collected.
 */
function PasskeyVignette({ start }: VignetteProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - start;
  const verified = t >= 46;
  const ring = interpolate(t, [46, 72], [0, 1], CLAMP);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: -130,
          top: -230,
          width: 260,
          height: 460,
          borderRadius: 40,
          border: `3px solid ${colors.ink}`,
          opacity: verified ? (1 - ring) * 0.5 : 0,
          transform: `scale(${1 + ring * 0.4})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -130,
          top: -230,
          width: 260,
          height: 460,
          boxSizing: "border-box",
          borderRadius: 40,
          border: `4px solid ${colors.ink}`,
          background: colors.paperShade,
          boxShadow: "0 26px 54px rgba(21, 19, 15, 0.2)",
          transform: `scale(${pop(frame, fps, start, { damping: 14 })})`,
        }}
      >
        <div style={{ position: "absolute", left: 91, top: 16, width: 70, height: 12, borderRadius: 6, background: colors.ink }} />

        <KeyIcon
          size={124}
          weight="duotone"
          color={colors.ink}
          style={{ position: "absolute", left: 64, top: 78, transform: `scale(${pop(frame, fps, start + 6, { damping: 13 })})` }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 218,
            textAlign: "center",
            fontFamily: fonts.mono,
            fontSize: 14,
            letterSpacing: "0.14em",
            color: colors.muted,
          }}
        >
          ENTER PIN
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 252, display: "flex", justifyContent: "center", gap: 16 }}>
          {PIN_AT.map((at) => {
            const entered = t >= at;
            return (
              <div
                key={at}
                style={{
                  width: 26,
                  height: 26,
                  boxSizing: "border-box",
                  borderRadius: "50%",
                  border: `3px solid ${colors.ink}`,
                  background: entered ? colors.ink : "transparent",
                  transform: `scale(${entered ? 0.55 + 0.45 * pop(frame, fps, start + at) : 1})`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 318,
            textAlign: "center",
            fontFamily: fonts.mono,
            fontSize: 17,
            fontWeight: verified ? 600 : 400,
            color: verified ? colors.ink : colors.muted,
          }}
        >
          {verified ? "user verified" : "verifying…"}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 388,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            fontFamily: fonts.mono,
            fontSize: 13,
            color: colors.muted,
          }}
        >
          <LockKeyIcon size={20} weight="fill" color={colors.muted} />
          key never leaves
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          top: -262,
          width: 68,
          height: 68,
          borderRadius: "50%",
          background: colors.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${pop(frame, fps, start + 46)})`,
        }}
      >
        <CheckIcon size={36} weight="bold" color={colors.paper} />
      </div>
    </>
  );
}

const LEAVES = Array.from({ length: 8 }, (_, i) => ({ x: (i - 3.5) * 70, y: 170 }));
const LEVEL_2 = Array.from({ length: 4 }, (_, i) => ({ x: (i - 1.5) * 140, y: 60 }));
const LEVEL_1 = Array.from({ length: 2 }, (_, i) => ({ x: (i - 0.5) * 280, y: -50 }));
const ROOT = { x: 0, y: -160 };
const TREE_EDGES = [
  ...LEAVES.map((leaf, i) => ({ from: leaf, to: LEVEL_2[Math.floor(i / 2)] })),
  ...LEVEL_2.map((node, i) => ({ from: node, to: LEVEL_1[Math.floor(i / 2)] })),
  ...LEVEL_1.map((node) => ({ from: node, to: ROOT })),
];
// The proven member's path to the root: leaf 5 → its parent → its grandparent → root.
const MEMBER_PATH = [LEAVES[5], LEVEL_2[2], LEVEL_1[1], ROOT];
const PATH_STEP = 10;
const PATH_START = 12;

function ProofVignette({ start }: VignetteProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - start;
  const grow = interpolate(t, [0, 10], [0, 1], CLAMP);
  const onPath = (node: { x: number; y: number }) => MEMBER_PATH.indexOf(node);

  return (
    <>
      <svg width={640} height={520} viewBox="-320 -260 640 520" style={{ position: "absolute", left: -320, top: -260, overflow: "visible" }}>
        <g opacity={grow}>
          {TREE_EDGES.map((edge, i) => (
            <line key={i} x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y} stroke={colors.rule} strokeWidth={2} />
          ))}
        </g>
        {MEMBER_PATH.slice(0, -1).map((node, i) => {
          const next = MEMBER_PATH[i + 1];
          const drawn = interpolate(t, [PATH_START + i * PATH_STEP, PATH_START + (i + 1) * PATH_STEP], [0, 1], CLAMP);
          return (
            <line
              key={i}
              x1={node.x}
              y1={node.y}
              x2={next.x}
              y2={next.y}
              stroke={colors.ink}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - drawn}
            />
          );
        })}
        <g opacity={grow}>
          {[...LEAVES, ...LEVEL_2, ...LEVEL_1, ROOT].map((node, i) => {
            const step = onPath(node);
            const lit = step >= 0 && t >= PATH_START + step * PATH_STEP;
            const size = node === ROOT ? 44 : 30;
            const scale = node === ROOT ? 1 + 0.25 * (1 - Math.min(1, Math.abs(t - (PATH_START + 3 * PATH_STEP + 4)) / 6)) : 1;
            return (
              <rect
                key={i}
                x={-size / 2}
                y={-size / 2}
                width={size}
                height={size}
                rx={6}
                fill={lit ? colors.ink : colors.paper}
                stroke={lit ? colors.ink : colors.rule}
                strokeWidth={2.5}
                transform={`translate(${node.x} ${node.y}) scale(${scale})`}
              />
            );
          })}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          left: -230,
          top: ROOT.y - 13,
          width: 190,
          textAlign: "right",
          fontFamily: fonts.mono,
          fontSize: 17,
          color: colors.muted,
          opacity: interpolate(t, [40, 48], [0, 1], CLAMP),
        }}
      >
        merkle root
      </div>
      <div
        style={{
          position: "absolute",
          left: 44,
          top: ROOT.y - 27,
          padding: "12px 22px",
          borderRadius: 30,
          background: colors.ink,
          color: colors.paper,
          fontFamily: fonts.mono,
          fontSize: 22,
          fontWeight: 600,
          whiteSpace: "nowrap",
          transformOrigin: "left center",
          transform: `scale(${pop(frame, fps, start + 54)})`,
        }}
      >
        proof + nullifier
      </div>

      <RedactBar at={start + 50} width={552} height={46} style={{ left: -276, top: LEAVES[0].y - 23 }} />
      <div
        style={{
          position: "absolute",
          left: -320,
          top: LEAVES[0].y + 38,
          width: 640,
          textAlign: "center",
          fontFamily: fonts.mono,
          fontSize: 18,
          color: colors.muted,
          opacity: interpolate(t, [58, 66], [0, 1], CLAMP),
        }}
      >
        which member? undisclosed
      </div>
    </>
  );
}

const BLOCKS = [
  { x: -205, bars: [110, 84, 124, 60] },
  { x: 0, bars: [96, 120, 70, 104] },
  { x: 205, bars: [118, 66, 100, 88] },
];
const NULLIFIER = "0x9c41d7…e2f0";
const LANDED = 40;

function ChainVignette({ start }: VignetteProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - start;
  const fall = interpolate(t, [26, LANDED], [0, 1], { ...CLAMP, easing: Easing.in(Easing.quad) });
  const flash = interpolate(t, [LANDED, LANDED + 18], [0, 1], CLAMP);
  const typed = Math.max(0, Math.min(NULLIFIER.length, Math.floor((t - 46) * 1.2)));

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: -320,
          top: -222,
          width: 640,
          textAlign: "center",
          fontFamily: fonts.mono,
          fontSize: 18,
          letterSpacing: "0.08em",
          color: colors.muted,
          opacity: interpolate(t, [2, 10], [0, 1], CLAMP),
        }}
      >
        JUDGESVERIFIER · MONAD TESTNET
      </div>

      {[-102, 103].map((x, i) => (
        <div
          key={x}
          style={{
            position: "absolute",
            left: x - 23,
            top: -72,
            width: 46,
            height: 4,
            background: colors.ink,
            transformOrigin: "left",
            transform: `scaleX(${interpolate(t, [20 + i * 6, 28 + i * 6], [0, 1], CLAMP)})`,
          }}
        />
      ))}

      {BLOCKS.map((block, i) => {
        const pending = i === 2 && t < LANDED;
        const slide = pop(frame, fps, start + 4 + i * 6, { damping: 15, stiffness: 130, mass: 0.8 });
        return (
          <div
            key={block.x}
            style={{
              position: "absolute",
              left: block.x - 80,
              top: -150,
              width: 160,
              height: 160,
              boxSizing: "border-box",
              borderRadius: 16,
              border: `3px ${pending ? "dashed" : "solid"} ${colors.ink}`,
              background: colors.paperShade,
              boxShadow: "0 16px 34px rgba(21, 19, 15, 0.14)",
              opacity: interpolate(t, [4 + i * 6, 8 + i * 6], [0, 1], CLAMP),
              transform: `translateX(${(1 - slide) * 300}px)`,
            }}
          >
            <div style={{ position: "absolute", left: 16, top: 14, fontFamily: fonts.mono, fontSize: 14, color: colors.muted }}>
              #4 820 11{5 + i}
            </div>
            {block.bars.map((width, row) => (
              <div
                key={row}
                style={{
                  position: "absolute",
                  left: 16,
                  top: 46 + row * 24,
                  width,
                  height: 9,
                  background: colors.ink,
                  opacity: pending ? 0 : i === 2 ? interpolate(t, [LANDED + row * 3, LANDED + 4 + row * 3], [0, 0.24], CLAMP) : 0.24,
                }}
              />
            ))}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: BLOCKS[2].x - 80,
          top: -150,
          width: 160,
          height: 160,
          boxSizing: "border-box",
          borderRadius: 16,
          border: `3px solid ${colors.ink}`,
          opacity: t >= LANDED ? (1 - flash) * 0.6 : 0,
          transform: `scale(${1 + flash * 0.4})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: BLOCKS[2].x - 58,
          top: interpolate(fall, [0, 1], [-330, -96]),
          padding: "10px 22px",
          borderRadius: 30,
          background: colors.ink,
          color: colors.paper,
          fontFamily: fonts.mono,
          fontSize: 22,
          fontWeight: 600,
          opacity: interpolate(t, [22, 26, LANDED - 1, LANDED + 3], [0, 1, 1, 0], CLAMP),
          transform: `scale(${interpolate(fall, [0, 1], [1, 0.7])})`,
        }}
      >
        proof
      </div>
      <div
        style={{
          position: "absolute",
          left: BLOCKS[2].x + 50,
          top: -178,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: colors.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${pop(frame, fps, start + LANDED + 2)})`,
        }}
      >
        <CheckIcon size={30} weight="bold" color={colors.paper} />
      </div>

      <div
        style={{
          position: "absolute",
          left: -290,
          top: 62,
          width: 580,
          height: 78,
          boxSizing: "border-box",
          border: `1px solid ${colors.ink}`,
          background: colors.paper,
          opacity: interpolate(t, [40, 46], [0, 1], CLAMP),
        }}
      >
        <div style={{ position: "absolute", left: 20, top: 11, fontFamily: fonts.mono, fontSize: 14, letterSpacing: "0.12em", color: colors.muted }}>
          NULLIFIER
        </div>
        <div style={{ position: "absolute", left: 20, top: 33, fontFamily: fonts.mono, fontSize: 27, fontWeight: 500 }}>
          {NULLIFIER.slice(0, typed)}
        </div>
        <div
          style={{
            position: "absolute",
            right: 16,
            top: 20,
            padding: "8px 14px",
            background: colors.ink,
            color: colors.paper,
            fontFamily: fonts.mono,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "0.12em",
            transform: `scale(${pop(frame, fps, start + 64)})`,
          }}
        >
          CONSUMED
        </div>
      </div>
    </>
  );
}

function VerdictVignette({ start }: VignetteProps) {
  const frame = useCurrentFrame();
  const t = frame - start;
  // The stamp comes down, presses, and lifts away, leaving the mark. (A stamp, not a gavel:
  // DESIGN-FE.md §6 rules out courtroom props.)
  const press = interpolate(t, [4, 15, 19, 32], [-200, 0, 0, -240], { ...CLAMP, easing: Easing.inOut(Easing.quad) });
  const tool = interpolate(t, [2, 8, 24, 32], [0, 1, 1, 0], CLAMP);

  return (
    <>
      <Stamp text="Accepted" sub="JudgesVerifier · Monad 10143" color={colors.ink} at={start + 16} size={84} rotate={-6} style={{ left: -262, top: -112 }} />
      <StampIcon
        size={190}
        weight="fill"
        color={colors.ink}
        style={{ position: "absolute", left: -95, top: -215, opacity: tool, transform: `translateY(${press}px)` }}
      />

      <div
        style={{
          position: "absolute",
          left: -290,
          top: 112,
          width: 580,
          paddingTop: 16,
          borderTop: `1px solid ${colors.ink}`,
          fontFamily: fonts.mono,
          fontSize: 15,
          letterSpacing: "0.12em",
          color: colors.muted,
          opacity: interpolate(t, [40, 48], [0, 1], CLAMP),
        }}
      >
        ATTEMPT 2, SAME CREDENTIAL
        <div style={{ marginTop: 8, fontSize: 17, letterSpacing: 0 }}>nullifier already used</div>
      </div>
      <Stamp text="Rejected" color={colors.accent} at={start + 52} size={32} rotate={-4} style={{ left: 60, top: 124 }} />
    </>
  );
}
