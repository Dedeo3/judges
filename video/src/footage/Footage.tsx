import type { CSSProperties, ReactNode } from "react";
import { Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Screen recordings of the app, shown through a moving window. The recordings are 1920×1020
 * display captures: browser chrome on top, a toolbar strip on the left, the page below, and the
 * wallet's own windows over the right edge. Everything here works in the recording's pixels.
 */

export const CLIPS = {
  site: "A2-landing.mp4",
  faucet: "B-faucet-accepted-rejected.mp4",
  dao: "C-dao-accepted-rejected.mp4",
  agent: "D-agent-accepted.mp4",
} as const;
export type Clip = keyof typeof CLIPS;

export const SOURCE = { width: 1920, height: 1020 };
/** The page inside the capture: what is left of the browser chrome and the toolbar strip. */
export const PAGE = { left: 70, top: 104, paper: "#F0ECE4" };

/** A window onto the recording. Its height follows the shape of the frame it is shown in. */
export type View = { x: number; y: number; w: number };

/** Next.js's dev-mode badge sits at a fixed spot bottom-left; a paper-coloured dot covers it. */
const DEV_BADGE = { x: 116, y: 972, radius: 36 };

export function Footage({
  clip,
  seconds,
  view,
  width,
  height,
  children,
  style,
}: {
  clip: Clip;
  /** Position in the recording to show. */
  seconds: number;
  view: View;
  width: number;
  height: number;
  /** Drawn over the recording, positioned in its pixels. */
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = width / view.w;
  const shown = height / scale;
  // Never show past the edge of the capture, or above the page into the browser chrome.
  const x = Math.min(Math.max(view.x, PAGE.left), SOURCE.width - view.w);
  const y = Math.min(Math.max(view.y, PAGE.top), SOURCE.height - shown);

  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", background: PAGE.paper, ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SOURCE.width,
          height: SOURCE.height,
          transformOrigin: "0 0",
          transform: `translate(${-x * scale}px, ${-y * scale}px) scale(${scale})`,
        }}
      >
        {/* A sequence that starts on the current frame always shows the video's first frame after
            the trim, so `trimBefore` picks the exact source frame. This is Remotion's documented
            way to remap time, and it makes holds and speed changes plain arithmetic. */}
        <Sequence from={frame} layout="none">
          <OffthreadVideo
            src={staticFile(CLIPS[clip])}
            trimBefore={Math.max(0, Math.round(seconds * fps))}
            muted
            style={{ display: "block", width: SOURCE.width, height: SOURCE.height }}
          />
        </Sequence>
        <div
          style={{
            position: "absolute",
            left: DEV_BADGE.x - DEV_BADGE.radius,
            top: DEV_BADGE.y - DEV_BADGE.radius,
            width: DEV_BADGE.radius * 2,
            height: DEV_BADGE.radius * 2,
            borderRadius: "50%",
            background: PAGE.paper,
          }}
        />
        {children}
      </div>
    </div>
  );
}

/** A stretch of a recording played across a stretch of the scene. */
export type Span = {
  /** Scene frames. */
  from: number;
  to: number;
  /** Recording seconds. */
  start: number;
  end: number;
  /** When the recording is shorter than the span: play first and hold the end, or the reverse. */
  hold?: "end" | "start";
};

/**
 * Where in the recording frame `frame` is. Spans longer than their footage play at normal speed
 * and hold; shorter ones speed the footage up evenly. Outside every span the nearest edge holds.
 */
export function playhead(spans: Span[], frame: number, fps: number) {
  let active = spans[0];
  for (const span of spans) {
    if (frame >= span.from) active = span;
  }
  const local = Math.min(Math.max(frame - active.from, 0), active.to - active.from);
  const footage = active.end - active.start;
  const available = (active.to - active.from) / fps;
  if (footage >= available) return active.start + (local / (active.to - active.from)) * footage;
  if (active.hold === "start") return Math.max(active.start, active.end - (active.to - active.from - local) / fps);
  return Math.min(active.end, active.start + local / fps);
}

/** How many times faster than real time the recording runs at `frame` (1 when held or normal). */
export function speedAt(spans: Span[], frame: number, fps: number) {
  let active = spans[0];
  for (const span of spans) {
    if (frame >= span.from) active = span;
  }
  const rate = (active.end - active.start) / ((active.to - active.from) / fps);
  return rate > 1 ? rate : 1;
}

/** A camera position that is fully reached at frame `at`, after travelling for `travel` frames. */
export type Shot = { at: number; view: View; travel?: number };

const TRAVEL = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) } as const;

/** The view at `frame`: holds each shot, then eases to the next one so it arrives on time. */
export function camera(shots: Shot[], frame: number): View {
  let view = shots[0].view;
  for (let i = 1; i < shots.length; i++) {
    const shot = shots[i];
    const travel = shot.travel ?? 20;
    if (frame <= shot.at - travel) break;
    const t = interpolate(frame, [shot.at - travel, shot.at], [0, 1], TRAVEL);
    view = {
      x: view.x + (shot.view.x - view.x) * t,
      y: view.y + (shot.view.y - view.y) * t,
      w: view.w + (shot.view.w - view.w) * t,
    };
  }
  return view;
}

/** Blend of two views, for when a card changes shape. */
export function mix(a: View, b: View, t: number): View {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t };
}
