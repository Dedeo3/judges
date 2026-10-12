import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { type Clip, Footage, type View } from "../footage/Footage";
import { colors, fonts } from "../theme";
import type { CaptionLine } from "../voiceover";
import { CLAMP, Caption, HeaderStrip, Stage, pop } from "./stage";

/**
 * How a screen recording is put on screen: as a sheet on the desk from the title scene, with the
 * wallet's window as a second sheet beside it when the wallet has something to ask. Notes, marks
 * and stamps go on top. See SCRIPT.md §3 for why the recordings are framed rather than full-bleed.
 */

export const CARD = { x: 96, y: 150, height: 780, wide: 1728, narrow: 1198, wallet: 490 };

/** A wallet window is about 497×973 in the capture; this shows its lower 780 rows at full size. */
export const WALLET_HEIGHT = CARD.height;
const WALLET_ROW = "#191B2B";

export function Exhibit({
  title,
  clip,
  seconds,
  page,
  wallet,
  split = 0,
  marks,
  captions,
  stamps = [],
  children,
}: {
  /** Right-hand side of the header strip. */
  title: string;
  clip: Clip;
  seconds: number;
  page: View;
  /** The wallet window's place in the recording; shown as `split` goes to 1. */
  wallet?: View;
  split?: number;
  /** Drawn on the page, in the recording's pixels. */
  marks?: ReactNode;
  captions: CaptionLine[];
  /** Frames at which a stamp lands, to shake the sheet. */
  stamps?: number[];
  /** Notes, stamps and chips, in screen pixels. */
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drop = spring({ frame, fps, config: { damping: 17, stiffness: 120, mass: 0.8 } });
  const width = CARD.wide + (CARD.narrow - CARD.wide) * split;
  let shake = 0;
  for (const at of stamps) {
    const since = frame - at;
    if (since >= 0 && since < 9) shake += Math.sin(since * 2.3) * (9 - since) * 0.9;
  }

  return (
    <Stage
      tone="desk"
      push={0.00002}
      overlay={
        <>
          <HeaderStrip tone="desk" right={title} />
          <Caption lines={captions} />
        </>
      }
    >
      <div
        style={{
          position: "absolute",
          left: CARD.x + 26,
          top: CARD.y + 22,
          width: CARD.wide,
          height: CARD.height,
          background: "#CFC8B6",
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.5)",
          transform: `translateY(${(1 - drop) * -60}px) rotate(${1.1 + (1 - drop) * 3}deg)`,
          opacity: drop,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: CARD.x,
          top: CARD.y,
          width,
          height: CARD.height,
          boxShadow: "0 40px 90px rgba(0, 0, 0, 0.55), 0 4px 10px rgba(0, 0, 0, 0.35)",
          transform: `translate(${shake}px, ${(1 - drop) * -90 + shake * 0.4}px) rotate(${(1 - drop) * -2.5}deg)`,
          opacity: interpolate(frame, [0, 5], [0, 1], CLAMP),
        }}
      >
        <Footage clip={clip} seconds={seconds} view={page} width={width} height={CARD.height}>
          {marks}
        </Footage>
      </div>

      {wallet && split > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: CARD.x + CARD.wide - CARD.wallet,
            top: CARD.y,
            width: CARD.wallet,
            height: WALLET_HEIGHT,
            boxShadow: "0 40px 90px rgba(0, 0, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.4)",
            transform: `translateX(${(1 - split) * 640}px) rotate(${(1 - split) * 4}deg)`,
          }}
        >
          <Footage clip={clip} seconds={seconds} view={wallet} width={CARD.wallet} height={WALLET_HEIGHT} />
          {/* The wallet shows the account's nickname here ("Seed Phrase 2 #1"). It is only a
              label, but on screen it reads like a secret, so it is covered. The address stays. */}
          <div style={{ position: "absolute", left: 60, top: 634, width: 160, height: 46, background: WALLET_ROW }} />
        </div>
      )}

      {children}
    </Stage>
  );
}

/** 0 → 1 while a wallet window is on screen, with a short ease at both ends. */
export function presence(frame: number, windows: [from: number, to: number][], ramp = 10) {
  let value = 0;
  for (const [from, to] of windows) {
    const inside = interpolate(frame, [from, from + ramp, to - ramp, to], [0, 1, 1, 0], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
    value = Math.max(value, inside);
  }
  return value;
}

/** A slip of paper pinned over the exhibit: a label in the site's margin-note style, and one line. */
export function Note({
  at,
  until,
  label,
  children,
  style,
  width = 430,
  rotate = 1.4,
  accent = false,
}: {
  at: number;
  until?: number;
  label: string;
  children: ReactNode;
  style: CSSProperties;
  width?: number;
  rotate?: number;
  accent?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at || (until !== undefined && frame > until + 6)) return null;

  const enter = pop(frame, fps, at, { damping: 13, stiffness: 170, mass: 0.6 });
  const leave = until === undefined ? 1 : interpolate(frame, [until, until + 6], [1, 0], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        ...style,
        width,
        padding: "20px 24px 22px",
        background: colors.paper,
        color: colors.ink,
        borderTop: `6px solid ${accent ? colors.accent : colors.ink}`,
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)",
        transform: `rotate(${rotate}deg) scale(${0.7 + enter * 0.3}) translateY(${(1 - enter) * 26}px)`,
        transformOrigin: "50% 0",
        opacity: Math.min(interpolate(frame, [at, at + 3], [0, 1], CLAMP), leave),
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: accent ? colors.accent : colors.muted,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 1.22, marginTop: 8 }}>{children}</div>
    </div>
  );
}

/** Says, on screen, that a wait was shortened and how long it really took. */
export function Speed({ rate, style }: { rate: number; style: CSSProperties }) {
  const frame = useCurrentFrame();
  if (rate < 1.15) return null;
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: colors.ink,
        color: colors.paper,
        fontFamily: fonts.mono,
        fontSize: 20,
        fontWeight: 500,
        letterSpacing: "0.08em",
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
      }}
    >
      <span style={{ opacity: blink ? 1 : 0.45, letterSpacing: "-0.12em" }}>▶▶</span>
      <span>{rate.toFixed(1)}× SPEED</span>
    </div>
  );
}

/** Outline drawn around something on the page, in the recording's pixels. */
export function Mark({
  at,
  until,
  x,
  y,
  w,
  h,
  color = colors.ink,
}: {
  at: number;
  until?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}) {
  const frame = useCurrentFrame();
  if (frame < at || (until !== undefined && frame > until + 5)) return null;
  const draw = interpolate(frame, [at, at + 9], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const leave = until === undefined ? 1 : interpolate(frame, [until, until + 5], [1, 0], CLAMP);
  return (
    <svg width={w + 12} height={h + 12} style={{ position: "absolute", left: x - 6, top: y - 6, overflow: "visible", opacity: leave }}>
      <rect x={6} y={6} width={w} height={h} fill={color} opacity={0.07 * draw} />
      <rect
        x={6}
        y={6}
        width={w}
        height={h}
        fill="none"
        stroke={color}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
        filter="url(#marker-edge)"
      />
    </svg>
  );
}

/** A click, shown as a ring leaving the pointer. In the recording's pixels. */
export function Click({ at, x, y }: { at: number; x: number; y: number }) {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0 || local > 16) return null;
  const grow = interpolate(local, [0, 16], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const size = 20 + grow * 90;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${4 - grow * 2}px solid ${colors.ink}`,
        opacity: 0.75 * (1 - grow),
      }}
    />
  );
}
