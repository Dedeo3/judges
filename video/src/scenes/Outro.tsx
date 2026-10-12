import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Sfx } from "../audio/cues";
import { colors, fonts } from "../theme";
import { type Cue, captions } from "../voiceover";
import { Seal } from "./Intro";
import { CLAMP, Caption, HEADER_TEXT, Rise, Stage, Stamp, pop } from "./stage";

/**
 * Outro — 6.5s. The title sheet again, now carrying where to find the thing: the live site and
 * the repository are typed onto it, then it is filed. Ends on a short fade.
 */

export const OUTRO_FRAMES = 195;
/** Scene frame the closing stamp lands on; timeline.ts puts it on a downbeat. */
export const OUTRO_STAMP = 120;

export const OUTRO_VOICE: Cue[] = [{ id: "outro-1", at: 10 }];
const OUTRO_CAPTIONS = captions(OUTRO_VOICE);

const LINKS = [
  { at: 44, text: "judges-two.vercel.app" },
  { at: 70, text: "github.com/Dedeo3/judges" },
];

export const OUTRO_SFX: Sfx[] = [
  { name: "paper", at: 0, gain: 0.6 },
  ...LINKS.map((link): Sfx => ({ name: "tick", at: link.at })),
  { name: "stamp", at: OUTRO_STAMP },
];

export function Outro() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const drop = spring({ frame, fps, config: { damping: 15, stiffness: 95, mass: 0.9 } });
  const sinceStamp = frame - OUTRO_STAMP;
  const shake = sinceStamp >= 0 && sinceStamp < 8 ? Math.sin(sinceStamp * 2.4) * (8 - sinceStamp) * 0.9 : 0;

  return (
    <Stage tone="desk" push={0.0005} overlay={<Caption lines={OUTRO_CAPTIONS} />}>
      <div
        style={{
          position: "absolute",
          left: 392,
          top: 150,
          width: 1180,
          height: 760,
          background: "#D9D2C1",
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.5)",
          transform: `translateY(${interpolate(drop, [0, 1], [-1100, 0])}px) rotate(${interpolate(drop, [0, 1], [9, 3])}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 370,
          top: 130,
          width: 1180,
          height: 760,
          background: colors.paper,
          color: colors.ink,
          boxShadow: "0 40px 90px rgba(0, 0, 0, 0.55), 0 4px 10px rgba(0, 0, 0, 0.35)",
          transform: `translate(${shake}px, ${interpolate(drop, [0, 1], [-1100, 0]) + shake * 0.4}px) rotate(${interpolate(drop, [0, 1], [-10, -1.8])}deg)`,
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
            top: 96,
            height: 230,
            display: "flex",
            overflow: "hidden",
            fontSize: 170,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {"Judges".split("").map((letter, i) => {
            const rise = pop(frame, fps, 12 + i * 2, { damping: 14, stiffness: 150, mass: 0.7 });
            return (
              <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - rise) * 230}px)` }}>
                {letter}
              </span>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: 76,
            top: 338,
            width: 620,
            height: 2,
            background: colors.ink,
            transformOrigin: "left",
            transform: `scaleX(${interpolate(frame, [28, 42], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) })})`,
          }}
        />

        <div style={{ position: "absolute", left: 76, top: 372, fontFamily: fonts.mono, fontSize: 40, fontWeight: 500, lineHeight: 1.7 }}>
          {LINKS.map((link) => {
            const typed = Math.max(0, Math.min(link.text.length, frame - link.at));
            if (frame < link.at) return <div key={link.text}>&nbsp;</div>;
            return (
              <div key={link.text}>
                {link.text.slice(0, typed)}
                {typed < link.text.length && <span style={{ opacity: 0.5 }}>▍</span>}
              </div>
            );
          })}
        </div>

        <Rise at={96} style={{ position: "absolute", left: 76, top: 540, fontSize: 34 }}>
          Open source. Live on Monad Testnet, chain 10143.
        </Rise>

        <Rise
          at={104}
          distance={12}
          style={{ position: "absolute", left: 76, bottom: 44, width: 760, fontFamily: fonts.mono, fontSize: 15, lineHeight: 1.6, color: colors.muted }}
        >
          Narration: ElevenLabs. Music: “Your Breath”, Eugenio Mininni, via Mixkit.
          <br />
          Recorded on localhost against the Monad Testnet contracts.
        </Rise>

        <Seal />

        <Stamp text="Filed" sub="Monad Testnet · 10143" color={colors.ink} at={OUTRO_STAMP} size={58} rotate={8} style={{ right: 56, top: 130 }} />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: interpolate(frame, [durationInFrames - 14, durationInFrames - 1], [0, 1], CLAMP),
        }}
      />
    </Stage>
  );
}
