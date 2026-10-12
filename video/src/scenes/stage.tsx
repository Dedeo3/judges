import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../theme";
import type { CaptionLine } from "../voiceover";

/**
 * "Case file" building blocks shared by the motion scenes: a lit stage with film grain, the
 * site's own header strip, slam-in rubber stamps, marker redaction bars and a karaoke caption
 * line. See SCRIPT.md §2 for where this vocabulary comes from.
 */

export type Tone = "paper" | "ink" | "desk";

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const HEADER_TEXT = "Judges Protocol · Slip Opinion · Monad Testnet · Chain 10143";

export const BACKGROUND: Record<Tone, string> = {
  paper: `radial-gradient(120% 95% at 50% 45%, ${colors.paper} 50%, #DFD8C7 100%)`,
  ink: `radial-gradient(105% 85% at 50% 45%, #27231B 0%, ${colors.ink} 55%, #0A0908 100%)`,
  desk: "radial-gradient(75% 65% at 50% 40%, #40382A 0%, #1A1712 58%, #080706 100%)",
};

export function foreground(tone: Tone) {
  return tone === "paper" ? colors.ink : colors.paper;
}

export function hairline(tone: Tone) {
  return tone === "paper" ? colors.rule : "rgba(241, 237, 228, 0.22)";
}

function FilterDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="stamp-wear" x="-10%" y="-15%" width="120%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="warped" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="speck" />
          <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -8.3 6" result="mask" />
          <feComposite in="warped" in2="mask" operator="in" />
        </filter>
        <filter id="marker-edge" x="-4%" y="-30%" width="108%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.35" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

export function Grain({ tone }: { tone: Tone }) {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 3) % 9;
  const dark = tone !== "paper";
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: dark ? "screen" : "multiply", opacity: dark ? 0.07 : 0.16 }}>
      <svg width="100%" height="100%">
        <filter id="film-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#film-grain)" />
      </svg>
    </AbsoluteFill>
  );
}

/**
 * `children` sit on a slow push-in so no frame is ever static; `overlay` (header, captions) stays
 * locked to the screen.
 */
export function Stage({
  tone = "paper",
  push = 0.0004,
  overlay,
  children,
}: {
  tone?: Tone;
  push?: number;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BACKGROUND[tone], color: foreground(tone), fontFamily: fonts.serif, overflow: "hidden" }}>
      <FilterDefs />
      <AbsoluteFill style={{ transform: `scale(${1 + frame * push})` }}>{children}</AbsoluteFill>
      {overlay}
      <Grain tone={tone} />
    </AbsoluteFill>
  );
}

export function HeaderStrip({ tone, right }: { tone: Tone; right: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        right: 96,
        top: 52,
        display: "flex",
        justifyContent: "space-between",
        paddingBottom: 16,
        borderBottom: `1px solid ${hairline(tone)}`,
        fontFamily: fonts.mono,
        fontSize: 19,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: foreground(tone),
        opacity: 0.8,
      }}
    >
      <span>{HEADER_TEXT}</span>
      <span>{right}</span>
    </div>
  );
}

export type { CaptionLine };

/**
 * Subtitle line that lights up word by word. With narration the words follow the voice
 * (`line.words`, measured from the audio); without it they run at `wordsPerSecond`.
 */
export function Caption({ lines, wordsPerSecond = 4.2 }: { lines: CaptionLine[]; wordsPerSecond?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let active: CaptionLine | undefined;
  for (const line of lines) {
    if (frame >= line.from) active = line;
  }
  if (!active) return null;
  if (active.until !== undefined && frame > active.until) return null;

  const local = frame - active.from;
  const perWord = fps / wordsPerSecond;
  const words = active.text.split(" ");
  const leaving = active.until === undefined ? 1 : interpolate(frame, [active.until - 5, active.until], [1, 0], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 58,
        textAlign: "center",
        fontFamily: fonts.mono,
        fontSize: 30,
        opacity: Math.min(interpolate(local, [0, 5], [0, 1], CLAMP), leaving),
      }}
    >
      {words.map((word, i) => {
        const spoken = local >= (active.words?.[i] ?? i * perWord);
        return (
          <span key={i} style={{ opacity: spoken ? 1 : 0.34, fontWeight: spoken ? 500 : 400 }}>
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
}

/** Rubber stamp that slams in oversized and settles with a bounce, ink worn by an SVG filter. */
export function Stamp({
  text,
  sub,
  color,
  at,
  size = 92,
  rotate = -6,
  style,
}: {
  text: string;
  sub?: string;
  color: string;
  at: number;
  size?: number;
  rotate?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - at;
  if (local < 0) return null;

  const settle = spring({ frame: local, fps, config: { damping: 12, stiffness: 230, mass: 0.7 } });
  const scale = interpolate(settle, [0, 1], [2.4, 1]);
  const border = Math.max(3, Math.round(size * 0.065));

  return (
    <div
      style={{
        position: "absolute",
        ...style,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        opacity: interpolate(local, [0, 2], [0, 0.94], CLAMP),
        filter: "url(#stamp-wear)",
        border: `${border}px solid ${color}`,
        padding: Math.round(size * 0.07),
        color,
      }}
    >
      <div
        style={{
          border: `${Math.max(1, Math.round(border / 3))}px solid ${color}`,
          padding: `${Math.round(size * 0.16)}px ${Math.round(size * 0.34)}px`,
          textAlign: "center",
          fontFamily: fonts.mono,
          fontWeight: 700,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontSize: size, lineHeight: 1, letterSpacing: "0.08em", marginRight: "-0.08em" }}>{text}</div>
        {sub && (
          <div style={{ fontSize: Math.round(size * 0.2), letterSpacing: "0.16em", marginTop: Math.round(size * 0.16), fontWeight: 600 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

/** Marker redaction bar wiping in from the left. */
export function RedactBar({
  at,
  width,
  height,
  color = colors.ink,
  style,
}: {
  at: number;
  width: number;
  height: number;
  color?: string;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const grown = interpolate(frame, [at, at + 7], [0, width], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  if (frame < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        ...style,
        width: grown,
        height,
        background: color,
        filter: "url(#marker-edge)",
        transform: "rotate(-0.5deg)",
      }}
    />
  );
}

type SpringConfig = { damping?: number; stiffness?: number; mass?: number };

/** 0 → ~1 with overshoot, starting at frame `at`. Use as a scale for pop-ins. */
export function pop(frame: number, fps: number, at: number, config: SpringConfig = {}) {
  if (frame < at) return 0;
  return spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 190, mass: 0.6, ...config } });
}

/** Fade + rise entrance used for statement lines. */
export function Rise({ at, distance = 28, children, style }: { at: number; distance?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [at, at + 10], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  return <div style={{ ...style, opacity: progress, transform: `translateY(${(1 - progress) * distance}px)` }}>{children}</div>;
}
