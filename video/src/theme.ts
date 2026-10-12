import { loadFont as loadNewsreader } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";

/**
 * Same tokens as apps/web/src/app/globals.css ("court slip opinion" look from DESIGN-FE.md):
 * paper/ink, hairline rules, red accent reserved for REJECTED/errors only. Keeping the demo video
 * on the same palette and type as the live site, instead of inventing new motion-graphics styling.
 */
export const colors = {
  paper: "#F1EDE4",
  paperShade: "#E7E1D3",
  ink: "#15130F",
  muted: "#6B6558",
  rule: "#C9C2B2",
  accent: "#B3261E",
  // The site's accent is tuned for paper; on the ink scenes it needs more luminance to read.
  accentOnInk: "#E2483C",
};

const newsreader = loadNewsreader("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
const plexMono = loadPlexMono("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export const fonts = {
  serif: newsreader.fontFamily,
  mono: plexMono.fontFamily,
};
