import { KeyIcon, WalletIcon } from "@phosphor-icons/react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Sfx } from "../audio/cues";
import { colors, fonts } from "../theme";
import { type Cue, captions, wordAt } from "../voiceover";
import { CLAMP, Caption, HeaderStrip, RedactBar, Rise, Stage, Stamp, pop } from "./stage";

/**
 * Holding — 7s. The claim, stated once in full after the limits: what a Judges proof does
 * establish, and the three things it leaves blacked out. Closes the argument the title sheet
 * opened, with the same redaction bars and stamp.
 */

export const HOLDING_FRAMES = 210;
const AT = 10;

export const HOLDING_VOICE: Cue[] = [{ id: "limits-2", at: AT }];
const HOLDING_CAPTIONS = captions(HOLDING_VOICE);

const PASSKEY = AT + wordAt("limits-2", "a");
const WALLET = AT + wordAt("limits-2", "stood");
const NOTHING = AT + wordAt("limits-2", "Nothing");
/** One frame early so the stamp lands on the beat (see timeline.ts). */
const STAMP_AT = AT + wordAt("limits-2", "disclosed") - 1;

const WITHHELD = [
  { label: "Who you are", width: 420 },
  { label: "The passkey's public key", width: 560 },
  { label: "What else you did with it", width: 480 },
];

export const HOLDING_SFX: Sfx[] = [
  { name: "tick", at: PASSKEY },
  { name: "tick", at: WALLET },
  ...WITHHELD.map((_, i): Sfx => ({ name: "marker", at: NOTHING + i * 6 })),
  { name: "stamp", at: STAMP_AT },
];

export function Holding() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sinceStamp = frame - STAMP_AT;
  const shake = sinceStamp >= 0 && sinceStamp < 8 ? Math.sin(sinceStamp * 2.4) * (8 - sinceStamp) * 0.9 : 0;
  const link = interpolate(frame, [WALLET, WALLET + 16], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });

  return (
    <Stage
      push={0.00018}
      overlay={
        <>
          <HeaderStrip tone="paper" right="§ 1 — Holding" />
          <Caption lines={HOLDING_CAPTIONS} />
        </>
      }
    >
      <div style={{ position: "absolute", left: 150, top: 176, transform: `translate(${shake}px, ${shake * 0.4}px)` }}>
        <Rise at={4} style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: "0.14em", textTransform: "uppercase", color: colors.muted }}>
          What it does prove
        </Rise>

        <div style={{ fontSize: 112, fontWeight: 600, lineHeight: 1.06, letterSpacing: "-0.02em", marginTop: 26 }}>
          <Rise at={PASSKEY} distance={46}>
            A user-verified passkey
          </Rise>
          <Rise at={WALLET} distance={46}>
            stood behind this wallet.
          </Rise>
        </div>

        <div style={{ marginTop: 54, display: "grid", rowGap: 22 }}>
          {WITHHELD.map((row, i) => {
            const at = NOTHING + i * 6;
            return (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 28, opacity: interpolate(frame, [at - 4, at], [0, 1], CLAMP) }}>
                <div style={{ width: 470, fontFamily: fonts.mono, fontSize: 25, letterSpacing: "0.06em", textTransform: "uppercase", color: colors.muted }}>
                  {row.label}
                </div>
                <div style={{ position: "relative", width: row.width, height: 44 }}>
                  <RedactBar at={at} width={row.width} height={44} style={{ left: 0, top: 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: "absolute", left: 1490, top: 250, width: 260, transform: `translate(${shake}px, ${shake * 0.4}px)` }}>
        <div style={{ transform: `scale(${pop(frame, fps, PASSKEY)})`, display: "flex", justifyContent: "center" }}>
          <KeyIcon size={170} weight="duotone" color={colors.ink} />
        </div>
        <div style={{ margin: "14px auto", width: 4, height: 96, background: colors.ink, transformOrigin: "top", transform: `scaleY(${link})` }} />
        <div style={{ transform: `scale(${pop(frame, fps, WALLET + 10)})`, display: "flex", justifyContent: "center" }}>
          <WalletIcon size={190} weight="duotone" color={colors.ink} />
        </div>
      </div>

      <Stamp text="Nothing else disclosed" color={colors.ink} at={STAMP_AT} size={54} rotate={-5} style={{ left: 880, top: 748 }} />
    </Stage>
  );
}
