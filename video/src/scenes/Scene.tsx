import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../theme";
import { BACKGROUND, Grain } from "./stage";

/**
 * Plain full-bleed frame for the scenes that are still simple cards (Verdict, Outro). Shares the
 * lit background and grain of `Stage` so they do not look flat next to the motion scenes.
 */
export function Scene({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const tone = dark ? "ink" : "paper";
  return (
    <AbsoluteFill style={{ background: BACKGROUND[tone], color: dark ? colors.paper : colors.ink, fontFamily: fonts.serif }}>
      <AbsoluteFill style={{ padding: 96, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</AbsoluteFill>
      <Grain tone={tone} />
    </AbsoluteFill>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 22,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors.muted,
        marginBottom: 24,
      }}
    >
      {children}
    </div>
  );
}
