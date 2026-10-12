import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../theme";

/**
 * Shared full-bleed paper background + base type for every scene, so individual scenes only
 * describe their own content and timing, not the page chrome.
 */
export function Scene({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: dark ? colors.ink : colors.paper,
        color: dark ? colors.paper : colors.ink,
        fontFamily: fonts.serif,
        padding: 96,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {children}
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

export function Rule() {
  return <div style={{ height: 1, background: colors.rule, margin: "32px 0" }} />;
}
