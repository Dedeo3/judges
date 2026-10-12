import { DatabaseIcon, UserIcon, WalletIcon } from "@phosphor-icons/react";
import { Easing, Sequence, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import { type Cue, captions } from "../voiceover";
import { CLAMP, Caption, HeaderStrip, RedactBar, Rise, Stage, Stamp, pop } from "./stage";

const BEAT_FRAMES = 150;

/** Narration, in frames from the start of the scene. The two beats are 5s each. */
export const PROBLEM_VOICE: Cue[] = [
  { id: "problem-1", at: 5 },
  { id: "problem-2", at: 70 },
  { id: "problem-3", at: BEAT_FRAMES + 5 },
  { id: "problem-4", at: BEAT_FRAMES + 88 },
];
const SYBIL_CAPTIONS = captions(PROBLEM_VOICE.slice(0, 2));
const PRIVACY_CAPTIONS = captions(PROBLEM_VOICE.slice(2).map((cue) => ({ ...cue, at: cue.at - BEAT_FRAMES })));

/**
 * Problem — 10s, two beats that look nothing alike so the eye resets between them.
 * A (ink): one person fans out into five wallets, then the frame floods with thousands.
 * B (paper): a KYC form leaks its fields to a verifier, then gets redacted and stamped.
 */
export function Problem() {
  return (
    <>
      <Sequence durationInFrames={BEAT_FRAMES}>
        <SybilBeat />
      </Sequence>
      <Sequence from={BEAT_FRAMES}>
        <PrivacyBeat />
      </Sequence>
    </>
  );
}

const PERSON = { x: 600, y: 500 };
const ARC_RADIUS = 400;
const WALLETS = [
  { angle: 0, at: 12, sybil: false, address: "0x7a3f…" },
  { angle: -26, at: 30, sybil: true, address: "0xb91c…" },
  { angle: 26, at: 40, sybil: true, address: "0x04de…" },
  { angle: -52, at: 50, sybil: true, address: "0xe6a0…" },
  { angle: 52, at: 60, sybil: true, address: "0x51c8…" },
].map((wallet) => {
  const radians = (wallet.angle * Math.PI) / 180;
  return { ...wallet, x: PERSON.x + ARC_RADIUS * Math.cos(radians), y: PERSON.y + ARC_RADIUS * Math.sin(radians) };
});

const SWARM_AT = 78;
const SWARM_CENTER = { x: 975, y: 480 };
const DOT_GAP = 46;

// Grid of wallet-shaped dots that floods the frame, leaving the cluster, counter, statement,
// header and caption areas clear.
const SWARM = (() => {
  const dots: { x: number; y: number; at: number }[] = [];
  for (let y = 150; y < 950; y += DOT_GAP) {
    for (let x = 40; x < 1900; x += DOT_GAP) {
      const distance = Math.hypot(x - SWARM_CENTER.x, y - SWARM_CENTER.y);
      const inCluster = distance < 250;
      const inStatement = x < 730 && y > 690;
      const inCounter = x > 1230 && y > 300 && y < 650;
      if (inCluster || inStatement || inCounter) continue;
      dots.push({ x, y, at: SWARM_AT + 4 + (distance / 1100) * 46 + random(`dot-${x}-${y}`) * 7 });
    }
  }
  return dots;
})();

function SybilBeat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const red = colors.accentOnInk;

  const pull = interpolate(frame, [SWARM_AT, SWARM_AT + 30], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const clusterScale = interpolate(pull, [0, 1], [1, 0.48]);

  const ticks = WALLETS.map((wallet) => wallet.at + 3).filter((tick) => frame >= tick);
  const lastTick = ticks.length ? Math.max(...ticks) : 0;
  const flood = interpolate(frame, [SWARM_AT + 6, 140], [0, 1], { ...CLAMP, easing: Easing.in(Easing.quad) });
  const votes = frame < SWARM_AT + 6 ? ticks.length : Math.round(5 + flood * 4995);
  const bump = frame < SWARM_AT + 6 ? interpolate(frame - lastTick, [0, 3, 9], [1.22, 1.1, 1], CLAMP) : 1;

  return (
    <Stage
      tone="ink"
      overlay={
        <>
          <HeaderStrip tone="ink" right="Exhibit A — The problem" />
          <Caption lines={SYBIL_CAPTIONS} />
        </>
      }
    >
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {SWARM.map((dot) => {
          if (frame < dot.at) return null;
          const scale = interpolate(frame - dot.at, [0, 3, 7], [0, 1.3, 1], CLAMP);
          return (
            <rect
              key={`${dot.x}-${dot.y}`}
              x={-10}
              y={-7}
              width={20}
              height={14}
              rx={3}
              fill={red}
              opacity={0.88}
              transform={`translate(${dot.x} ${dot.y}) scale(${scale})`}
            />
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${PERSON.x}px ${PERSON.y}px`,
          transform: `translate(${pull * 270}px, ${pull * -20}px) scale(${clusterScale})`,
        }}
      >
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
          {WALLETS.map((wallet) => {
            const drawn = interpolate(frame, [wallet.at - 8, wallet.at], [0, 1], CLAMP);
            const length = Math.hypot(wallet.x - PERSON.x, wallet.y - PERSON.y);
            const ux = (wallet.x - PERSON.x) / length;
            const uy = (wallet.y - PERSON.y) / length;
            return (
              <line
                key={wallet.address}
                x1={PERSON.x + ux * 88}
                y1={PERSON.y + uy * 88}
                x2={wallet.x - ux * 78}
                y2={wallet.y - uy * 78}
                stroke={wallet.sybil ? red : colors.paper}
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - drawn}
              />
            );
          })}
        </svg>

        <div
          style={{
            position: "absolute",
            left: PERSON.x - 76,
            top: PERSON.y - 76,
            width: 152,
            height: 152,
            borderRadius: "50%",
            background: colors.paper,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 14px rgba(241, 237, 228, 0.08)",
            transform: `scale(${pop(frame, fps, 0)})`,
          }}
        >
          <UserIcon size={92} weight="fill" color={colors.ink} />
        </div>
        <div
          style={{
            position: "absolute",
            left: PERSON.x - 150,
            top: PERSON.y + 104,
            width: 300,
            textAlign: "center",
            fontFamily: fonts.mono,
            fontSize: 20,
            letterSpacing: "0.14em",
            opacity: interpolate(frame, [6, 14], [0, 0.75], CLAMP),
          }}
        >
          1 PERSON
        </div>

        {WALLETS.map((wallet) => {
          const tint = wallet.sybil ? red : colors.paper;
          return (
            <div
              key={wallet.address}
              style={{
                position: "absolute",
                left: wallet.x - 62,
                top: wallet.y - 46,
                width: 124,
                transform: `scale(${pop(frame, fps, wallet.at)})`,
              }}
            >
              <div
                style={{
                  height: 92,
                  borderRadius: 14,
                  border: `3px solid ${tint}`,
                  background: wallet.sybil ? "rgba(226, 72, 60, 0.16)" : "rgba(241, 237, 228, 0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WalletIcon size={56} weight="duotone" color={tint} />
              </div>
              <div style={{ marginTop: 8, textAlign: "center", fontFamily: fonts.mono, fontSize: 16, color: tint, opacity: 0.85 }}>
                {wallet.address}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 1290, top: 330, fontFamily: fonts.mono }}>
        <div style={{ fontSize: 22, letterSpacing: "0.14em", opacity: interpolate(frame, [10, 18], [0, 0.75], CLAMP) }}>VOTES CAST</div>
        <div
          style={{
            fontSize: 176,
            fontWeight: 600,
            lineHeight: 1.1,
            color: votes > 1 ? red : colors.paper,
            transformOrigin: "left center",
            transform: `scale(${bump})`,
            opacity: interpolate(frame, [10, 14], [0, 1], CLAMP),
          }}
        >
          {votes.toLocaleString("en-US")}
        </div>
        <div style={{ fontSize: 22, letterSpacing: "0.14em", opacity: interpolate(frame, [30, 38], [0, 0.75], CLAMP) }}>BY ONE PERSON</div>
      </div>

      <div style={{ position: "absolute", left: 96, top: 716, fontSize: 104, fontWeight: 600, lineHeight: 1.06 }}>
        <Rise at={34}>One person,</Rise>
        <Rise at={42}>
          <span style={{ color: red }}>five</span> votes?
        </Rise>
      </div>
    </Stage>
  );
}

const FIELDS = [
  { label: "Name", value: "JANE Q. PUBLIC" },
  { label: "Date of birth", value: "12 APR 1997" },
  { label: "Address", value: "17 MERDEKA ST, JAKARTA" },
  { label: "ID number", value: "ID 4471 0092 1806" },
];
const CARD = { left: 130, top: 220 };
const FIELD_LEFT = 262;
const FIELD_TOP = 92;
const FIELD_GAP = 98;
const VALUE_SIZE = 31;
const CHAR_WIDTH = VALUE_SIZE * 0.6;
const REDACT_AT = 80;
const STATEMENT_AT = 104;

function PrivacyBeat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = pop(frame, fps, 0, { damping: 16, stiffness: 120, mass: 0.8 });
  const scanTop = interpolate(frame, [16, 52], [70, 500], CLAMP);
  const scanOpacity = interpolate(frame, [14, 17, 51, 55], [0, 1, 1, 0], CLAMP);
  const verifier = interpolate(frame, [16, 24, 86, 98], [0, 1, 1, 0], CLAMP);
  const underline = interpolate(frame, [STATEMENT_AT + 14, STATEMENT_AT + 24], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });

  return (
    <Stage
      overlay={
        <>
          <HeaderStrip tone="paper" right="Exhibit B — The usual fix" />
          <Caption lines={PRIVACY_CAPTIONS} />
        </>
      }
    >
      <div
        style={{
          position: "absolute",
          left: 1070,
          top: 232,
          width: 720,
          height: 480,
          border: `2px dashed ${colors.accent}`,
          background: "rgba(179, 38, 30, 0.05)",
          opacity: verifier,
          transform: `translateX(${interpolate(frame, [86, 98], [0, 40], CLAMP)}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "22px 28px",
            color: colors.accent,
            fontFamily: fonts.mono,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "0.12em",
          }}
        >
          <DatabaseIcon size={40} weight="duotone" color={colors.accent} />
          WHAT THE VERIFIER KEEPS
        </div>
      </div>

      {FIELDS.map((field, i) => {
        const start = 22 + i * 8;
        if (frame < start) return null;
        const travel = interpolate(frame, [start, start + 14], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
        return (
          <div
            key={field.label}
            style={{
              position: "absolute",
              left: interpolate(travel, [0, 1], [CARD.left + FIELD_LEFT, 1100]),
              top: interpolate(travel, [0, 1], [CARD.top + FIELD_TOP + i * FIELD_GAP + 24, 330 + i * 86]),
              fontFamily: fonts.mono,
              fontSize: VALUE_SIZE,
              fontWeight: 500,
              color: colors.accent,
              whiteSpace: "nowrap",
              opacity: interpolate(frame, [start, start + 3, 86, 98], [0, 1, 1, 0], CLAMP),
              transform: `translateX(${interpolate(frame, [86, 98], [0, 40], CLAMP)}px)`,
            }}
          >
            {field.value}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: CARD.left,
          top: CARD.top,
          width: 800,
          height: 520,
          background: colors.paperShade,
          border: `2px solid ${colors.ink}`,
          boxShadow: "0 26px 54px rgba(21, 19, 15, 0.2)",
          opacity: interpolate(frame, [0, 6], [0, 1], CLAMP),
          transform: `translateY(${(1 - enter) * 60}px) rotate(-2deg)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "22px 32px",
            borderBottom: `1px solid ${colors.ink}`,
            fontFamily: fonts.mono,
            fontSize: 17,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span>Form KYC-27 · Identity verification</span>
          <span>1 / 1</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 32,
            top: 96,
            width: 200,
            height: 250,
            border: `2px solid ${colors.ink}`,
            background: colors.paper,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <UserIcon size={190} weight="fill" color={colors.muted} style={{ marginBottom: -22 }} />
        </div>
        <div style={{ position: "absolute", left: 32, top: 358, fontFamily: fonts.mono, fontSize: 13, letterSpacing: "0.12em", color: colors.muted }}>
          PHOTOGRAPH
        </div>
        <RedactBar at={REDACT_AT + 20} width={164} height={36} style={{ left: 50, top: 172 }} />

        {FIELDS.map((field, i) => (
          <div key={field.label} style={{ position: "absolute", left: FIELD_LEFT, top: FIELD_TOP + i * FIELD_GAP, fontFamily: fonts.mono }}>
            <div style={{ fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.muted }}>{field.label}</div>
            <div style={{ fontSize: VALUE_SIZE, fontWeight: 500, marginTop: 4, whiteSpace: "nowrap" }}>{field.value}</div>
            <RedactBar at={REDACT_AT + i * 5} width={field.value.length * CHAR_WIDTH + 16} height={42} style={{ left: -8, top: 22 }} />
          </div>
        ))}

        <div style={{ position: "absolute", left: 0, right: 0, top: scanTop - 70, height: 70, opacity: scanOpacity, background: "linear-gradient(to top, rgba(179, 38, 30, 0.24), rgba(179, 38, 30, 0))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: scanTop, height: 3, opacity: scanOpacity, background: colors.accent }} />
      </div>

      <Stamp text="Nothing else disclosed" color={colors.ink} at={STATEMENT_AT + 4} size={40} rotate={-7} style={{ left: 290, top: 694 }} />

      <div style={{ position: "absolute", left: 1060, top: 350, fontSize: 88, fontWeight: 600, lineHeight: 1.1 }}>
        <Rise at={STATEMENT_AT}>
          Prove you&rsquo;re{" "}
          <span style={{ position: "relative" }}>
            real.
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 2,
                height: 9,
                background: colors.ink,
                transformOrigin: "left",
                transform: `scaleX(${underline})`,
              }}
            />
          </span>
        </Rise>
        <Rise at={STATEMENT_AT + 10}>Not who you are.</Rise>
      </div>
    </Stage>
  );
}
