import type { CSSProperties } from "react";

/**
 * An element's place in the page's load sequence, or in a diagram that draws itself. The timing
 * lives in the Motion section of globals.css; this only says "I am the nth thing".
 */
export function step(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}
